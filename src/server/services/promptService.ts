import { dbRun, dbGet, dbAll } from '../lib/database';
import { v4 as uuidv4 } from 'uuid';
// import { logger } from '../lib/logger'; // Assume logger is set up - REMOVED FOR NOW

// Basic logger replacement
const logger = {
    info: console.log,
    warn: console.warn,
    error: console.error
};

// Interfaces for the new schema
interface CharacterCard {
    id: string;
    user_id: string;
    card_name?: string | null;
    card_data: string; // JSON string
    is_current: number; // 0 or 1
    based_on_assets?: string | null; // JSON string of asset IDs
    created_at: string;
    updated_at: string;
}

interface SystemPrompt {
    id: string;
    user_id: string;
    type: 'chat' | 'post';
    prompt_text: string;
    is_custom: number; // 0 or 1
    created_at: string;
    updated_at: string;
}

interface InstructionTemplate {
    id: string;
    user_id: string;
    type: 'chat' | 'post';
    instruction_text: string;
    created_at: string;
    updated_at: string;
}

interface SaveCharacterCardOptions {
    cardName?: string;
    basedOnAssetIds?: string[];
}

interface GenerationsData {
    characterCard: CharacterCard | null;
    systemPrompt: SystemPrompt | null;
    instructionTemplate: InstructionTemplate | null;
}

// Add new interface for instruction template options
interface InstructionTemplateOptions {
    mainGoal?: string;
    examples?: string[];
}

// Add new interface for the expanded instruction template DB storage
interface InstructionTemplateExpanded extends InstructionTemplate {
    metadata?: string; // JSON string for storing mainGoal and examples
}

// Add new interface for instruction template with metadata
interface InstructionTemplateWithMetadata extends InstructionTemplate {
    mainGoal?: string;
    examples?: string[];
}

/**
 * Service for managing character cards, system prompts, and instructions.
 */
class PromptService {

    constructor() {}

    /**
     * Saves a new character card for a user, marking it as current and others as not current.
     * Also ensures default system prompts and instructions are created/updated.
     * @param userId 
     * @param cardData Stringified JSON of the character card
     * @param options Optional parameters like card name and source asset IDs
     * @returns The saved character card record.
     */
    async saveCharacterCard(userId: string, cardData: string, options: SaveCharacterCardOptions = {}): Promise<CharacterCard> {
        const { cardName = 'Character Card', basedOnAssetIds = [] } = options;
        const newCardId = uuidv4();
        const now = new Date().toISOString();
        const basedOnAssetsJson = JSON.stringify(basedOnAssetIds);

        // Use transaction for multiple steps
        await dbRun('BEGIN TRANSACTION;');

        try {
            // 1. Set all existing cards for this user to is_current = 0
            await dbRun('UPDATE character_cards SET is_current = 0 WHERE user_id = ?', [userId]);

            // 2. Insert the new character card with is_current = 1 using 'id' column
            const insertQuery = `
                INSERT INTO character_cards (id, user_id, card_name, card_data, is_current, based_on_assets, created_at, updated_at)
                VALUES (?, ?, ?, ?, 1, ?, ?, ?)
            `;
            await dbRun(insertQuery, [
                newCardId,
                userId,
                cardName,
                cardData,
                basedOnAssetsJson,
                now,
                now
            ]);

            // 3. Fetch the newly inserted card using 'id'
            const newCard = await dbGet<CharacterCard>('SELECT * FROM character_cards WHERE id = ?', [newCardId]);
            if (!newCard) {
                throw new Error('Failed to retrieve character card immediately after insertion.');
            }

            // 4. Update the user's current_character_card_id (Optional, depending on if users table has this column)
            // await dbRun('UPDATE users SET current_character_card_id = ? WHERE user_id = ?', [newCardId, userId]);

            // 5. Ensure default system prompts and instructions exist/are updated
            // Pass the actual card data string to the helper function
            await this.ensureDefaultPromptsAndInstructions(userId, newCard.card_data);

            // Commit transaction
            await dbRun('COMMIT;');
            logger.info(`Successfully saved new character card ${newCardId} for user ${userId}`);
            return newCard;

        } catch (error: any) {
            // Rollback transaction on error
            await dbRun('ROLLBACK;');
            logger.error(`Error saving character card for user ${userId}:`, error);
            throw new Error(`Failed to save character card: ${error.message}`);
        }
    }

