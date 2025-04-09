import fs from 'fs/promises';
import path from 'path';
import { dbAll } from '../lib/database'; // Only dbAll is needed here
// import AssetProcessor from './assetProcessor'; // Removed unused import
import ClaudeAPI from '../api/claude';
import PromptService from '../services/promptService';

// Define interfaces (or import if moved)
interface Asset {
    asset_id: string;
    user_id: string;
    type: 'text' | 'image' | 'pdf' | 'url' | 'json';
    filepath: string;
    source_platform?: string | null;
    source_medium?: string | null;
    original_filename?: string | null;
    mime_type?: string | null;
    created_at: string;
    metadata?: string | null; // JSON string
}

class AbstractionApproach {
    private claudeAPI: ClaudeAPI;
    // private assetProcessor: AssetProcessor; // Removed unused property
    private promptService: PromptService;

    constructor() {
        this.claudeAPI = new ClaudeAPI();
        // this.assetProcessor = new AssetProcessor(); // Removed unused initialization
        this.promptService = new PromptService();
    }

    /**
     * Gathers content from various asset types, adding source markers.
     * @param assetIds Array of asset IDs.
     * @param userId The user ID to verify asset ownership.
     * @returns Combined text content formatted with source markers.
     */
    private async gatherAssetContent(assetIds: string[], userId: string): Promise<{ textContent: string }> {
        const placeholders = assetIds.map(() => '?').join(',');
        // Fetch source_platform and source_medium along with other fields
        const query = `SELECT asset_id, user_id, type, filepath, source_platform, source_medium, original_filename, mime_type FROM assets WHERE user_id = ? AND asset_id IN (${placeholders})`;
        const assets = await dbAll<Asset>(query, [userId, ...assetIds]);

        if (assets.length !== assetIds.length) {
            console.warn(`Requested ${assetIds.length} assets, but found ${assets.length} owned by user ${userId}.`);
        }

        if (assets.length === 0) {
            throw new Error('No valid assets found for this user. Please select different content.');
        }

        let combinedText = '';
        const assetsDir = path.join(__dirname, '../../data/assets');

        for (const asset of assets) {
            const assetPath = path.join(assetsDir, asset.filepath);
            let content = '';
            let errorMsg = '';
            
            // Add source marker header with more descriptive attributes
            const platform = asset.source_platform || 'unknown';
            const medium = asset.source_medium || 'unknown';
            const filename = asset.original_filename || asset.asset_id;
            const type = asset.type || 'unknown';
            
            // Add more descriptive source markers for Claude to better understand content context
            combinedText += `\n\n<source platform="${platform}" medium="${medium}" type="${type}" filename="${filename}">\n`;

            try {
                switch (asset.type) {
                    case 'text':
                    case 'json':
                    case 'url': // Treat URL/JSON content as text
                        content = await fs.readFile(assetPath, 'utf-8');
                        break;
                    case 'image':
                        // Add more descriptive placeholder for images
                        content = `[This is an image file named "${filename}". Please consider this visual context when creating the prompt, though specific image details can't be extracted.]`; 
                        break;
                    case 'pdf':
                         try {
                             const pdfTextPath = assetPath.replace(/\.pdf$/i, '.txt');
                             content = await fs.readFile(pdfTextPath, 'utf-8');
                         } catch (pdfTextError: any) {
                             if (pdfTextError.code === 'ENOENT') {
                                 content = `[PDF document "${filename}" - Text extraction not available. Please consider this as a referenced document when creating the prompt.]`;
                                 console.warn(`No associated text file found for PDF asset ${asset.asset_id}.`);
                             } else {
                                 throw pdfTextError; // Re-throw other read errors
                             }
                         }
                         break;
                    default:
                        console.warn(`Unhandled asset type: ${asset.type} for asset ${asset.asset_id}`);
                        content = `[Content of type "${asset.type}" - not directly readable]`;
                }
            } catch (error: any) {
                console.error(`Error processing asset ${asset.asset_id} (${assetPath}):`, error.message);
                errorMsg = `[Error processing asset ${filename}: ${error.message}]`;
            }
            
            combinedText += (content || errorMsg);
            combinedText += `\n</source>\n`; // Add closing source marker
        }

        // Return only text content for now
        return { textContent: combinedText }; 
    }

