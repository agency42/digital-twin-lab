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
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (base_prompt_id) REFERENCES base_prompts(base_prompt_id) ON DELETE SET NULL -- Updated FK
    -- Removed FK for linkedin_profile_asset_id to avoid complexity, handled in code
);

-- Assets Table
CREATE TABLE IF NOT EXISTS assets (
    asset_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT CHECK(type IN ('text', 'image', 'pdf', 'url', 'json')) NOT NULL,
    filepath TEXT NOT NULL UNIQUE, -- Path relative to the data/assets directory
    source_platform TEXT, -- e.g., 'linkedin', 'twitter', 'website', 'direct_upload'
    source_medium TEXT, -- e.g., 'post', 'profile', 'article', 'blog', 'file'
    original_filename TEXT,
    mime_type TEXT,
    size_bytes INTEGER,
    metadata TEXT, -- JSON string for additional metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE -- Delete assets if user is deleted
);

-- Base Prompts Table (Replaces Personas Table)
CREATE TABLE IF NOT EXISTS base_prompts (
    base_prompt_id TEXT PRIMARY KEY, -- Renamed from persona_id
    user_id TEXT NOT NULL UNIQUE, -- Each user has exactly one base prompt
    prompt_name TEXT, -- Optional name for the prompt
    prompt_text TEXT NOT NULL, -- Renamed from persona_json, stores the actual prompt string
    based_on_assets TEXT, -- JSON array of asset_ids used for generation
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Prompt Variations Table (Replaces Persona Variations Table)
CREATE TABLE IF NOT EXISTS prompt_variations (
    variation_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    base_prompt_id TEXT NOT NULL, -- Renamed from persona_id, links to the base prompt
    module_context TEXT NOT NULL, -- e.g., 'chat', 'assessment'
    system_prompt_override TEXT, -- Renamed from system_prompt, stores the specific override for this context
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (base_prompt_id) REFERENCES base_prompts(base_prompt_id) ON DELETE CASCADE, -- Updated FK
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE (user_id, module_context)
);

-- Assessment Results Table
CREATE TABLE IF NOT EXISTS assessment_results (
    result_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    assessment_type TEXT NOT NULL,
    source TEXT CHECK(source IN ('user', 'ai')) NOT NULL,
    base_prompt_id TEXT, -- Renamed from persona_id, link to base prompt used for AI simulation
    prompt_variation_id TEXT, -- Optional: Link to specific variation used, if any
    temperature REAL,
    answers TEXT NOT NULL,
    scores TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (base_prompt_id) REFERENCES base_prompts(base_prompt_id) ON DELETE SET NULL, -- Updated FK
    FOREIGN KEY (prompt_variation_id) REFERENCES prompt_variations(variation_id) ON DELETE SET NULL
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
CREATE INDEX IF NOT EXISTS idx_assets_user_platform_medium ON assets(user_id, source_platform, source_medium); -- Recreating just in case
DROP INDEX IF EXISTS idx_personas_user_id;
CREATE INDEX IF NOT EXISTS idx_base_prompts_user_id ON base_prompts(user_id); -- Updated index
DROP INDEX IF EXISTS idx_persona_variations_user_module;
CREATE INDEX IF NOT EXISTS idx_prompt_variations_user_module ON prompt_variations(user_id, module_context); -- Updated index
DROP INDEX IF EXISTS idx_assessment_results_user_type_source;
CREATE INDEX IF NOT EXISTS idx_assessment_results_user_prompt ON assessment_results(user_id, base_prompt_id, prompt_variation_id); -- Updated index
DROP INDEX IF EXISTS idx_alignment_metrics_user_assessment;
CREATE INDEX IF NOT EXISTS idx_alignment_metrics_user_assessment ON alignment_metrics(user_id, assessment_type); -- Recreating just in case
DROP INDEX IF EXISTS idx_oauth_state_expires;
CREATE INDEX IF NOT EXISTS idx_oauth_state_expires ON oauth_state(expires_at); -- Recreating just in case

-- Triggers to update 'updated_at' timestamps
-- Drop old triggers first
DROP TRIGGER IF EXISTS personas_update_timestamp;
DROP TRIGGER IF EXISTS persona_variations_update_timestamp;

CREATE TRIGGER IF NOT EXISTS users_update_timestamp
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE user_id = OLD.user_id;
END;

CREATE TRIGGER IF NOT EXISTS base_prompts_update_timestamp -- Updated trigger
AFTER UPDATE ON base_prompts
FOR EACH ROW
BEGIN
    UPDATE base_prompts SET updated_at = CURRENT_TIMESTAMP WHERE base_prompt_id = OLD.base_prompt_id;
END;

CREATE TRIGGER IF NOT EXISTS prompt_variations_update_timestamp -- Updated trigger
AFTER UPDATE ON prompt_variations
FOR EACH ROW
BEGIN
    UPDATE prompt_variations SET updated_at = CURRENT_TIMESTAMP WHERE variation_id = OLD.variation_id;
END;
