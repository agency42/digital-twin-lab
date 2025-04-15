-- Script to fix the instruction_templates table structure

-- Create a backup of the current table
CREATE TABLE instruction_templates_backup AS SELECT * FROM instruction_templates;

-- Drop the existing table
DROP TABLE instruction_templates;

-- Recreate the table with the proper column structure
CREATE TABLE instruction_templates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('chat', 'post')), -- 'chat' or 'post'
    instruction_text TEXT NOT NULL,
    mainGoal TEXT,
    examples TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, type), -- Ensure only one instruction set per type per user
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Copy the data back from the backup
INSERT INTO instruction_templates (id, user_id, type, instruction_text, mainGoal, examples, created_at, updated_at)
SELECT id, user_id, type, instruction_text, mainGoal, examples, created_at, updated_at FROM instruction_templates_backup;

-- Recreate the timestamp trigger
DROP TRIGGER IF EXISTS update_instruction_template_timestamp;
CREATE TRIGGER update_instruction_template_timestamp
AFTER UPDATE ON instruction_templates
FOR EACH ROW
BEGIN
    UPDATE instruction_templates SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- Clean up the backup table
DROP TABLE instruction_templates_backup;

-- Log completion
SELECT 'Fixed instruction_templates table structure' as Result; 