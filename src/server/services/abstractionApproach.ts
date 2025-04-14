import fs from 'fs/promises';
import path from 'path';
import { dbAll } from '../lib/database'; // Only dbAll is needed here
// import AssetProcessor from './assetProcessor'; // Removed unused import
import ClaudeAPI from '../api/claude';
import PromptService from '../services/promptService';
import PdfProcessor from '../services/pdfProcessor';
import { v4 as uuidv4 } from 'uuid';
import { dbGet } from '../lib/database';

// Define interfaces (or import if moved)
interface Asset {
    id: string;
    content: string;
    source_platform?: string;
    source_medium?: string;
    mime_type?: string;
    file_type: string;
}

interface AssetContent {
    assetId: string;
    content: string;
    source_platform?: string;
    source_medium?: string;
    // Add other metadata fields as needed
}

// Template for system prompts in the database
interface SystemPromptTemplate {
    id?: string;
    prompt_text: string;
    type?: string;
}

class AbstractionApproach {
    private claudeAPI: ClaudeAPI;
    // private assetProcessor: AssetProcessor; // Removed unused property
    private promptService: PromptService;
    private templatePath: string;

    constructor(claudeAPI?: ClaudeAPI) {
        this.claudeAPI = claudeAPI || new ClaudeAPI();
        // this.assetProcessor = new AssetProcessor(); // Removed unused initialization
        this.promptService = new PromptService();
        this.templatePath = path.join(__dirname, '../../data/character_card_template.json');
    }

    /**
     * Gathers and combines content from selected assets.
     * 
     * @param userId User ID.
     * @param assetIds Array of asset IDs.
     * @returns Combined content with metadata.
     */
    private async gatherAssetContent(userId: string, assetIds: string[]): Promise<string> {
        console.log(`Gathering content for user ${userId} from ${assetIds.length} assets.`);
        
        try {
            // First, check user existence
            const userExists = await dbGet('SELECT user_id FROM users WHERE user_id = ?', [userId]);
            if (!userExists) {
                throw new Error(`User ${userId} not found.`);
            }
            
            // Fetch asset data with content and metadata
            const assets = await dbAll<Asset>(`
                SELECT 
                    id, 
                    content, 
                    source_platform,
                    source_medium,
                    mime_type,
                    file_type
                FROM assets 
                WHERE user_id = ? AND id IN (${assetIds.map(() => '?').join(',')})
            `, [userId, ...assetIds]);
            
            console.log(`Found ${assets.length} of ${assetIds.length} requested assets.`);
            
            if (assets.length === 0) {
                throw new Error('No assets found for the given IDs.');
            }
            
            // Process and combine the content
            const contents: AssetContent[] = assets
                .filter(asset => asset.content && asset.content.trim() !== '' && (asset.file_type === 'text' || asset.mime_type?.startsWith('text/')))
                .map(asset => ({
                    assetId: asset.id,
                    content: asset.content,
                    source_platform: asset.source_platform,
                    source_medium: asset.source_medium
                }));
            
            if (contents.length === 0) {
                throw new Error('No text content found in the selected assets.');
            }
            
            // Create a formatted text with source markers
            let formattedText = '';
            for (const item of contents) {
                const platformMarker = item.source_platform ? ` platform='${item.source_platform}'` : '';
                const mediumMarker = item.source_medium ? ` medium='${item.source_medium}'` : '';
                
                if (item.source_platform || item.source_medium) {
                    formattedText += `<source${platformMarker}${mediumMarker}>\n`;
                    formattedText += item.content.trim() + '\n';
                    formattedText += '</source>\n\n';
                } else {
                    formattedText += item.content.trim() + '\n\n';
                }
            }
            
            return formattedText;
        } catch (error: any) {
            console.error(`Error gathering asset content:`, error.message);
            throw new Error(`Failed to gather content from assets: ${error.message}`);
        }
    }

    /**
     * Loads the character card template either from the database or file
     * @returns The template as a string
     */
    private async loadCardTemplate(): Promise<string> {
        try {
            // First try to get template from database
            const templateQuery = await dbGet<SystemPromptTemplate>(
                `SELECT prompt_text FROM system_prompts WHERE type = 'character_card_template' LIMIT 1`
            );
            
            if (templateQuery && templateQuery.prompt_text) {
                return templateQuery.prompt_text;
            }
            
            // Fallback to file
            const fileContent = await fs.readFile(this.templatePath, 'utf8');
            return fileContent;
        } catch (error) {
            console.error('Error loading character card template:', error);
            // Return a default template structure if everything fails
            return JSON.stringify({
                "entity": { "form": "human" },
                "personality": { 
                    "core_traits": [{ "trait": "", "strength": 0.0 }],
                    "big_five": {}
                },
                "voice": { "style": "", "qualities": [] },
                "relationship": {},
                "platform_adaptations": {}
            }, null, 2);
        }
    }

