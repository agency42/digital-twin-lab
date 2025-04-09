import { dbRun, dbGet, dbAll } from '../lib/database';
import { v4 as uuidv4 } from 'uuid';

// Interfaces using new terminology
interface BasePrompt {
    base_prompt_id: string;
    user_id: string;
    prompt_name?: string | null;
    prompt_text: string; // Stores the actual prompt string
    based_on_assets?: string | null; // JSON string of asset IDs
    created_at: string;
    updated_at: string;
}

interface PromptVariation {
    variation_id: string;
    user_id: string;
    base_prompt_id: string;
    module_context: string;
    system_prompt_override: string | null; // Prompt override text
    created_at: string;
    updated_at: string;
}

interface SavePromptOptions {
    promptName?: string;
    basedOnAssetIds?: string[];
}

/**
 * Service for managing base prompts and variations.
 */
class PromptService {

    constructor() {}

    /**
     * Saves or updates the base prompt for a user.
     * @param userId The user ID.
     * @param promptText The base system prompt text.
     * @param options Optional data like name and asset IDs.
     * @returns {Promise<BasePrompt>} The saved or updated prompt data.
     */
    async saveBasePrompt(userId: string, promptText: string, options: SavePromptOptions = {}): Promise<BasePrompt> {
        const basePromptId = uuidv4(); // Generate new ID for potential insert
        const now = new Date().toISOString();
        const basedOnAssetsJson = options.basedOnAssetIds ? JSON.stringify(options.basedOnAssetIds) : null;
        const promptName = options.promptName || null;

        const upsertQuery = `
            INSERT INTO base_prompts (base_prompt_id, user_id, prompt_name, prompt_text, based_on_assets, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                prompt_name = excluded.prompt_name,
                prompt_text = excluded.prompt_text,
                based_on_assets = excluded.based_on_assets,
                updated_at = excluded.updated_at
            RETURNING *;
        `;
        const params = [basePromptId, userId, promptName, promptText, basedOnAssetsJson, now, now];

        try {
            const savedOrUpdatedPrompt = await dbGet<BasePrompt>(upsertQuery, params);
            if (!savedOrUpdatedPrompt) {
                 console.warn(`Upsert RETURNING failed for base_prompt user ${userId}, attempting fallback SELECT.`);
                 const existingPrompt = await dbGet<BasePrompt>('SELECT * FROM base_prompts WHERE user_id = ?', [userId]);
                 if (!existingPrompt) {
                     throw new Error('Failed to save or retrieve base prompt after upsert.');
                 }
                 await dbRun('UPDATE users SET base_prompt_id = ? WHERE user_id = ?', [existingPrompt.base_prompt_id, userId]);
                 return existingPrompt;
            }
            await dbRun('UPDATE users SET base_prompt_id = ? WHERE user_id = ?', [savedOrUpdatedPrompt.base_prompt_id, userId]);
            return savedOrUpdatedPrompt;
        } catch (error: any) {
            console.error(`Error in saveBasePrompt for user ${userId}:`, error);
            throw new Error(`Failed to save base prompt: ${error.message}`);
        }
    }

    /**
     * Retrieves the base prompt for a user.
     * @param userId The user ID.
     * @returns {Promise<BasePrompt | null>} The base prompt or null if not found.
     */
    async getUserBasePrompt(userId: string): Promise<BasePrompt | null> {
        try {
            const prompt = await dbGet<BasePrompt>('SELECT * FROM base_prompts WHERE user_id = ?', [userId]);
            return prompt || null;
        } catch (error: any) {
            console.error(`Error getting base prompt for user ${userId}:`, error);
            return null;
        }
    }
    
