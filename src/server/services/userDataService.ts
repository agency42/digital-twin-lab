// import path from 'path'; // Removed unused import
import { dbRun, dbGet, dbAll } from '../lib/database'; // Removed getDbConnection
// import { v4 as uuidv4 } from 'uuid'; // Removed unused import
import bcrypt from 'bcrypt';
import { TipiDimensionScores } from '../lib/tipiUtils'; // Import type for scores

// Interfaces for Data Structures

interface UserProfile {
    bio?: string | null;
    current_character_card_id?: string | null; // Add field to link to current card
    // Add other simple user fields stored directly in the users table
}

// Interface for the character card structure stored in the 'character_cards' table
interface CharacterCard {
    card_id: string;
    user_id: string;
    prompt_name?: string | null; // Retain for consistency? Or remove if unused?
    prompt_text: string; // Stored as JSON string
    based_on_assets?: string | null; // Stored as JSON string of asset IDs
    is_current: boolean; // Added to track the active card
    created_at: string;
    updated_at: string;
}

// Interface for System Prompts
interface SystemPrompt {
    prompt_id: string;
    user_id: string;
    type: string; // 'chat', 'post', etc.
    prompt_text: string;
    is_custom: boolean;
    created_at: string;
    updated_at: string;
}

// Interface for Instruction Templates
interface InstructionTemplate {
    template_id: string;
    user_id: string;
    type: string; // 'chat', 'post', etc.
    instruction_text: string;
    created_at: string;
    updated_at: string;
}

// Interface for Assessment Results
interface AssessmentResult {
    result_id: string;
    user_id: string;
    assessment_type: string;
    source: 'user' | 'ai';
    base_prompt_id?: string | null; // May refer to an old base_prompt
    prompt_variation_id?: string | null; // Refers to old prompt_variations
    temperature?: number | null;
    answers: string; // Raw answers JSON string
    scores: string; // Calculated scores JSON string
    timestamp: string;
    // Include parsed scores for convenience?
    parsed_scores?: TipiDimensionScores | null; // Parsed from scores
}

// Structure for the comprehensive user data object returned by getUserData
// Updated to reflect new prompt structure
interface ComprehensiveUserData extends UserProfile {
    user_id: string;
    created_at: string;
    currentCharacterCard?: CharacterCard | null; // Current active character card
    systemPrompts?: SystemPrompt[]; // All system prompts for the user
    instructionTemplates?: InstructionTemplate[]; // All instruction templates for the user
    assessments?: {
        // Group assessments by type?
        [assessmentType: string]: {
            user?: AssessmentResult | null; // Latest user result
            latestAi?: AssessmentResult | null; // Latest AI result
            alignment?: any; // Placeholder for latest alignment metrics
        };
    };
    // Add other relevant fields like assets? Requires joining assets table
}

// Note: USER_DATA_DIR seems unused now after fileUtils removal
// const USER_DATA_DIR = path.resolve(__dirname, '../../user_data');

// Define interfaces for User Data
// Base user data structure (can be extended)
interface UserData {
    user_id: string;
    email?: string | null;
    password_hash?: string | null;
    created_at?: string;
    updated_at?: string;
    bio?: string | null;
    current_character_card_id?: string | null; // Add field to users table if storing current card link there
    // Add more fields as needed (e.g., name, preferences, etc.)
}

// Interface for update result (consistent across services)
interface UpdateResult {
    success: boolean;
    changes: number;
    message?: string;
}

// Interface for deletion result
interface DeleteResult {
    success: boolean;
    changes: number;
    message?: string;
}

/**
 * Service for managing user data via the SQLite database.
 */
class UserDataService {
    private saltRounds = 10;

    constructor() {
        // Initialization logic if needed (e.g., DB connection checks?)
    }

