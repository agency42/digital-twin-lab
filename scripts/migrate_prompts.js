/**
 * migrate_prompts.js
 * 
 * This script migrates existing user data to align with the new prompt system.
 * It ensures that users with existing character cards have default entries
 * created in the `system_prompts` and `instruction_templates` tables.
 * 
 * Run with: node scripts/migrate_prompts.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// --- Configuration ---
const dbPath = path.join(__dirname, '../database/digital_twin_lab.db');
const DEFAULT_CHAT_INSTRUCTION = "Engage in a helpful and informative conversation.";
const DEFAULT_POST_INSTRUCTION = "Generate content based on the main goal provided.";

// --- Database Connection ---
console.log(`Connecting to database at: ${dbPath}`);
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to the SQLite database.');
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON;', (fkErr) => {
        if (fkErr) {
            console.error('Error enabling foreign keys:', fkErr.message);
        } else {
            console.log('Foreign key support enabled.');
        }
        // Start migration process
        startMigration();
    });
});

// --- Helper Functions ---

// Promisified db.all
const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('DB Error (all): ', err.message);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Promisified db.get
const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                console.error('DB Error (get):', err.message);
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};

// Promisified db.run
const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) { // Use function() to access this.lastID, this.changes
            if (err) {
                console.error('DB Error (run):', err.message);
                reject(err);
            } else {
                // Resolve with info about the execution
                resolve({ lastID: this.lastID, changes: this.changes });
            }
        });
    });
};

// --- Migration Logic ---

async function startMigration() {
    console.log('\nStarting prompt data migration...');
    let migratedUsers = 0;
    let usersWithNoCard = 0;
    let errors = 0;

    try {
        // 1. Get all user IDs
        const users = await dbAll('SELECT user_id FROM users WHERE user_id != \'system\'');
        if (!users || users.length === 0) {
            console.log('No users found to migrate.');
            return;
        }
        console.log(`Found ${users.length} users to process.`);

        // 2. Process each user
        for (const user of users) {
            const userId = user.user_id;
            console.log(`\nProcessing user: ${userId}...`);

            try {
                // 3. Get current character card
                const currentCard = await dbGet(
                    'SELECT id, card_data FROM character_cards WHERE user_id = ? AND is_current = 1',
                    [userId]
                );

                if (!currentCard || !currentCard.card_data) {
                    console.log(`  - User ${userId} has no current character card. Skipping default prompt creation.`);
                    usersWithNoCard++;
                    continue;
                }

                console.log(`  - Found current character card: ${currentCard.id}`);
                const cardData = currentCard.card_data;

                // Use transaction for each user's updates
                await dbRun('BEGIN TRANSACTION;');
                let userChangesMade = false;

                try {
                    // 4. Ensure default system prompts
                    const sysPromptChatExists = await dbGet('SELECT id FROM system_prompts WHERE user_id = ? AND type = ?', [userId, 'chat']);
                    if (!sysPromptChatExists) {
                        console.log(`  - Creating default 'chat' system prompt...`);
                        const sysChatId = uuidv4();
                        await dbRun(
                            'INSERT INTO system_prompts (id, user_id, type, prompt_text, is_custom, created_at, updated_at) VALUES (?, ?, ?, ?, 0, datetime("now"), datetime("now"))',
                            [sysChatId, userId, 'chat', cardData]
                        );
                        userChangesMade = true;
                    } else {
                        console.log(`  - Default 'chat' system prompt already exists.`);
                    }

                    const sysPromptPostExists = await dbGet('SELECT id FROM system_prompts WHERE user_id = ? AND type = ?', [userId, 'post']);
                    if (!sysPromptPostExists) {
                        console.log(`  - Creating default 'post' system prompt...`);
                        const sysPostId = uuidv4();
                        await dbRun(
                            'INSERT INTO system_prompts (id, user_id, type, prompt_text, is_custom, created_at, updated_at) VALUES (?, ?, ?, ?, 0, datetime("now"), datetime("now"))',
                            [sysPostId, userId, 'post', cardData]
                        );
                        userChangesMade = true;
                    } else {
                        console.log(`  - Default 'post' system prompt already exists.`);
                    }

                    // 5. Ensure default instruction templates
                    const instrTmplChatExists = await dbGet('SELECT id FROM instruction_templates WHERE user_id = ? AND type = ?', [userId, 'chat']);
                    if (!instrTmplChatExists) {
                        console.log(`  - Creating default 'chat' instruction template...`);
                        const instrChatId = uuidv4();
                        await dbRun(
                            'INSERT INTO instruction_templates (id, user_id, type, instruction_text, created_at, updated_at) VALUES (?, ?, ?, ?, datetime("now"), datetime("now"))',
                            [instrChatId, userId, 'chat', DEFAULT_CHAT_INSTRUCTION]
                        );
                        userChangesMade = true;
                    } else {
                        console.log(`  - Default 'chat' instruction template already exists.`);
                    }

                    const instrTmplPostExists = await dbGet('SELECT id FROM instruction_templates WHERE user_id = ? AND type = ?', [userId, 'post']);
                    if (!instrTmplPostExists) {
                        console.log(`  - Creating default 'post' instruction template...`);
                        const instrPostId = uuidv4();
                        await dbRun(
                            'INSERT INTO instruction_templates (id, user_id, type, instruction_text, created_at, updated_at) VALUES (?, ?, ?, ?, datetime("now"), datetime("now"))',
                            [instrPostId, userId, 'post', DEFAULT_POST_INSTRUCTION]
                        );
                        userChangesMade = true;
                    } else {
                        console.log(`  - Default 'post' instruction template already exists.`);
                    }

                    await dbRun('COMMIT;');
                    if (userChangesMade) {
                        migratedUsers++;
                        console.log(`  - Successfully processed defaults for user ${userId}.`);
                    } else {
                        console.log(`  - No changes needed for user ${userId}.`);
                    }

                } catch (userError) {
                    console.error(`  - Error processing user ${userId}:`, userError.message);
                    await dbRun('ROLLBACK;');
                    errors++;
                }

            } catch (outerUserError) {
                 console.error(`  - Outer error processing user ${userId}:`, outerUserError.message);
                 errors++;
            }
        }

        console.log('\n--- Migration Summary ---');
        console.log(`Total users processed: ${users.length}`);
        console.log(`Users successfully updated/verified: ${migratedUsers}`);
        console.log(`Users skipped (no current card): ${usersWithNoCard}`);
        console.log(`Errors encountered: ${errors}`);
        console.log('-------------------------');

    } catch (err) {
        console.error('\nMigration failed with error:', err.message);
        errors++;
    } finally {
        db.close((closeErr) => {
            if (closeErr) {
                console.error('Error closing database:', closeErr.message);
            }
            console.log('Database connection closed.');
            if (errors > 0) {
                console.error('\nMigration completed with errors.');
                process.exit(1);
            } else {
                console.log('\nMigration completed successfully.');
                process.exit(0);
            }
        });
    }
} 