    /**
     * Deletes the base prompt for a user.
     * @param userId The user ID.
     * @returns {Promise<{ success: boolean; message?: string; changes?: number }>} Result object.
     */
    async deleteBasePrompt(userId: string): Promise<{ success: boolean; message?: string; changes?: number }> {
        try {
            const result = await dbRun('DELETE FROM base_prompts WHERE user_id = ?', [userId]);
            if (result.changes > 0) {
                 await dbRun('UPDATE users SET base_prompt_id = NULL WHERE user_id = ?', [userId]);
                 return { success: true, changes: result.changes };
            } else {
                 return { success: true, message: 'No base prompt found to delete.', changes: 0 };
            }
        } catch (error: any) {
            console.error(`Error deleting base prompt for user ${userId}:`, error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Saves or updates a module-specific prompt variation override.
     * @param userId The user ID.
     * @param moduleContext The module context (e.g., 'chat', 'assessment').
     * @param systemPromptOverride The overriding prompt text for this context.
     * @returns {Promise<{ variationId: string }>} The ID of the saved/updated variation.
     */
    async saveVariation(userId: string, moduleContext: string, systemPromptOverride: string | null): Promise<{ variationId: string }> {
        if (!userId || !moduleContext) {
            throw new Error('User ID and module context are required to save a variation.');
        }
        try {
            const basePrompt = await this.getUserBasePrompt(userId);
            if (!basePrompt) {
                throw new Error('Cannot save variation: Base prompt not found for user.');
            }
            const basePromptId = basePrompt.base_prompt_id;
            const now = new Date().toISOString();
            const variationId = uuidv4();

            const upsertQuery = `
                INSERT INTO prompt_variations (variation_id, user_id, base_prompt_id, module_context, system_prompt_override, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id, module_context) DO UPDATE SET
                    system_prompt_override = excluded.system_prompt_override,
                    updated_at = excluded.updated_at,
                    base_prompt_id = excluded.base_prompt_id
                RETURNING variation_id;
            `;
            const params = [variationId, userId, basePromptId, moduleContext, systemPromptOverride, now, now];
            const result = await dbGet<{ variation_id: string }>(upsertQuery, params);

            if (!result || !result.variation_id) {
                 console.warn(`Variation upsert RETURNING failed for user ${userId}, module ${moduleContext}. Falling back to SELECT.`);
                 const existing = await dbGet<{ variation_id: string }>('SELECT variation_id FROM prompt_variations WHERE user_id = ? AND module_context = ?', [userId, moduleContext]);
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
     * @returns {Promise<PromptVariation | null>}
     */
    async getVariation(userId: string, moduleContext: string): Promise<PromptVariation | null> {
         if (!userId || !moduleContext) return null;
         try {
             const variation = await dbGet<PromptVariation>('SELECT * FROM prompt_variations WHERE user_id = ? AND module_context = ?', [userId, moduleContext]);
             return variation || null;
         } catch (error: any) {
              console.error(`Error getting variation for user ${userId}, module ${moduleContext}:`, error);
              return null;
         }
    }
    
     /**
     * Retrieves all variations for a specific user.
     * @param userId User ID.
     * @returns {Promise<PromptVariation[]>}
     */
    async getAllVariations(userId: string): Promise<PromptVariation[]> {
         if (!userId) return [];
         try {
             const variations = await dbAll<PromptVariation>('SELECT * FROM prompt_variations WHERE user_id = ? ORDER BY module_context, updated_at DESC', [userId]);
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
        if (!userId || !moduleContext) {
             console.warn('Attempted deleteVariation with missing userId or moduleContext');
             return { success: false, changes: 0 };
        }
        try {
            const query = 'DELETE FROM prompt_variations WHERE user_id = ? AND module_context = ?';
            const params = [userId, moduleContext];
            const result = await dbRun(query, params);
            return { success: true, changes: result.changes }; 
        } catch (error: any) {
            console.error(`Error during DB operation in deleteVariation for user ${userId}, module ${moduleContext}:`, error);
            return { success: false, changes: 0 }; 
        }
    }
}

// Rename the export
export default PromptService; 