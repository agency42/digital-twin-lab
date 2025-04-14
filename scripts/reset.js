/**
 * Reset script - completely resets the database by removing it and recreating with the current schema
 * WARNING: All data will be lost!
 * Run with: node scripts/reset.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database file path
const dbPath = path.join(__dirname, '../database/digital_twin_lab.db');

// Confirm reset with user
console.log('WARNING: This will completely reset the database. All data will be lost!');
console.log('Database path:', dbPath);

// Give user a chance to abort by adding a timer
console.log('Script will continue in 5 seconds. Press Ctrl+C to abort...');

setTimeout(() => {
    // Delete the database file if it exists
    if (fs.existsSync(dbPath)) {
        try {
            fs.unlinkSync(dbPath);
            console.log('Existing database deleted.');
        } catch (err) {
            console.error('Error deleting database:', err.message);
            process.exit(1);
        }
    } else {
        console.log('No existing database found. Creating new one.');
    }

    // Create a new database
    const db = new sqlite3.Database(dbPath);
    console.log('New database file created.');

    // Read the schema file
    console.log('Applying schema from database/schema.sql...');
    const schema = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8');

    // Execute the schema SQL
    db.exec(schema, function(err) {
        if (err) {
            console.error('Error executing schema SQL:', err.message);
            db.close();
            process.exit(1);
        }
        
        console.log('Schema successfully applied to new database.');
        console.log('Database reset complete.');
        db.close();
    });
}, 5000);

console.log('Waiting...'); 