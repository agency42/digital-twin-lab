// import path from 'path'; // Removed unused import
import { dbRun, dbGet, dbAll } from '../lib/database'; // Removed getDbConnection
// import { v4 as uuidv4 } from 'uuid'; // Removed unused import
import bcrypt from 'bcrypt';
import { TipiDimensionScores } from '../lib/tipiUtils'; // Import type for scores

// Interfaces for Data Structures

interface UserProfile {
    bio?: string | null;
    linkedin_connected?: boolean;
    linkedin_profile_asset_id?: string | null;
    // Add other simple user fields stored directly in the users table
}

// Interface for the primary persona structure stored in the 'personas' table
interface PrimaryPersona {
    persona_id: string;
    user_id: string;
    persona_name?: string | null;
    persona_json: string; // Stored as JSON string
    based_on_assets?: string | null; // Stored as JSON string of asset IDs
    created_at: string;
    updated_at: string;
}

// Interface for Persona Variations
interface PersonaVariation {
    variation_id: string;
    user_id: string;
    persona_id: string;
    module_context: string; // Renamed from 'module' to avoid conflict
    system_prompt: string | null;
    created_at: string;
    updated_at: string;
}

// Interface for Assessment Results
interface AssessmentResult {
    result_id: string;
    user_id: string;
    assessment_type: string;
    source: 'user' | 'ai';
    persona_variation_id?: string | null;
    results_json: string; // Raw answers JSON string
    calculated_scores_json: string; // Calculated scores JSON string
    timestamp: string;
    // Include parsed scores for convenience?
    scores?: TipiDimensionScores | null; // Parsed from calculated_scores_json
}

