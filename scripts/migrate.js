/**
 * Migration script to update database schema from personas to base_prompts
 * Run with: node database/migrate.js
 */

// Import SQLite3 module
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

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
    const fs = require('fs');
    fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8', (err, schemaSQL) => {
        if (err) {
            rollbackAndExit(new Error(`Failed to read schema.sql: ${err.message}`));
            return;
        }
        
        db.exec(schemaSQL, function(err) {
            if (err) {
                rollbackAndExit(new Error(`Failed to execute schema.sql: ${err.message}`));
                return;
            }
            
            console.log('Created new tables from schema.sql');
            finalizeMigration();
        });
    });
}

function finalizeMigration() {
    // Create indexes
    db.run('DROP INDEX IF EXISTS idx_personas_user_id;', [], function(err) {
        if (err) console.log('Warning:', err.message);
        
        db.run('CREATE INDEX IF NOT EXISTS idx_base_prompts_user_id ON base_prompts(user_id);', [], function(err) {
            if (err) console.log('Warning:', err.message);
            
            db.run('DROP INDEX IF EXISTS idx_persona_variations_user_module;', [], function(err) {
                if (err) console.log('Warning:', err.message);
                
                db.run('CREATE INDEX IF NOT EXISTS idx_prompt_variations_user_module ON prompt_variations(user_id, module_context);', [], function(err) {
                    if (err) console.log('Warning:', err.message);
                    
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
                });
            });
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