/**
 * Database initialization script
 * 
 * This script initializes the database for first-time users without wiping existing data.
 * It's safe to run multiple times - if the database already exists, it won't be modified.
 * 
 * Run with: node scripts/init_db.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database file path
const dbPath = path.join(__dirname, '../database/digital_twin_lab.db');
const schemaPath = path.join(__dirname, '../database/schema.sql');
const promptTemplatesPath = path.join(__dirname, '../database/prompt_templates.sql');

// Check if database exists
if (fs.existsSync(dbPath)) {
    console.log('Database already exists at:', dbPath);
    console.log('No action needed. Database is ready to use.');
    console.log('If you want to reset the database completely, run: npm run db:reset');
    process.exit(0);
}

// Database directory
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    console.log('Creating database directory...');
    fs.mkdirSync(dbDir, { recursive: true });
}

// Create a new database
console.log('Creating new database...');
const db = new sqlite3.Database(dbPath);

// Apply schema
console.log('Applying schema from database/schema.sql...');
const schema = fs.readFileSync(schemaPath, 'utf8');

db.exec(schema, function(err) {
    if (err) {
        console.error('Error executing schema SQL:', err.message);
        db.close();
        process.exit(1);
    }
    
    console.log('Schema successfully applied to new database.');
    
    // Apply prompt templates if file exists
    if (fs.existsSync(promptTemplatesPath)) {
        console.log('Applying prompt templates from database/prompt_templates.sql...');
        const promptTemplates = fs.readFileSync(promptTemplatesPath, 'utf8');
        
        db.exec(promptTemplates, function(templateErr) {
            if (templateErr) {
                console.error('Error executing prompt templates SQL:', templateErr.message);
                console.log('Database was created but templates could not be applied.');
                db.close();
                process.exit(1);
            }
            
            console.log('Prompt templates successfully applied.');
            console.log('Database initialization complete!');
            db.close();
        });
    } else {
        console.log('Prompt templates file not found, skipping.');
        console.log('Database initialization complete!');
        db.close();
    }
}); 