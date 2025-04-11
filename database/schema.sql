-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY, -- Using TEXT as user ID seems to be the pattern (e.g., 'ken_v1')
    email TEXT UNIQUE,
    password_hash TEXT,
    bio TEXT,
    linkedin_connected INTEGER DEFAULT 0, -- 0 for false, 1 for true
    linkedin_profile_asset_id TEXT, -- Foreign key to assets table (optional)
    base_prompt_id TEXT, -- Renamed from primary_persona_id
    assessment_data TEXT, -- JSON string for storing assessment results
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    -- Removed FK for linkedin_profile_asset_id to avoid complexity, handled in code
);

-- Assets Table
CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'text', 'image', etc.
    source_url TEXT, -- Optional: URL if scraped
    upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    content TEXT, -- Store text content directly for faster processing
    -- Add columns expected by assetProcessor
    source_platform TEXT,
    source_medium TEXT,
    mime_type TEXT,
    size_bytes INTEGER,
    metadata TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Rename base_prompts to character_cards and add is_current flag
DROP TABLE IF EXISTS base_prompts;
CREATE TABLE IF NOT EXISTS character_cards (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    card_name TEXT, -- Optional name for the card
    card_data TEXT NOT NULL, -- JSON data for the character card
    is_current INTEGER DEFAULT 0, -- 1 for true, 0 for false
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    based_on_assets TEXT, -- JSON array of asset IDs used
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Trigger to update updated_at timestamp on character_cards
CREATE TRIGGER IF NOT EXISTS update_character_card_timestamp
AFTER UPDATE ON character_cards
FOR EACH ROW
BEGIN
    UPDATE character_cards SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- Remove prompt_variations table
DROP TABLE IF EXISTS prompt_variations;

-- New table for customizable system prompts (replaces prompt_variations)
CREATE TABLE IF NOT EXISTS system_prompts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('chat', 'post')), -- 'chat' or 'post'
    prompt_text TEXT NOT NULL,
    is_custom INTEGER DEFAULT 0, -- 1 if modified from base character card, 0 otherwise
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, type), -- Ensure only one prompt per type per user
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Trigger to update updated_at timestamp on system_prompts
CREATE TRIGGER IF NOT EXISTS update_system_prompt_timestamp
AFTER UPDATE ON system_prompts
FOR EACH ROW
BEGIN
    UPDATE system_prompts SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- New table for customizable instructions
CREATE TABLE IF NOT EXISTS instruction_templates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('chat', 'post')), -- 'chat' or 'post'
    instruction_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, type), -- Ensure only one instruction set per type per user
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Trigger to update updated_at timestamp on instruction_templates
CREATE TRIGGER IF NOT EXISTS update_instruction_template_timestamp
AFTER UPDATE ON instruction_templates
FOR EACH ROW
BEGIN
    UPDATE instruction_templates SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- Instruction Sets Table
CREATE TABLE IF NOT EXISTS instruction_sets (
    instruction_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    instruction_name TEXT NOT NULL,
    instruction_data TEXT NOT NULL, -- JSON string containing instruction data
    medium TEXT, -- e.g., 'chat', 'twitter', 'linkedin', null for general instructions
    is_default INTEGER DEFAULT 0, -- 0 for false, 1 for true
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Prompt Templates Table (Combines Character Cards and Instruction Sets)
CREATE TABLE IF NOT EXISTS prompt_templates (
    template_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    template_name TEXT NOT NULL,
    card_id TEXT NOT NULL,
    instruction_id TEXT,
    assembled_prompt TEXT NOT NULL, -- Combined JSON of card and instruction
    is_default INTEGER DEFAULT 0, -- 0 for false, 1 for true
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES character_cards(id) ON DELETE CASCADE,
    FOREIGN KEY (instruction_id) REFERENCES instruction_sets(instruction_id) ON DELETE SET NULL
);

-- Assessment Results Table
CREATE TABLE IF NOT EXISTS assessment_results (
    result_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    assessment_type TEXT NOT NULL,
    source TEXT CHECK(source IN ('user', 'ai')) NOT NULL,
    base_prompt_id TEXT, -- Renamed from persona_id, link to base prompt used for AI simulation
    temperature REAL,
    answers TEXT NOT NULL,
    scores TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (base_prompt_id) REFERENCES character_cards(id) ON DELETE SET NULL -- Updated FK to character_cards
);

-- Alignment Metrics Table
CREATE TABLE IF NOT EXISTS alignment_metrics (
    metric_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    assessment_type TEXT NOT NULL,
    user_assessment_result_id TEXT NOT NULL, -- Link to the specific user result used
    ai_assessment_result_id TEXT NOT NULL, -- Link to the specific AI result used
    alignment_scores_json TEXT NOT NULL, -- JSON string of calculated scores (itemAgreement, traitCorrelation)
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (user_assessment_result_id) REFERENCES assessment_results(result_id) ON DELETE CASCADE,
    FOREIGN KEY (ai_assessment_result_id) REFERENCES assessment_results(result_id) ON DELETE CASCADE
);

-- OAuth State Table
CREATE TABLE IF NOT EXISTS oauth_state (
    state_key TEXT PRIMARY KEY,
    provider TEXT NOT NULL, -- e.g., 'linkedin'
    user_id TEXT, -- User initiating the flow
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    -- No user FK here as state might be generated before full user context exists sometimes
);

-- Indexes for performance
DROP INDEX IF EXISTS idx_assets_user_platform_medium;
-- CREATE INDEX IF NOT EXISTS idx_assets_user_platform_medium ON assets(user_id, source_platform, source_medium); -- Recreating just in case -- REMOVED
DROP INDEX IF EXISTS idx_personas_user_id;
-- CREATE INDEX IF NOT EXISTS idx_base_prompts_user_id ON base_prompts(user_id); -- Updated index -- REMOVED
DROP INDEX IF EXISTS idx_persona_variations_user_module;
-- CREATE INDEX IF NOT EXISTS idx_prompt_variations_user_module ON prompt_variations(user_id, module_context); -- Updated index -- REMOVED
DROP INDEX IF EXISTS idx_assessment_results_user_type_source;
-- CREATE INDEX IF NOT EXISTS idx_assessment_results_user_prompt ON assessment_results(user_id, base_prompt_id, prompt_variation_id); -- Updated index -- REMOVED (as prompt_variation_id is removed)
CREATE INDEX IF NOT EXISTS idx_assessment_results_user_prompt_base ON assessment_results(user_id, base_prompt_id); -- New index without prompt_variation_id
DROP INDEX IF EXISTS idx_alignment_metrics_user_assessment;
CREATE INDEX IF NOT EXISTS idx_alignment_metrics_user_assessment ON alignment_metrics(user_id, assessment_type); -- Recreating just in case
DROP INDEX IF EXISTS idx_oauth_state_expires;
CREATE INDEX IF NOT EXISTS idx_oauth_state_expires ON oauth_state(expires_at); -- Recreating just in case
CREATE INDEX IF NOT EXISTS idx_character_cards_user_id ON character_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_instruction_sets_user_medium ON instruction_sets(user_id, medium);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_user_id ON prompt_templates(user_id);

-- Triggers to update 'updated_at' timestamps
-- Drop old triggers first
DROP TRIGGER IF EXISTS personas_update_timestamp;
DROP TRIGGER IF EXISTS persona_variations_update_timestamp;
DROP TRIGGER IF EXISTS base_prompts_update_timestamp;
DROP TRIGGER IF EXISTS prompt_variations_update_timestamp; -- Added drop for this trigger

CREATE TRIGGER IF NOT EXISTS users_update_timestamp
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE user_id = OLD.user_id;
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