// Structure for the comprehensive user data object returned by getUserData
// This needs refinement based on actual usage and desired output structure
interface ComprehensiveUserData extends UserProfile {
    user_id: string;
    created_at: string;
    primary_persona?: PrimaryPersona | null; // Nested primary persona object
    variations?: PersonaVariation[]; // Array of variations
    assessments?: { // Group assessments by type?
        [assessmentType: string]: {
            user?: AssessmentResult | null; // Latest user result
            latestAi?: AssessmentResult | null; // Latest AI result
            alignment?: any; // Placeholder for latest alignment metrics
        }
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
    // OAuth related fields
    linkedin_connected?: boolean | number; // Use boolean in logic, DB might store 0/1
    linkedin_profile_asset_id?: string | null;
    // Other profile info
    bio?: string | null;
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
     */
    private mapUserDataForFrontend(userData: any): any {
        if (!userData) return null;
        
        const result: any = {
            ...userData,
            id: userData.user_id, // Frontend expects 'id' instead of 'user_id'
            userId: userData.user_id, // Include both for compatibility
            createdAt: userData.created_at,
            updatedAt: userData.updated_at
        };
        
        // Convert primary_persona to primaryPersona expected by frontend
        if (userData.primary_persona) {
            result.primaryPersona = {
                id: userData.primary_persona.persona_id,
                profile: JSON.parse(userData.primary_persona.persona_json || '{}'),
                createdAt: userData.primary_persona.created_at,
                updatedAt: userData.primary_persona.updated_at
            };
        }
        
        // Include primary_persona_id for debugging
        if (userData.primary_persona_id) {
            result.primaryPersonaId = userData.primary_persona_id;
        }
        
        // Handle variations if present
        if (Array.isArray(userData.variations) && userData.variations.length > 0) {
            result.personaVariations = {};
            userData.variations.forEach((variation: any) => {
                result.personaVariations[variation.persona_variation_id] = {
                    id: variation.persona_variation_id,
                    systemPrompt: variation.system_prompt,
                    updatedAt: variation.updated_at
                };
            });
        }
        
        // Handle assessments if present
        if (userData.assessments) {
            result.assessment = {
                userTipiScores: userData.assessments.TIPI?.user?.scores || null,
                aiTipiScores: userData.assessments.TIPI?.latestAi?.scores || null,
                userAssessmentResultId: userData.assessments.TIPI?.user?.result_id || null,
                aiAssessmentResultId: userData.assessments.TIPI?.latestAi?.result_id || null
            };
        }
        
        return result;
    }

    /**
     * Retrieves comprehensive data for a single user.
     * @param userId The ID of the user to retrieve.
     * @returns {Promise<ComprehensiveUserData | null>}
     */
    async getUserData(userId: string): Promise<ComprehensiveUserData | null> {
        if (!userId) {
            console.warn('getUserData called with null or empty userId');
            return null;
        }
        try {
            // 1. Get base user data
            const userBase = await dbGet<UserProfile & { user_id: string, created_at: string, primary_persona_id?: string }>(`SELECT * FROM users WHERE user_id = ?`, [userId]);
            if (!userBase) {
                return null; // User not found
            }

            // 2. Get Primary Persona (if linked)
            let primaryPersona: PrimaryPersona | null = null;
            if (userBase.primary_persona_id) {
                primaryPersona = await dbGet<PrimaryPersona>('SELECT * FROM personas WHERE persona_id = ?', [userBase.primary_persona_id]) || null;
            }

            // 3. Get Persona Variations
            const variations = await dbAll<PersonaVariation>('SELECT * FROM persona_variations WHERE user_id = ? ORDER BY updated_at DESC', [userId]);

            // 4. Get Assessment Results (latest user and AI for each type)
            const assessmentTypes = await dbAll<{ assessment_type: string }>('SELECT DISTINCT assessment_type FROM assessment_results WHERE user_id = ?', [userId]);
            const assessments: ComprehensiveUserData['assessments'] = {};

            for (const typeRow of assessmentTypes) {
                const type = typeRow.assessment_type;
                const latestUserResult = await dbGet<AssessmentResult>(
                    `SELECT * FROM assessment_results 
                     WHERE user_id = ? AND assessment_type = ? AND source = 'user' 
                     ORDER BY timestamp DESC LIMIT 1`, [userId, type]
                );
                const latestAiResult = await dbGet<AssessmentResult>(
                    `SELECT * FROM assessment_results 
                     WHERE user_id = ? AND assessment_type = ? AND source = 'ai' 
                     ORDER BY timestamp DESC LIMIT 1`, [userId, type]
                );
                
                // TODO: Fetch latest alignment metrics if needed

                assessments[type] = {
                    user: latestUserResult || null,
                    latestAi: latestAiResult || null,
                    alignment: null // Placeholder
                };
            }

            // Construct the comprehensive object
            const comprehensiveData: ComprehensiveUserData = {
                ...userBase,
                primary_persona: primaryPersona,
                variations: variations,
                assessments: assessments
            };

            // Transform data for frontend consumption
            const frontendData = this.mapUserDataForFrontend(comprehensiveData);
            console.log(`Transformed user data for ${userId} for frontend consumption`);
            
            return frontendData;

        } catch (error: any) {
            console.error(`Error getting comprehensive user data for ${userId} from DB:`, error);
            return null; // Return null on error
        }
    }

    /**
     * Creates a new user record.
     * @param userId The unique user ID.
     * @param data Initial user data (e.g., email, bio). Password should be handled separately or via registration method.
     * @returns {Promise<UpdateResult>}
     */
    async createUser(userId: string, data: Partial<Omit<UserData, 'user_id' | 'created_at' | 'updated_at'>>): Promise<UpdateResult> {
        const existing = await this.getUserData(userId);
        if (existing) {
            throw new Error(`User with ID ${userId} already exists.`);
        }
        const userDataToInsert = { ...data };
        if (userDataToInsert.password_hash) {
             console.warn(`Attempted to set password hash directly during createUser for ${userId}. Ignoring.`);
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
             const sql = 'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?';
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
            const user = await dbGet<{ password_hash: string | null }>('SELECT password_hash FROM users WHERE user_id = ?', [userId]);
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
    async updateUserData(userId: string, updates: Partial<Omit<UserData, 'user_id' | 'created_at' | 'updated_at'>>): Promise<UpdateResult> {
        // Omit already excludes these fields, so no need to delete them
        const allowedUpdates = { ...updates }; 

        // Convert boolean linkedin_connected back to number for DB if present
        if (typeof allowedUpdates.linkedin_connected === 'boolean') {
            allowedUpdates.linkedin_connected = allowedUpdates.linkedin_connected ? 1 : 0;
        }

        const fields = Object.keys(allowedUpdates);
        if (fields.length === 0) {
            return { success: true, changes: 0, message: 'No valid fields provided for update.' };
        }

        const setClauses = fields.map(field => `${field} = ?`).join(', ');
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
     * NOTE: This should ideally cascade or handle related data (assets, personas) deletion.
     * Current implementation relies on potential DB cascade rules.
     * @param userId The user ID to delete.
     * @returns {Promise<DeleteResult>}
     */
    async deleteUser(userId: string): Promise<DeleteResult> {
        try {
            // Optional: Add check if user exists before deleting?
            // const user = await this.getUserData(userId);
            // if (!user) return { success: true, changes: 0, message: 'User not found.' };
            
            // Assuming CASCADE DELETE is set up in DB schema for related tables (personas, assets, etc.)
            const sql = 'DELETE FROM users WHERE user_id = ?';
            const result = await dbRun(sql, [userId]);

            if (result.changes > 0) {
                 return { success: true, changes: result.changes, message: 'User deleted successfully.' };
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
            const rows = await dbAll<{ user_id: string }>('SELECT user_id FROM users ORDER BY created_at DESC');
            return rows.map(row => row.user_id);
        } catch (error: any) {
            console.error('Error getting all user IDs:', error);
            throw new Error(`Database error fetching user IDs: ${error.message}`);
        }
    }
}

// Export an instance of the service (Singleton pattern)
const userDataService = new UserDataService();
export default userDataService; 