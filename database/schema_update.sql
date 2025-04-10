-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- 1. Create Character Cards Table
CREATE TABLE IF NOT EXISTS character_cards (
    card_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    card_name TEXT, -- Optional name for the card
    card_data TEXT NOT NULL, -- JSON containing character attributes (personality, voice, background)
    based_on_assets TEXT, -- JSON array of asset_ids used for generation
    is_default INTEGER DEFAULT 0, -- Whether this is the user's default character card
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 2. Create Instruction Sets Table
CREATE TABLE IF NOT EXISTS instruction_sets (
    instruction_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    instruction_name TEXT, -- Optional name for the instruction set
    instruction_data TEXT NOT NULL, -- JSON containing directives and platform-specific instructions
    medium TEXT, -- Optional specific medium this instruction set targets (twitter, linkedin, etc.)
    is_default INTEGER DEFAULT 0, -- Whether this is the user's default instruction set
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 3. Create Prompt Templates Table (replaces base_prompts)
CREATE TABLE IF NOT EXISTS prompt_templates (
    template_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    template_name TEXT, -- Name for the template
    card_id TEXT NOT NULL, -- Reference to character card
    instruction_id TEXT, -- Reference to instruction set (optional)
    assembled_prompt TEXT NOT NULL, -- Full assembled prompt (for backward compatibility)
    is_default INTEGER DEFAULT 0, -- Whether this is the user's default template
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES character_cards(card_id) ON DELETE CASCADE,
    FOREIGN KEY (instruction_id) REFERENCES instruction_sets(instruction_id) ON DELETE SET NULL
);

-- 4. Update Prompt Variations Table to reference prompt_templates
CREATE TABLE IF NOT EXISTS prompt_variations_new (
    variation_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    template_id TEXT NOT NULL, -- Reference to prompt template (replaces base_prompt_id)
    card_id TEXT, -- Optional override for character card
    instruction_id TEXT, -- Optional override for instruction set
    module_context TEXT NOT NULL, -- e.g., 'chat', 'assessment'
    assembled_prompt TEXT, -- Full assembled prompt override (if needed)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES prompt_templates(template_id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES character_cards(card_id) ON DELETE SET NULL,
    FOREIGN KEY (instruction_id) REFERENCES instruction_sets(instruction_id) ON DELETE SET NULL,
    UNIQUE (user_id, module_context)
);

-- 5. Update Users Table to reference prompt_templates
ALTER TABLE users ADD COLUMN default_template_id TEXT;
ALTER TABLE users ADD COLUMN default_card_id TEXT;
ALTER TABLE users ADD COLUMN default_instruction_id TEXT;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_character_cards_user_id ON character_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_instruction_sets_user_id ON instruction_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_instruction_sets_medium ON instruction_sets(medium);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_user_id ON prompt_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_components ON prompt_templates(card_id, instruction_id);
CREATE INDEX IF NOT EXISTS idx_prompt_variations_new_user_module ON prompt_variations_new(user_id, module_context);

-- Triggers to update 'updated_at' timestamps
CREATE TRIGGER IF NOT EXISTS character_cards_update_timestamp
AFTER UPDATE ON character_cards
FOR EACH ROW
BEGIN
    UPDATE character_cards SET updated_at = CURRENT_TIMESTAMP WHERE card_id = OLD.card_id;
END;

CREATE TRIGGER IF NOT EXISTS instruction_sets_update_timestamp
AFTER UPDATE ON instruction_sets
FOR EACH ROW
BEGIN
    UPDATE instruction_sets SET updated_at = CURRENT_TIMESTAMP WHERE instruction_id = OLD.instruction_id;
END;

CREATE TRIGGER IF NOT EXISTS prompt_templates_update_timestamp
AFTER UPDATE ON prompt_templates
FOR EACH ROW
BEGIN
    UPDATE prompt_templates SET updated_at = CURRENT_TIMESTAMP WHERE template_id = OLD.template_id;
END;

CREATE TRIGGER IF NOT EXISTS prompt_variations_new_update_timestamp
AFTER UPDATE ON prompt_variations_new
FOR EACH ROW
BEGIN
    UPDATE prompt_variations_new SET updated_at = CURRENT_TIMESTAMP WHERE variation_id = OLD.variation_id;
END;

-- Migration plan (to be run as separate script)
-- 1. For each base_prompt, parse the JSON to separate character info from instructions
-- 2. Create character_card and instruction_set entries
-- 3. Create prompt_template entry linking them
-- 4. Update user references
-- 5. Migrate prompt_variations to prompt_variations_new
-- 6. Drop old tables and rename new ones 