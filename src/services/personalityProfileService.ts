import { dbRun, dbGet, dbAll } from '../lib/database';
import { v4 as uuidv4 } from 'uuid';

// Interfaces (Consider sharing these via a types file if used elsewhere)
interface PrimaryPersona {
    persona_id: string;
    user_id: string;
    persona_name?: string | null;
    persona_json: string; // Stored as JSON string
    based_on_assets?: string | null; // Stored as JSON string of asset IDs
    created_at: string;
    updated_at: string;
}

interface PersonaVariation {
    variation_id: string;
    user_id: string;
    persona_id: string;
    module_context: string; // Renamed from module
    system_prompt: string | null;
    created_at: string;
    updated_at: string;
}

interface SavePersonaOptions {
    personaName?: string;
    basedOnAssetIds?: string[];
}

interface PersonaQueryResult {
    persona_id: string;
    user_id: string;
    persona_name: string | null;
    persona_json: string;
    based_on_assets: string | null;
    created_at: string;
    updated_at: string;
    // Joined user fields
    primary_persona_id: string | null;
}


/**
 * Service for managing personality profiles and variations.
 */
class PersonalityProfileService {

    constructor() {
        // Constructor logic (if any)
    }

    /**
     * Saves or updates the primary persona for a user.
     * Enforces a single primary persona per user via UNIQUE constraint on user_id.
     * @param userId The user ID.
     * @param personaJson The persona definition (SoulScript JSON string).
     * @param options Optional data like name and asset IDs.
     * @returns {Promise<PrimaryPersona>} The saved or updated persona data.
     */
    async savePrimaryPersona(userId: string, personaJson: string, options: SavePersonaOptions = {}): Promise<PrimaryPersona> {
        const personaId = uuidv4(); // Generate new ID for potential insert
        const now = new Date().toISOString();
        const basedOnAssetsJson = options.basedOnAssetIds ? JSON.stringify(options.basedOnAssetIds) : null;
        const personaName = options.personaName || null;

        const upsertQuery = `
            INSERT INTO personas (persona_id, user_id, persona_name, persona_json, based_on_assets, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                persona_name = excluded.persona_name,
                persona_json = excluded.persona_json,
                based_on_assets = excluded.based_on_assets,
                updated_at = excluded.updated_at
            RETURNING *; -- Return the inserted or updated row
        `;

        const params = [personaId, userId, personaName, personaJson, basedOnAssetsJson, now, now];

        try {
            // Run upsert and get the resulting persona (either inserted or updated)
            const savedOrUpdatedPersona = await dbGet<PrimaryPersona>(upsertQuery, params);
            
            if (!savedOrUpdatedPersona) {
                 // This case might happen if RETURNING is not supported/reliable or conflict occurred unexpectedly.
                 // Attempt to fetch the existing one by user_id as a fallback.
                 console.warn(`Upsert RETURNING failed for user ${userId}, attempting fallback SELECT.`);
                 const existingPersona = await dbGet<PrimaryPersona>('SELECT * FROM personas WHERE user_id = ?', [userId]);
                 if (!existingPersona) {
                     throw new Error('Failed to save or retrieve persona after upsert.');
                 }
                 // If fallback fetch worked, ensure user's primary_persona_id is set correctly
                 await dbRun('UPDATE users SET primary_persona_id = ? WHERE user_id = ?', [existingPersona.persona_id, userId]);
                 return existingPersona;
            }

            // Ensure the user record points to this primary persona
            await dbRun('UPDATE users SET primary_persona_id = ? WHERE user_id = ?', [savedOrUpdatedPersona.persona_id, userId]);

            return savedOrUpdatedPersona;
        } catch (error: any) {
            console.error(`Error in savePrimaryPersona for user ${userId}:`, error);
            throw new Error(`Failed to save primary persona: ${error.message}`);
        }
    }

    /**
     * Retrieves the primary persona for a user.
     * @param userId The user ID.
     * @returns {Promise<PrimaryPersona | null>} The primary persona or null if not found.
     */
    async getUserPrimaryPersona(userId: string): Promise<PrimaryPersona | null> {
        try {
            // Fetch based on the user_id directly due to the UNIQUE constraint
            const persona = await dbGet<PrimaryPersona>('SELECT * FROM personas WHERE user_id = ?', [userId]);
            return persona || null;
        } catch (error: any) {
            console.error(`Error getting primary persona for user ${userId}:`, error);
            return null;
        }
    }
    
    /**
     * Retrieves the primary persona along with user details by user ID.
     * @param userId The user ID.
     * @returns {Promise<PersonaQueryResult | null>} Joined persona and user data or null.
     */
    async getPersonaWithUserDetails(userId: string): Promise<PersonaQueryResult | null> {
         try {
            const query = `
                SELECT p.*, u.primary_persona_id 
                FROM personas p 
                JOIN users u ON p.user_id = u.user_id
                WHERE p.user_id = ?`;
            const result = await dbGet<PersonaQueryResult>(query, [userId]);
            return result || null;
        } catch (error: any) {
            console.error(`Error getting persona with user details for user ${userId}:`, error);
            return null;
        }
    }

