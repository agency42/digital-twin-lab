-- Migration script to add mainGoal and examples columns to instruction_templates table

-- Only alter the table if the column doesn't exist
-- First, create a temporary function to check if a column exists
CREATE TEMPORARY FUNCTION IF NOT EXISTS column_exists(table_name TEXT, column_name TEXT) 
RETURNS BOOLEAN 
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM pragma_table_info(table_name) WHERE name = column_name
    );
END;

-- Add mainGoal column if it doesn't exist
ALTER TABLE instruction_templates ADD COLUMN mainGoal TEXT DEFAULT NULL;

-- Add examples column if it doesn't exist
ALTER TABLE instruction_templates ADD COLUMN examples TEXT DEFAULT NULL;

-- Log migration
SELECT 'Added mainGoal and examples columns to instruction_templates table' as Migration_Log; 