    /**
     * Maps database user data to the format expected by the frontend
     * This transforms snake_case properties to camelCase
     * Updated to handle new prompt structure
     */
    private mapUserDataForFrontend(userData: any): any {
        if (!userData) return null;

        const result: any = {
            ...userData,
            id: userData.user_id, // Frontend expects 'id' instead of 'user_id'
            userId: userData.user_id, // Include both for compatibility
            createdAt: userData.created_at,
            updatedAt: userData.updated_at,
            bio: userData.bio, // Ensure bio is mapped
        };

        // Map current Character Card
        if (userData.currentCharacterCard) {
            result.characterCard = {
                id: userData.currentCharacterCard.card_id,
                promptName: userData.currentCharacterCard.prompt_name,
                promptText: userData.currentCharacterCard.prompt_text, // Needs parsing on frontend
                basedOnAssets: userData.currentCharacterCard.based_on_assets, // Needs parsing on frontend
                isCurrent: userData.currentCharacterCard.is_current,
                createdAt: userData.currentCharacterCard.created_at,
                updatedAt: userData.currentCharacterCard.updated_at,
            };
            // Include ID for reference
            result.currentCharacterCardId = userData.currentCharacterCard.card_id;
        } else {
            result.currentCharacterCardId = userData.current_character_card_id || null; // From users table if card wasn't joined
        }

        // Map System Prompts (keyed by type)
        if (Array.isArray(userData.systemPrompts) && userData.systemPrompts.length > 0) {
            result.systemPrompts = {};
            userData.systemPrompts.forEach((sp: SystemPrompt) => {
                result.systemPrompts[sp.type] = {
                    id: sp.prompt_id,
                    type: sp.type,
                    promptText: sp.prompt_text,
                    isCustom: sp.is_custom,
                    createdAt: sp.created_at,
                    updatedAt: sp.updated_at,
                };
            });
        }

        // Map Instruction Templates (keyed by type)
        if (
            Array.isArray(userData.instructionTemplates) &&
            userData.instructionTemplates.length > 0
        ) {
            result.instructionTemplates = {};
            userData.instructionTemplates.forEach((it: InstructionTemplate) => {
                result.instructionTemplates[it.type] = {
                    id: it.template_id,
                    type: it.type,
                    instructionText: it.instruction_text,
                    createdAt: it.created_at,
                    updatedAt: it.updated_at,
                };
            });
        }

        // Handle assessments if present
        if (userData.assessments) {
            result.assessment = {
                userTipiScores: userData.assessments.TIPI?.user?.parsed_scores || null,
                aiTipiScores: userData.assessments.TIPI?.latestAi?.parsed_scores || null,
                userAssessmentResultId: userData.assessments.TIPI?.user?.result_id || null,
                aiAssessmentResultId: userData.assessments.TIPI?.latestAi?.result_id || null,
            };
        }

        return result;
    }