    /**
     * Deletes the primary persona for a user.
     * @param userId The user ID.
     * @returns {Promise<{ success: boolean; message?: string; changes?: number }>} Result object.
     */
    async deletePrimaryPersona(userId: string): Promise<{ success: boolean; message?: string; changes?: number }> {
        try {
             // Use getUserPrimaryPersona to check existence first might be redundant if FK handles it
            const result = await dbRun('DELETE FROM personas WHERE user_id = ?', [userId]);
            if (result.changes > 0) {
                // Also clear the primary_persona_id in the users table
                 await dbRun('UPDATE users SET primary_persona_id = NULL WHERE user_id = ?', [userId]);
                 return { success: true, changes: result.changes };
            } else {
                 return { success: true, message: 'No primary persona found to delete.', changes: 0 };
            }
        } catch (error: any) {
            console.error(`Error deleting primary persona for user ${userId}:`, error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Saves or updates a module-specific variation of a persona's system prompt.
     * @param userId The user ID.
     * @param moduleContext The module context (e.g., 'chat', 'assessment').
     * @param systemPrompt The system prompt text.
     * @returns {Promise<{ variationId: string }>} The ID of the saved/updated variation.
     */
    async saveVariation(userId: string, moduleContext: string, systemPrompt: string | null): Promise<{ variationId: string }> {
        if (!userId || !moduleContext) {
            throw new Error('User ID and module context are required to save a variation.');
        }

        try {
            // Get the primary persona ID first
            const primaryPersona = await this.getUserPrimaryPersona(userId);
            if (!primaryPersona) {
                throw new Error('Cannot save variation: Primary persona not found for user.');
            }
            const personaId = primaryPersona.persona_id;

            const now = new Date().toISOString();
            const variationId = uuidv4(); // Generate new ID for potential insert

            const upsertQuery = `
                INSERT INTO persona_variations (variation_id, user_id, persona_id, module_context, system_prompt, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id, module_context) DO UPDATE SET
                    system_prompt = excluded.system_prompt,
                    updated_at = excluded.updated_at,
                    persona_id = excluded.persona_id -- Ensure persona_id is updated if it changes (though unlikely)
                RETURNING variation_id; -- Return the final variation ID
            `;
            const params = [variationId, userId, personaId, moduleContext, systemPrompt, now, now];

            const result = await dbGet<{ variation_id: string }>(upsertQuery, params);

            if (!result || !result.variation_id) {
                 // Fallback: select the ID if RETURNING failed
                 console.warn(`Variation upsert RETURNING failed for user ${userId}, module ${moduleContext}. Falling back to SELECT.`);
                 const existing = await dbGet<{ variation_id: string }>('SELECT variation_id FROM persona_variations WHERE user_id = ? AND module_context = ?', [userId, moduleContext]);
                 if (!existing || !existing.variation_id) {
                     throw new Error('Failed to save or retrieve variation after upsert.');
                 }
                 return { variationId: existing.variation_id };
            }

            return { variationId: result.variation_id };

        } catch (error: any) {
            console.error(`Error saving variation for user ${userId}, module ${moduleContext}:`, error);
            throw new Error(`Failed to save variation: ${error.message}`);
        }
    }

    /**
     * Retrieves a specific variation for a user and module.
     * @param userId User ID.
     * @param moduleContext Module context.
     * @returns {Promise<PersonaVariation | null>}
     */
    async getVariation(userId: string, moduleContext: string): Promise<PersonaVariation | null> {
         if (!userId || !moduleContext) return null;
         try {
             const variation = await dbGet<PersonaVariation>('SELECT * FROM persona_variations WHERE user_id = ? AND module_context = ?', [userId, moduleContext]);
             return variation || null;
         } catch (error: any) {
              console.error(`Error getting variation for user ${userId}, module ${moduleContext}:`, error);
              return null;
         }
    }
    
     /**
     * Retrieves all variations for a specific user.
     * @param userId User ID.
     * @returns {Promise<PersonaVariation[]>}
     */
    async getAllVariations(userId: string): Promise<PersonaVariation[]> {
         if (!userId) return [];
         try {
             const variations = await dbAll<PersonaVariation>('SELECT * FROM persona_variations WHERE user_id = ? ORDER BY module_context, updated_at DESC', [userId]);
             return variations;
         } catch (error: any) {
              console.error(`Error getting all variations for user ${userId}:`, error);
              return [];
         }
    }

    /**
     * Deletes a specific variation.
     * @param userId User ID.
     * @param moduleContext Module context.
     * @returns {Promise<{ success: boolean; changes: number }>} 
     */
    async deleteVariation(userId: string, moduleContext: string): Promise<{ success: boolean; changes: number }> {
        if (!userId || !moduleContext) return { success: false, changes: 0 };
        try {
            const query = 'DELETE FROM persona_variations WHERE user_id = ? AND module_context = ?';
            const params = [userId, moduleContext];
            const result = await dbRun(query, params);
            return { success: result.changes > 0, changes: result.changes };
        } catch (error: any) {
            console.error(`Error deleting variation for user ${userId}, module ${moduleContext}:`, error);
            throw new Error(`Failed to delete variation: ${error.message}`);
        }
    }
}

export default PersonalityProfileService; 