    /**
     * Loads the template prompt for character card generation from the database
     * @returns The system prompt template to use for generation
     */
    private async loadGenerationPrompt(): Promise<string> {
        try {
            // Try to get the prompt from database
            const promptQuery = await dbGet<SystemPromptTemplate>(
                `SELECT prompt_text FROM system_prompts WHERE type = 'character_card_generation' LIMIT 1`
            );
            
            if (promptQuery && promptQuery.prompt_text) {
                return promptQuery.prompt_text;
            }
            
            // Fallback to a default prompt if not in database
            return `Analyze the following text which represents writings and information about a person. Based *only* on this text, generate a structured JSON object representing their personality profile. The JSON object should follow the provided template structure. Ensure the output is ONLY the JSON object, starting with { and ending with }.`;
        } catch (error) {
            console.error('Error loading generation prompt:', error);
            return `Analyze the following text and generate a character profile JSON.`;
        }
    }

    /**
     * Generates a character card for a user based on selected asset IDs.
     * Now uses templates from the database rather than hardcoded ones.
     * 
     * @param userId The user ID.
     * @param assetIds Array of asset IDs to use as source material.
     * @param customPrompt Optional custom prompt for generation.
     * @returns The stringified JSON of the generated character card.
     */
    async generateCharacterCard(userId: string, assetIds: string[], customPrompt?: string): Promise<string> {
        if (!userId) {
            throw new Error('User ID is required to generate a character card.');
        }
        if (!assetIds || assetIds.length === 0) {
            throw new Error('At least one asset ID must be provided to generate a character card.');
        }

        console.log(`Generating character card for ${userId} using ${assetIds.length} assets.`);

        try {
            // 1. Gather the content from assets
            const combinedContent = await this.gatherAssetContent(userId, assetIds);
            
            if (!combinedContent.trim()) {
                throw new Error('No text content gathered from the selected assets.');
            }
            
            console.log(`Total text content length for character card gen: ${combinedContent.length}`);
            console.log(`Formatted Text Snippet for Claude:\n${combinedContent.substring(0, 500)}${combinedContent.length > 500 ? '...' : ''}`);

            // 2. Load the card template and generation prompt from database
            const cardTemplate = await this.loadCardTemplate();
            const generationPrompt = await this.loadGenerationPrompt();
            
            // 3. Create the system prompt with template
            const systemPrompt = customPrompt || `${generationPrompt}\n\nTemplate structure:\n${cardTemplate}`;
            
            // 4. Generate the character card using Claude API
            const responseText = await this.claudeAPI.generateCompletion(
                `Here is the text about the person, potentially from multiple sources:\n\n${combinedContent}\n\nGenerate the character card JSON according to the instructions provided.`,
                { 
                    system: systemPrompt,
                    max_tokens: 4096,
                    temperature: 0.7
                }
            ) as string;

            // 5. Validate and parse the generated card data
            if (!responseText || typeof responseText !== 'string') {
                throw new Error('Claude API returned invalid or empty data for character card.');
            }
            
            let generatedCardData;
            try {
                generatedCardData = JSON.parse(responseText.trim());
                // Ensure it's an object
                if (typeof generatedCardData !== 'object' || generatedCardData === null) {
                    throw new Error('Generated content is not a valid JSON object');
                }
            } catch (parseError) {
                console.error('Failed to parse Claude response as JSON:', parseError);
                console.log('Raw response:', responseText);
                throw new Error('Generated content is not valid JSON');
            }
            
            // Ensure we have a string representation for saving/returning
            const generatedCardDataString = JSON.stringify(generatedCardData, null, 2);

            // 6. Save the generated character card
            await this.promptService.saveCharacterCard(
                userId,
                generatedCardDataString,
                { 
                    basedOnAssetIds: assetIds,
                    cardName: "Generated Card"
                }
            );
            
            console.log(`Successfully saved generated character card for user ${userId}.`);
            return generatedCardDataString;
            
        } catch (error: any) {
            console.error(`Error in generateCharacterCard for user ${userId}:`, error);
            throw new Error(`Failed to generate character card: ${error.message}`);
        }
    }

    /**
     * Legacy method for backwards compatibility. 
     * Now just calls generateCharacterCard to ensure consistency.
     */
    async generateBasePrompt(userId: string, assetIds: string[], customPrompt?: string | null): Promise<string> {
        console.warn("generateBasePrompt is deprecated. Using generateCharacterCard instead.");
        const cardJson = await this.generateCharacterCard(userId, assetIds, customPrompt || undefined);
        return cardJson;
    }
}

export default AbstractionApproach; 