    /**
     * Retrieves comprehensive data for a single user.
     * @param userId The ID of the user to retrieve.
     * @returns {Promise<ComprehensiveUserData | null>}
     * Updated to use new prompt tables.
     */
    async getUserData(userId: string): Promise<ComprehensiveUserData | null> {
        if (!userId) {
            console.warn('getUserData called with null or empty userId');
            return null;
        }
        try {
            // 1. Get base user data (ensure current_character_card_id is selected)
            const userBase = await dbGet<
                UserProfile & {
                    user_id: string;
                    created_at: string;
                    current_character_card_id?: string | null;
                }
            >(`SELECT * FROM users WHERE user_id = ?`, [userId]);
            if (!userBase) {
                return null; // User not found
            }

            // 2. Get Current Character Card (if linked)
            let currentCharacterCard: CharacterCard | null = null;
            if (userBase.current_character_card_id) {
                currentCharacterCard =
                    (await dbGet<CharacterCard>(
                        'SELECT * FROM character_cards WHERE card_id = ? AND user_id = ? AND is_current = 1',
                        [userBase.current_character_card_id, userId]
                    )) || null;
                // Fallback if ID exists but card is missing/not current (should ideally not happen)
                if (!currentCharacterCard) {
                    currentCharacterCard =
                        (await dbGet<CharacterCard>(
                            'SELECT * FROM character_cards WHERE user_id = ? AND is_current = 1 ORDER BY updated_at DESC LIMIT 1',
                            [userId]
                        )) || null;
                    // Update userBase if we found a different current card
                    if (
                        currentCharacterCard &&
                        userBase.current_character_card_id !== currentCharacterCard.card_id
                    ) {
                        userBase.current_character_card_id = currentCharacterCard.card_id;
                        // Optionally update the users table here, though might be better elsewhere
                    }
                }
            } else {
                // If no ID is linked, find the latest current card
                currentCharacterCard =
                    (await dbGet<CharacterCard>(
                        'SELECT * FROM character_cards WHERE user_id = ? AND is_current = 1 ORDER BY updated_at DESC LIMIT 1',
                        [userId]
                    )) || null;
                if (currentCharacterCard) {
                    userBase.current_character_card_id = currentCharacterCard.card_id;
                }
            }

            // 3. Get All System Prompts for the user
            const systemPrompts = await dbAll<SystemPrompt>(
                'SELECT * FROM system_prompts WHERE user_id = ?',
                [userId]
            );

            // 4. Get All Instruction Templates for the user
            const instructionTemplates = await dbAll<InstructionTemplate>(
                'SELECT * FROM instruction_templates WHERE user_id = ?',
                [userId]
            );

            // 5. Get Assessment Results (latest user and AI for each type)
            const assessmentTypes = await dbAll<{ assessment_type: string }>(
                'SELECT DISTINCT assessment_type FROM assessment_results WHERE user_id = ?',
                [userId]
            );
            const assessments: ComprehensiveUserData['assessments'] = {};

            for (const typeRow of assessmentTypes) {
                const type = typeRow.assessment_type;
                const latestUserResult = await dbGet<AssessmentResult>(
                    `SELECT * FROM assessment_results 
                     WHERE user_id = ? AND assessment_type = ? AND source = 'user' 
                     ORDER BY timestamp DESC LIMIT 1`,
                    [userId, type]
                );
                const latestAiResult = await dbGet<AssessmentResult>(
                    `SELECT * FROM assessment_results 
                     WHERE user_id = ? AND assessment_type = ? AND source = 'ai' 
                     ORDER BY timestamp DESC LIMIT 1`,
                    [userId, type]
                );

                // Parse scores if available
                if (latestUserResult && latestUserResult.scores) {
                    try {
                        latestUserResult.parsed_scores = JSON.parse(latestUserResult.scores);
                    } catch (e) {
                        console.warn(
                            `Failed to parse user scores JSON for ${userId}, assessment ${type}`
                        );
                    }
                }

                if (latestAiResult && latestAiResult.scores) {
                    try {
                        latestAiResult.parsed_scores = JSON.parse(latestAiResult.scores);
                    } catch (e) {
                        console.warn(
                            `Failed to parse AI scores JSON for ${userId}, assessment ${type}`
                        );
                    }
                }

                // TODO: Fetch latest alignment metrics if needed

                assessments[type] = {
                    user: latestUserResult || null,
                    latestAi: latestAiResult || null,
                    alignment: null, // Placeholder
                };
            }

            // Construct the comprehensive object
            const comprehensiveData: ComprehensiveUserData = {
                ...userBase,
                currentCharacterCard: currentCharacterCard,
                systemPrompts: systemPrompts,
                instructionTemplates: instructionTemplates,
                assessments: assessments,
            };

            // Transform data for frontend consumption
            const frontendData = this.mapUserDataForFrontend(comprehensiveData);
            // console.log(`Transformed user data for ${userId} for frontend consumption:`, JSON.stringify(frontendData, null, 2)); // Verbose logging
            return frontendData; // Return the mapped data
        } catch (error: any) {
            console.error(`[DB GET Error] ${error.message}`); // Log the specific error message
            console.error(`Error getting comprehensive user data for ${userId} from DB:`, error);
            // Re-throw or handle appropriately - for now, return null or throw
            // Depending on how the route handles errors, throwing might be better
            // throw new Error(`Failed to retrieve user data: ${error.message}`);
            return null; // Returning null might lead to 404 on frontend as seen before
        }
    }

    /**
     * Creates a new user record.
     * @param userId The unique user ID.
     * @param data Initial user data (e.g., email, bio). Password should be handled separately or via registration method.
     * @returns {Promise<UpdateResult>}
     */
    async createUser(
        userId: string,
        data: Partial<Omit<UserData, 'user_id' | 'created_at' | 'updated_at'>>
    ): Promise<UpdateResult> {
        const existing = await this.getUserData(userId);
        if (existing) {
            throw new Error(`User with ID ${userId} already exists.`);
        }
        const userDataToInsert = { ...data };
        if (userDataToInsert.password_hash) {
            console.warn(
                `Attempted to set password hash directly during createUser for ${userId}. Ignoring.`
            );
            delete userDataToInsert.password_hash;
        }
        const fields = ['user_id', ...Object.keys(userDataToInsert)];
        const values = [userId, ...Object.values(userDataToInsert)];
        const placeholders = fields.map(() => '?').join(', ');
        const sql = `INSERT INTO users (${fields.join(', ')}) VALUES (${placeholders})`;
        try {
            const result = await dbRun(sql, values);
            return { success: true, changes: result.changes };
        } catch (error: any) {
            console.error(`Error creating user ${userId}:`, error);
            throw new Error(`Database error during user creation: ${error.message}`);
        }
    }