     /**
     * Ensure default system prompts and instruction templates exist for a user.
     * If they exist and are not custom, update them to match the latest card data.
     * @param userId 
     * @param characterCardData 
     */
     private async ensureDefaultPromptsAndInstructions(userId: string, characterCardData: string): Promise<void> {
        const promptTypes: ('chat' | 'post')[] = ['chat', 'post'];
        const now = new Date().toISOString();

        for (const type of promptTypes) {
            // Ensure system prompt
            const upsertPromptQuery = `
                INSERT INTO system_prompts (id, user_id, type, prompt_text, is_custom, created_at, updated_at)
                VALUES (?, ?, ?, ?, 0, ?, ?)
                ON CONFLICT(user_id, type) DO UPDATE SET
                    prompt_text = CASE WHEN is_custom = 0 THEN excluded.prompt_text ELSE prompt_text END,
                    updated_at = excluded.updated_at
                WHERE is_custom = 0; -- Only update if not custom
            `;
            await dbRun(upsertPromptQuery, [uuidv4(), userId, type, characterCardData, now, now]);

            // Ensure instruction template
            const defaultInstruction = this.getDefaultInstructionText(type);
            const upsertInstructionQuery = `
                INSERT INTO instruction_templates (id, user_id, type, instruction_text, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id, type) DO NOTHING; -- Don't overwrite existing instructions
            `;
            await dbRun(upsertInstructionQuery, [uuidv4(), userId, type, defaultInstruction, now, now]);
        }
        logger.info(`Ensured default prompts and instructions for user ${userId}`);
    }

    private getDefaultInstructionText(type: 'chat' | 'post'): string {
        if (type === 'chat') {
            return "Engage in a helpful and informative conversation.";
        }
        return "Generate content for a specific platform (e.g., Twitter, LinkedIn, Blog). Specify platform requirements in your instructions, such as 'Create a tweet under 280 characters' or 'Write a professional LinkedIn post'.";
    }

    /**
     * Retrieves the current character card for a user.
     * @param userId The user ID.
     * @returns {Promise<CharacterCard | null>} The current card or null.
     */
    async getCurrentCharacterCard(userId: string): Promise<CharacterCard | null> {
        try {
            const card = await dbGet<CharacterCard>('SELECT * FROM character_cards WHERE user_id = ? AND is_current = 1', [userId]);
            return card || null;
        } catch (error: any) {
            logger.error(`Error getting current character card for user ${userId}:`, error);
            return null;
        }
    }
    
     /**
     * Retrieves the data needed for the Generations tab.
     * @param userId 
     * @param type 
     * @returns {Promise<GenerationsData>}
     */
     async getGenerationsData(userId: string, type: 'chat' | 'post'): Promise<GenerationsData> {
        try {
            const characterCard = await this.getCurrentCharacterCard(userId);
            const systemPrompt = await this.getSystemPrompt(userId, type);
            const instructionTemplate = await this.getInstructionTemplate(userId, type);
            
             // If system prompt is missing, create a default one based on current card
            let finalSystemPrompt = systemPrompt;
            if (!finalSystemPrompt && characterCard) {
                logger.warn(`No system prompt found for ${userId}/${type}, creating default.`);
                await this.ensureDefaultPromptsAndInstructions(userId, characterCard.card_data);
                finalSystemPrompt = await this.getSystemPrompt(userId, type);
            }

            // If instruction template is missing, create a default one
            let finalInstructionTemplate = instructionTemplate;
             if (!finalInstructionTemplate) {
                logger.warn(`No instruction template found for ${userId}/${type}, creating default.`);
                 await this.ensureDefaultPromptsAndInstructions(userId, characterCard?.card_data || ''); // Need card data even if prompt exists
                finalInstructionTemplate = await this.getInstructionTemplate(userId, type);
            }

            return {
                characterCard,
                systemPrompt: finalSystemPrompt,
                instructionTemplate: finalInstructionTemplate,
            };
        } catch (error: any) {
            logger.error(`Error fetching generations data for user ${userId}, type ${type}:`, error);
            throw error; // Re-throw error to be handled by the route
        }
    }

    /**
     * Retrieves a specific system prompt.
     * @param userId 
     * @param type 
     * @returns 
     */
    async getSystemPrompt(userId: string, type: 'chat' | 'post'): Promise<SystemPrompt | null> {
        try {
            const prompt = await dbGet<SystemPrompt>('SELECT * FROM system_prompts WHERE user_id = ? AND type = ?', [userId, type]);
            return prompt || null;
        } catch (error: any) {
            logger.error(`Error getting system prompt for user ${userId}, type ${type}:`, error);
            return null;
        }
    }

    /**
     * Retrieves an instruction template for a user and type.
     * @param userId The user ID.
     * @param type The template type ('chat' or 'post').
     * @returns {Promise<InstructionTemplate | null>} The template or null.
     */
    async getInstructionTemplate(userId: string, type: 'chat' | 'post'): Promise<InstructionTemplateWithMetadata | null> {
        try {
            const template = await dbGet<InstructionTemplateExpanded>(
                'SELECT * FROM instruction_templates WHERE user_id = ? AND type = ?',
                [userId, type]
            );
            
            if (!template) {
                return null;
            }
            
            // Process metadata if it exists
            let mainGoal: string | undefined;
            let examples: string[] | undefined;
            
            if (template.metadata) {
                try {
                    const metadataObj = JSON.parse(template.metadata);
                    mainGoal = metadataObj.mainGoal || undefined;
                    examples = Array.isArray(metadataObj.examples) ? metadataObj.examples : undefined;
                } catch (e) {
                    logger.warn(`Failed to parse metadata for instruction template ${template.id}: ${e}`);
                    // Continue without the metadata
                }
            }
            
            // Return the template with metadata fields if available
            return {
                id: template.id,
                user_id: template.user_id,
                type: template.type,
                instruction_text: template.instruction_text,
                created_at: template.created_at,
                updated_at: template.updated_at,
                mainGoal,
                examples
            };
        } catch (error: any) {
            logger.error(`Error getting instruction template for ${userId}/${type}:`, error);
            return null;
        }
    }

