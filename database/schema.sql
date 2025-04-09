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
    primary_persona_id TEXT, -- Foreign key to the user's primary persona
    assessment_data TEXT, -- JSON string for storing assessment results
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (primary_persona_id) REFERENCES personas(persona_id) ON DELETE SET NULL -- Set NULL if persona is deleted
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

-- Personas Table (Primary User Persona)
CREATE TABLE IF NOT EXISTS personas (
    persona_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE, -- Each user has exactly one primary persona
    persona_name TEXT,
    persona_json TEXT NOT NULL, -- SoulScript JSON definition
    based_on_assets TEXT, -- JSON array of asset_ids used for generation
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE -- Delete persona if user is deleted
);

-- Persona Variations Table (Module-specific prompts)
CREATE TABLE IF NOT EXISTS persona_variations (
    variation_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    persona_id TEXT NOT NULL, -- Links to the primary persona
    module_context TEXT NOT NULL, -- e.g., 'chat', 'assessment'
    system_prompt TEXT, -- The specific prompt for this context
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (persona_id) REFERENCES personas(persona_id) ON DELETE CASCADE, -- Delete variation if primary persona is deleted
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE, -- Delete variation if user is deleted
    UNIQUE (user_id, module_context) -- Only one variation per user per module
);

-- Assessment Results Table
CREATE TABLE IF NOT EXISTS assessment_results (
    result_id TEXT PRIMARY KEY, -- Renamed from 'id' for clarity
    user_id TEXT NOT NULL,
    assessment_type TEXT NOT NULL, -- e.g., 'TIPI'
    source TEXT CHECK(source IN ('user', 'ai')) NOT NULL,
    persona_id TEXT, -- Link to primary persona used for AI simulation
    temperature REAL, -- Temperature used for AI simulation
    answers TEXT NOT NULL, -- JSON string of raw answers (e.g., { q1: 5, q2: 3 })
    scores TEXT NOT NULL, -- JSON string of calculated scores (e.g., { openness: 4.5, ... })
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (persona_id) REFERENCES personas(persona_id) ON DELETE SET NULL
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
DROP INDEX IF EXISTS idx_assets_user_id; -- Drop the old index
CREATE INDEX IF NOT EXISTS idx_assets_user_platform_medium ON assets(user_id, source_platform, source_medium);
CREATE INDEX IF NOT EXISTS idx_personas_user_id ON personas(user_id);
CREATE INDEX IF NOT EXISTS idx_persona_variations_user_module ON persona_variations(user_id, module_context);
CREATE INDEX IF NOT EXISTS idx_assessment_results_user_type_source ON assessment_results(user_id, assessment_type, source);
CREATE INDEX IF NOT EXISTS idx_alignment_metrics_user_assessment ON alignment_metrics(user_id, assessment_type);
CREATE INDEX IF NOT EXISTS idx_oauth_state_expires ON oauth_state(expires_at);

-- Triggers to update 'updated_at' timestamps (Optional but good practice)
CREATE TRIGGER IF NOT EXISTS users_update_timestamp
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE user_id = OLD.user_id;
END;

CREATE TRIGGER IF NOT EXISTS personas_update_timestamp
AFTER UPDATE ON personas
FOR EACH ROW
BEGIN
    UPDATE personas SET updated_at = CURRENT_TIMESTAMP WHERE persona_id = OLD.persona_id;
END;

CREATE TRIGGER IF NOT EXISTS persona_variations_update_timestamp
AFTER UPDATE ON persona_variations
FOR EACH ROW
BEGIN
    UPDATE persona_variations SET updated_at = CURRENT_TIMESTAMP WHERE variation_id = OLD.variation_id;
END;