    /**
     * Sets or updates the password for a user.
     * @param userId The user ID.
     * @param password The plain text password.
     * @returns {Promise<UpdateResult>}
     */
    async setUserPassword(userId: string, password: string): Promise<UpdateResult> {
        if (!password || password.length < 8) {
            throw new Error('Password must be at least 8 characters long.');
        }
        try {
            const passwordHash = await bcrypt.hash(password, this.saltRounds);
            const sql =
                'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?';
            const result = await dbRun(sql, [passwordHash, userId]);
            if (result.changes === 0) {
                throw new Error('User not found or password update failed.');
            }
            return { success: true, changes: result.changes };
        } catch (error: any) {
            console.error(`Error setting password for user ${userId}:`, error);
            throw new Error(`Failed to set user password: ${error.message}`);
        }
    }

    /**
     * Verifies a user's password.
     * @param userId The user ID.
     * @param password The plain text password to verify.
     * @returns {Promise<boolean>} True if the password matches, false otherwise.
     */
    async verifyUserPassword(userId: string, password: string): Promise<boolean> {
        try {
            const user = await dbGet<{ password_hash: string | null }>(
                'SELECT password_hash FROM users WHERE user_id = ?',
                [userId]
            );
            if (!user || !user.password_hash) {
                return false;
            }
            return await bcrypt.compare(password, user.password_hash);
        } catch (error: any) {
            console.error(`Error verifying password for user ${userId}:`, error);
            return false;
        }
    }

    /**
     * Updates user data.
     * @param userId The user ID.
     * @param updates Partial user data containing fields to update.
     * @returns {Promise<UpdateResult>}
     */
    async updateUserData(
        userId: string,
        updates: Partial<Omit<UserData, 'user_id' | 'created_at' | 'updated_at'>>
    ): Promise<UpdateResult> {
        const allowedUpdates = { ...updates };

        const fields = Object.keys(allowedUpdates);
        if (fields.length === 0) {
            return { success: true, changes: 0, message: 'No valid fields provided for update.' };
        }

        const setClauses = fields.map((field) => `${field} = ?`).join(', ');
        const values = [...Object.values(allowedUpdates), userId];
        const sql = `UPDATE users SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`;

        try {
            const result = await dbRun(sql, values);
            return { success: true, changes: result.changes };
        } catch (error: any) {
            console.error(`Error updating user data for ${userId}:`, error);
            throw new Error(`Database error updating user data: ${error.message}`);
        }
    }

    /**
     * Deletes a user record.
     * NOTE: This should ideally cascade or handle related data (assets, base_prompts) deletion.
     * Current implementation relies on potential DB cascade rules.
     * @param userId The user ID to delete.
     * @returns {Promise<DeleteResult>}
     */
    async deleteUser(userId: string): Promise<DeleteResult> {
        try {
            // Optional: Add check if user exists before deleting?
            // const user = await this.getUserData(userId);
            // if (!user) return { success: true, changes: 0, message: 'User not found.' };

            // Assuming CASCADE DELETE is set up in DB schema for related tables (base_prompts, assets, etc.)
            const sql = 'DELETE FROM users WHERE user_id = ?';
            const result = await dbRun(sql, [userId]);

            if (result.changes > 0) {
                return {
                    success: true,
                    changes: result.changes,
                    message: 'User deleted successfully.',
                };
            } else {
                // User likely didn't exist
                return { success: true, changes: 0, message: 'User not found or already deleted.' };
            }
        } catch (error: any) {
            console.error(`Error deleting user ${userId}:`, error);
            // If CASCADE fails, this error might indicate related data preventing deletion
            throw new Error(`Database error deleting user: ${error.message}`);
        }
    }

    /**
     * Retrieves all user IDs from the database.
     * @returns {Promise<string[]>}
     */
    async getAllUserIds(): Promise<string[]> {
        try {
            const rows = await dbAll<{ user_id: string }>(
                'SELECT user_id FROM users ORDER BY created_at DESC'
            );
            return rows.map((row) => row.user_id);
        } catch (error: any) {
            console.error('Error getting all user IDs:', error);
            throw new Error(`Database error fetching user IDs: ${error.message}`);
        }
    }
}

// Export an instance of the service (Singleton pattern)
const userDataService = new UserDataService();
export default userDataService;