    /**
     * Generates a base system prompt from combined asset content.
     * @param userId User ID.
     * @param assetIds Array of asset IDs.
     * @param customPrompt Optional custom instructions for Claude.
     * @returns The generated base prompt string.
     * @throws Error if generation fails for any reason.
     */
    async generateBasePrompt(userId: string, assetIds: string[], customPrompt?: string | null): Promise<string> {
        if (!userId || !assetIds || assetIds.length === 0) {
            throw new Error('Invalid input: userId and at least one assetId required.');
        }
        
        console.log(`Starting base prompt generation for user ${userId} using ${assetIds.length} assets.`);
        
        try {
            const { textContent } = await this.gatherAssetContent(assetIds, userId);
            
            if (!textContent.trim()) {
                throw new Error('No text content gathered from the selected assets.');
            }
            
            console.log(`Total text content length for prompt gen: ${textContent.length}`);
            console.log(`Formatted Text Snippet for Claude:\n${textContent.substring(0, 500)}${textContent.length > 500 ? '...' : ''}`);
            
            // Generate the prompt using Claude API
            const generatedPromptText = await this.claudeAPI.generateSystemPrompt(textContent, customPrompt || undefined);
            
            if (!generatedPromptText || !generatedPromptText.trim()) {
                throw new Error('Claude API returned an empty or invalid prompt.');
            }
            
            // Save the generated prompt using the PromptService
            await this.promptService.saveBasePrompt(
                userId,
                generatedPromptText,
                { basedOnAssetIds: assetIds } // Pass asset IDs used
            );
            
            console.log(`Successfully saved generated base prompt for user ${userId}.`);
            return generatedPromptText;
            
        } catch (error: any) {
            // Log the error with more context
            console.error(`Error in generateBasePrompt for user ${userId}:`, error);
            
            // Rethrow with a more user-friendly message
            if (error.message.includes('Claude API')) {
                throw new Error(`AI service error: ${error.message}`);
            } else if (error.message.includes('No valid assets')) {
                throw new Error(`Content error: ${error.message}`);
            } else if (error.message.includes('saveBasePrompt')) {
                throw new Error(`Storage error: Failed to save the generated prompt.`);
            } else {
                throw new Error(`Failed to generate base prompt: ${error.message}`);
            }
        }
    }
    
    /**
     * Generates a character card JSON from combined asset content.
     * @param userId User ID.
     * @param assetIds Array of asset IDs.
     * @param customPrompt Optional custom instructions for Claude.
     * @returns The generated character card as JSON, stringified for storage.
     * @throws Error if generation fails for any reason.
     */
    async generateCharacterCard(userId: string, assetIds: string[], customPrompt?: string | null): Promise<string> {
        if (!userId || !assetIds || assetIds.length === 0) {
            throw new Error('Invalid input: userId and at least one assetId required.');
        }
        
        console.log(`Starting character card generation for user ${userId} using ${assetIds.length} assets.`);
        
        try {
            const { textContent } = await this.gatherAssetContent(assetIds, userId);
            
            if (!textContent.trim()) {
                throw new Error('No text content gathered from the selected assets.');
            }
            
            console.log(`Total text content length for character card gen: ${textContent.length}`);
            console.log(`Formatted Text Snippet for Claude:\n${textContent.substring(0, 500)}${textContent.length > 500 ? '...' : ''}`);
            
            // Generate the character card using Claude API
            const characterCard = await this.claudeAPI.generateCharacterCard(textContent, customPrompt || undefined);
            
            if (!characterCard) {
                throw new Error('Claude API failed to generate a valid character card.');
            }
            
            // Convert the character card to a string for storage
            const characterCardString = JSON.stringify(characterCard, null, 2);
            
            // Save the generated character card as the base prompt
            await this.promptService.saveBasePrompt(
                userId,
                characterCardString,
                { 
                    basedOnAssetIds: assetIds,
                    promptName: "Character Card" 
                }
            );
            
            console.log(`Successfully saved generated character card for user ${userId}.`);
            return characterCardString;
            
        } catch (error: any) {
            // Log the error with more context
            console.error(`Error in generateCharacterCard for user ${userId}:`, error);
            
            // Rethrow with a more user-friendly message
            if (error.message.includes('Claude API')) {
                throw new Error(`AI service error: ${error.message}`);
            } else if (error.message.includes('No valid assets')) {
                throw new Error(`Content error: ${error.message}`);
            } else if (error.message.includes('saveBasePrompt')) {
                throw new Error(`Storage error: Failed to save the character card.`);
            } else {
                throw new Error(`Failed to generate character card: ${error.message}`);
            }
        }
    }
}

export default AbstractionApproach; 