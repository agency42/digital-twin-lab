/**
 * Migration script to update database schema from personas to base_prompts
 * Run with: node database/migrate.js
 */

// Import SQLite3 module
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Connect to the database
const dbPath = path.join(__dirname, 'digital_twin_lab.db');
console.log('Opening database at:', dbPath);
const db = new sqlite3.Database(dbPath);

// Enable foreign keys
db.run('PRAGMA foreign_keys = OFF;', [], function(err) {
    if (err) {
        console.error('Error disabling foreign keys:', err.message);
        db.close();
        process.exit(1);
    }
    console.log('Foreign keys temporarily disabled for migration');
    performMigration();
});

function performMigration() {
    // Begin transaction for atomic migration
    db.serialize(() => {
        db.run('BEGIN TRANSACTION;');
        
        console.log('Starting migration from personas to base_prompts...');
        
        // Step 1: Check if old tables exist
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='personas';", [], function(err, row) {
            if (err) {
                rollbackAndExit(err);
                return;
            }
            
            if (row) {
                console.log('Found personas table - proceeding with migration');
                migratePersonasToBasePrompts();
            } else {
                console.log('No personas table found - creating new tables from schema');
                createTablesFromSchema();
            }
        });
    });
}

function migratePersonasToBasePrompts() {
    // Step 2: Create new tables if they don't exist
    db.run(`
        CREATE TABLE IF NOT EXISTS base_prompts (
            base_prompt_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL UNIQUE,
            prompt_name TEXT,
            prompt_text TEXT NOT NULL,
            based_on_assets TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        );
    `, function(err) {
        if (err) {
            rollbackAndExit(err);
            return;
        }
        
        // Step 3: Create prompt_variations table if it doesn't exist
        db.run(`
            CREATE TABLE IF NOT EXISTS prompt_variations (
                variation_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                base_prompt_id TEXT NOT NULL,
                module_context TEXT NOT NULL,
                system_prompt_override TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (base_prompt_id) REFERENCES base_prompts(base_prompt_id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                UNIQUE (user_id, module_context)
            );
        `, function(err) {
            if (err) {
                rollbackAndExit(err);
                return;
            }
            
            // Step 4: Migrate data from personas to base_prompts
            db.run(`
                INSERT OR REPLACE INTO base_prompts (base_prompt_id, user_id, prompt_name, prompt_text, based_on_assets, created_at, updated_at)
                SELECT persona_id, user_id, NULL as prompt_name, persona_json as prompt_text, NULL as based_on_assets, created_at, updated_at
                FROM personas;
            `, function(err) {
                if (err) {
                    console.log('Error migrating personas data:', err.message);
                    console.log('Continuing with migration...');
                } else {
                    console.log('Migrated data from personas to base_prompts');
                }
                
                // Step 5: Migrate data from persona_variations to prompt_variations
                db.run(`
                    INSERT OR REPLACE INTO prompt_variations (variation_id, user_id, base_prompt_id, module_context, system_prompt_override, created_at, updated_at)
                    SELECT variation_id, user_id, persona_id as base_prompt_id, module_context, system_prompt as system_prompt_override, created_at, updated_at
                    FROM persona_variations;
                `, function(err) {
                    if (err) {
                        console.log('Error migrating persona_variations data:', err.message);
                        console.log('Continuing with migration...');
                    } else {
                        console.log('Migrated data from persona_variations to prompt_variations');
                    }
                    
                    // Step 6: Update users table to refer to base_prompt_id
                    db.run(`
                        UPDATE users SET base_prompt_id = primary_persona_id WHERE primary_persona_id IS NOT NULL;
                    `, function(err) {
                        if (err) {
                            console.log('Error updating users table:', err.message);
                            console.log('Continuing with migration...');
                        } else {
                            console.log('Updated users table to reference base_prompt_id');
                        }
                        
                        // Step 7: Update assessment_results to use new field names
                        db.run(`
                            UPDATE assessment_results SET base_prompt_id = persona_id WHERE persona_id IS NOT NULL;
                        `, function(err) {
                            if (err) {
                                console.log('Error updating assessment_results:', err.message);
                                console.log('Continuing with migration...');
                            } else {
                                console.log('Updated assessment_results to reference base_prompt_id');
                            }
                            
                            finalizeMigration();
                        });
                    });
                });
            });
        });
    });
}