    /**
     * Saves/Updates a system prompt, marking it as custom if it differs from the current character card.
     * @param userId 
     * @param type 
     * @param promptText 
     * @returns 
     */
    async saveSystemPrompt(userId: string, type: 'chat' | 'post', promptText: string): Promise<SystemPrompt> {
        const now = new Date().toISOString();
        const currentCard = await this.getCurrentCharacterCard(userId);
        const isCustom = (currentCard && currentCard.card_data !== promptText) ? 1 : 0;

        const upsertQuery = `
            INSERT INTO system_prompts (id, user_id, type, prompt_text, is_custom, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, type) DO UPDATE SET
                prompt_text = excluded.prompt_text,
                is_custom = excluded.is_custom,
                updated_at = excluded.updated_at
            RETURNING *;
        `;
        const params = [uuidv4(), userId, type, promptText, isCustom, now, now];

        try {
            const savedPrompt = await dbGet<SystemPrompt>(upsertQuery, params);
            if (!savedPrompt) {
                throw new Error('Failed to save system prompt.');
            }
            logger.info(`Saved system prompt for ${userId}/${type}, custom: ${isCustom}`);
            return savedPrompt;
        } catch (error: any) {
            logger.error(`Error saving system prompt for ${userId}/${type}:`, error);
            throw new Error(`Failed to save system prompt: ${error.message}`);
        }
    }

    /**
     * Resets a system prompt to match the current character card.
     * @param userId 
     * @param type 
     * @returns 
     */
     async resetSystemPrompt(userId: string, type: 'chat' | 'post'): Promise<SystemPrompt | null> {
        const currentCard = await this.getCurrentCharacterCard(userId);
        if (!currentCard) {
            throw new Error('Cannot reset prompt: No current character card found.');
        }
        // Use saveSystemPrompt to update/insert with is_custom = 0
        return this.saveSystemPrompt(userId, type, currentCard.card_data);
    }

    /**
     * Saves or updates an instruction template for a user.
     * @param userId The user ID.
     * @param type The template type ('chat' or 'post').
     * @param instructionText The instruction text.
     * @param options Optional parameters including mainGoal and examples
     * @returns {Promise<InstructionTemplate>} The saved template.
     */
    async saveInstructionTemplate(
        userId: string, 
        type: 'chat' | 'post', 
        instructionText: string,
        options: InstructionTemplateOptions = {}
    ): Promise<InstructionTemplate> {
        const now = new Date().toISOString();
        
        // Create metadata JSON if we have mainGoal or examples
        let metadata: string | null = null;
        if (options.mainGoal || (options.examples && options.examples.length > 0)) {
            metadata = JSON.stringify({
                mainGoal: options.mainGoal || null,
                examples: options.examples || []
            });
        }
        
        // Check if we need to add the metadata column first
        await this.ensureMetadataColumn();
        
        const upsertQuery = `
            INSERT INTO instruction_templates (id, user_id, type, instruction_text, metadata, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, type) DO UPDATE SET
                instruction_text = excluded.instruction_text,
                metadata = excluded.metadata,
                updated_at = excluded.updated_at
            RETURNING *;
        `;
        const params = [uuidv4(), userId, type, instructionText, metadata, now, now];

        try {
            const savedTemplate = await dbGet<InstructionTemplateExpanded>(upsertQuery, params);
            if (!savedTemplate) {
                throw new Error('Failed to save instruction template.');
            }
            logger.info(`Saved instruction template for ${userId}/${type}`);
            
            // Return a standardized version without the metadata field
            return {
                id: savedTemplate.id,
                user_id: savedTemplate.user_id,
                type: savedTemplate.type,
                instruction_text: savedTemplate.instruction_text,
                created_at: savedTemplate.created_at,
                updated_at: savedTemplate.updated_at
            };
        } catch (error: any) {
            logger.error(`Error saving instruction template for ${userId}/${type}:`, error);
            throw new Error(`Failed to save instruction template: ${error.message}`);
        }
    }

    /**
     * Ensures the metadata column exists in the instruction_templates table.
     * This is to support backward compatibility with existing tables.
     */
    private async ensureMetadataColumn(): Promise<void> {
        try {
            // Check if the column exists
            const tableInfo = await dbAll('PRAGMA table_info(instruction_templates)');
            const hasMetadataColumn = tableInfo.some((col: any) => col.name === 'metadata');
            
            if (!hasMetadataColumn) {
                logger.info('Adding metadata column to instruction_templates table');
                await dbRun('ALTER TABLE instruction_templates ADD COLUMN metadata TEXT');
            }
        } catch (error) {
            logger.error('Failed to ensure metadata column:', error);
            // Continue without failing - worst case, we won't store metadata
        }
    }
}

export default PromptService; 