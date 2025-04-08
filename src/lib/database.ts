import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

// Define the type for the database connection object
// sqlite3.Database is the correct type from the library
let db: sqlite3.Database | null = null;

const dbPath = path.resolve(__dirname, '../../database/digital_twin_lab.db');
const schemaPath = path.resolve(__dirname, '../../database/schema.sql');

/**
 * Initializes the database connection and creates tables if they don't exist.
 * Returns a promise that resolves when the database is ready.
 * @returns {Promise<sqlite3.Database>}
 */
async function initializeDatabase(): Promise<sqlite3.Database> {
    if (db) {
        return db;
    }

    return new Promise((resolve, reject) => {
        // Ensure the database directory exists
        const dbDir = path.dirname(dbPath);
        fs.mkdirSync(dbDir, { recursive: true });

        const newDb = new (sqlite3.verbose().Database)(dbPath, (err: Error | null) => {
            if (err) {
                console.error('[DB Connect Error]', err.message);
                return reject(new Error(`Database connection error: ${err.message}`));
            }
            console.log('Connected to the SQLite database.');

            // Read and execute schema
            fs.readFile(schemaPath, 'utf8', (schemaErr: NodeJS.ErrnoException | null, schemaSql: string) => {
                if (schemaErr) {
                    console.error('[DB Schema Read Error]', schemaErr.message);
                    return reject(new Error(`Could not read schema file: ${schemaErr.message}`));
                }

                // Use db.exec to run multiple statements from the schema file
                newDb.exec(schemaSql, (execErr: Error | null) => {
                    if (execErr) {
                        console.error('[DB Schema Exec Error]', execErr.message);
                        return reject(new Error(`Database schema execution error: ${execErr.message}`));
                    }
                    console.log('Database schema applied successfully.');
                    db = newDb;
                    resolve(db);
                });
            });
        });
    });
}

/**
 * Returns the database connection instance.
 * Throws an error if the database is not initialized.
 * @returns {sqlite3.Database}
 */
function getDbConnection(): sqlite3.Database {
    if (!db) {
        throw new Error('Database not initialized. Call initializeDatabase first.');
    }
    return db;
}

/**
 * Closes the database connection.
 * @returns {Promise<void>}
 */
async function closeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (db) {
            db.close((err: Error | null) => {
                if (err) {
                    console.error('[DB Close Error]', err.message);
                    reject(err);
                } else {
                    console.log('Database connection closed.');
                    db = null;
                    resolve();
                }
            });
        } else {
            resolve(); // Already closed
        }
    });
}

// Promisified versions of common DB methods
// Type parameters: T for the result type, P for parameter types

async function dbRun(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    const dbInstance = getDbConnection();
    return new Promise((resolve, reject) => {
        dbInstance.run(sql, params, function (this: sqlite3.RunResult, err: Error | null) {
            if (err) {
                console.error('[DB RUN Error]', { sql, params, error: err.message });
                reject(err);
            } else {
                // 'this' context refers to RunResult here
                resolve({ lastID: this.lastID, changes: this.changes });
            }
        });
    });
}

async function dbGet<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    const dbInstance = getDbConnection();
    return new Promise((resolve, reject) => {
        dbInstance.get<T>(sql, params, (err: Error | null, row: T | undefined) => {
            if (err) {
                console.error('[DB GET Error]', { sql, params, error: err.message });
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

async function dbAll<T>(sql: string, params: any[] = []): Promise<T[]> {
    const dbInstance = getDbConnection();
    return new Promise((resolve, reject) => {
        dbInstance.all<T>(sql, params, (err: Error | null, rows: T[]) => {
            if (err) {
                console.error('[DB ALL Error]', { sql, params, error: err.message });
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}


export {
    initializeDatabase,
    getDbConnection,
    closeDatabase,
    dbRun,
    dbGet,
    dbAll,
}; 