function createTablesFromSchema() {
    // Read schema.sql file and execute it
    const schemaSQL = readSchema();
    
    db.exec(schemaSQL, function(err) {
        if (err) {
            rollbackAndExit(new Error(`Failed to execute schema.sql: ${err.message}`));
            return;
        }
        
        console.log('Created new tables from schema.sql');
        finalizeMigration();
    });
}

// Function to read the schema file
function readSchema() {
    try {
        return fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8');
    } catch (err) {
        throw new Error(`Failed to read schema.sql: ${err.message}`);
    }
}

function finalizeMigration() {
    // Attempt to drop old indexes, ignore errors if they don't exist
    db.run('DROP INDEX IF EXISTS idx_personas_user_id;', [], function(err) {
        if (err) console.log('Ignoring error dropping old index idx_personas_user_id:', err.message);
    });
    db.run('DROP INDEX IF EXISTS idx_persona_variations_user_module;', [], function(err) {
        if (err) console.log('Ignoring error dropping old index idx_persona_variations_user_module:', err.message);
    });
    db.run('DROP INDEX IF EXISTS idx_base_prompts_user_id;', [], function(err) { // Also try dropping this index if it exists from previous runs
        if (err) console.log('Ignoring error dropping old index idx_base_prompts_user_id:', err.message);
    });
    db.run('DROP INDEX IF EXISTS idx_prompt_variations_user_module;', [], function(err) { // Also try dropping this index if it exists from previous runs
        if (err) console.log('Ignoring error dropping old index idx_prompt_variations_user_module:', err.message);
    });

    // Create NEW indexes based on the current schema (character_cards, etc.)
    // Ensure these match the latest schema.sql definitions
    db.run('CREATE INDEX IF NOT EXISTS idx_character_cards_user_id ON character_cards(user_id);', [], (err) => {
        if (err) console.error('Error creating idx_character_cards_user_id:', err.message);
    });
    db.run('CREATE INDEX IF NOT EXISTS idx_assessment_results_user_prompt_base ON assessment_results(user_id, base_prompt_id);', [], (err) => {
        if (err) console.error('Error creating idx_assessment_results_user_prompt_base:', err.message);
    });
    db.run('CREATE INDEX IF NOT EXISTS idx_alignment_metrics_user_assessment ON alignment_metrics(user_id, assessment_type);', [], (err) => {
        if (err) console.error('Error creating idx_alignment_metrics_user_assessment:', err.message);
    });
    db.run('CREATE INDEX IF NOT EXISTS idx_oauth_state_expires ON oauth_state(expires_at);', [], (err) => {
        if (err) console.error('Error creating idx_oauth_state_expires:', err.message);
    });
    // Add index creation for system_prompts and instruction_templates if desired, mirroring schema.sql
    // Example:
    // db.run('CREATE INDEX IF NOT EXISTS idx_system_prompts_user_type ON system_prompts(user_id, type);', [], (err) => {
    //    if (err) console.error('Error creating idx_system_prompts_user_type:', err.message);
    // });

    // Re-enable foreign keys and commit transaction
    db.run('PRAGMA foreign_keys = ON;', [], function(err) {
        if (err) {
            rollbackAndExit(err);
            return;
        }
        
        db.run('COMMIT;', [], function(err) {
            if (err) {
                rollbackAndExit(err);
                return;
            }
            
            console.log('Migration completed successfully!');
            db.close();
        });
    });
}

function rollbackAndExit(error) {
    console.error('Migration failed:', error.message);
    db.run('ROLLBACK;', [], function() {
        console.log('Transaction rolled back');
        db.close();
        process.exit(1);
    });
} 