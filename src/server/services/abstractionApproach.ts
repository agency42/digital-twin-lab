import fs from 'fs/promises';
import path from 'path';
import { dbAll } from '../lib/database'; // Only dbAll is needed here
// import AssetProcessor from './assetProcessor'; // Removed unused import
import ClaudeAPI from '../api/claude';
import PromptService from '../services/promptService';
import PdfProcessor from '../services/pdfProcessor';

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
    async gatherAssetContent(userId: string, assetIds: string[]): Promise<string> {
        if (!assetIds || assetIds.length === 0) {
            return '';
        }

        // Fetch asset details using the correct column names
        const placeholders = assetIds.map(() => '?').join(',');
        const query = `
            SELECT 
                id, user_id, file_type, file_path, 
                source_platform, source_medium, filename, mime_type 
            FROM assets 
            WHERE user_id = ? AND id IN (${placeholders})
        `;
        const assets = await dbAll<any>(query, [userId, ...assetIds]); // Use correct column names: id

        let combinedContent = '';
        const assetsDir = path.join(__dirname, '../../data/assets'); // Define based relative to dist/services
        const pdfProcessor = new PdfProcessor();

        for (const asset of assets) {
            combinedContent += `\n\n--- Asset Start ---\n`;
            combinedContent += `Asset ID: ${asset.id}\n`; // Use id
            combinedContent += `Filename: ${asset.filename}\n`; // Use filename
            combinedContent += `Type: ${asset.file_type}\n`; // Use file_type
            combinedContent += `Source: ${asset.source_platform || 'unknown'} (${asset.source_medium || 'unknown'})\n`;
            
            const filePath = path.join(assetsDir, asset.file_path); // Use file_path

            try {
                if (asset.file_type === 'text' || asset.file_type === 'json') {
                    const content = await fs.readFile(filePath, 'utf-8');
                    combinedContent += `Content:\n${content}\n`;
                } else if (asset.file_type === 'pdf') {
                    const extractionResult = await pdfProcessor.extractText(filePath);
                    combinedContent += `Content (from PDF):\n${extractionResult.text || '[Error extracting PDF text]'}\n`;
                } else if (asset.file_type === 'image') {
                    // TODO: Implement image description logic later if needed
                    combinedContent += `Content: [Image Asset - ${asset.filename}]\n`; // Placeholder for images
                } else {
                    combinedContent += `Content: [Unsupported asset type: ${asset.file_type}]\n`;
                }
            } catch (error: any) {
                 if (error.code === 'ENOENT') {
                    console.error(`Asset file not found when gathering content: ${filePath}`);
                    combinedContent += `Content: [Error - Asset file not found]\n`;
                 } else {
                    console.error(`Error reading content for asset ${asset.id}:`, error);
                    combinedContent += `Content: [Error reading content - ${error.message}]\n`;
                 }
            }
            combinedContent += `--- Asset End ---\n`;
        }

        return combinedContent;
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
            // Corrected: Use combinedContent directly
            const combinedContent = await this.gatherAssetContent(userId, assetIds);
            
            if (!combinedContent.trim()) { // Use combinedContent
                throw new Error('No text content gathered from the selected assets.');
            }
            
            console.log(`Total text content length for prompt gen: ${combinedContent.length}`); // Use combinedContent
            console.log(`Formatted Text Snippet for Claude:\n${combinedContent.substring(0, 500)}${combinedContent.length > 500 ? '...' : ''}`); // Use combinedContent
            
            // Generate the prompt using Claude API
            const generatedPromptText = await this.claudeAPI.generateSystemPrompt(combinedContent, customPrompt || undefined); // Use combinedContent
            
            if (!generatedPromptText || !generatedPromptText.trim()) {
                throw new Error('Claude API returned an empty or invalid prompt.');
            }
            
            // NOTE: Base prompt is no longer saved directly here, only returned.
            console.warn("generateBasePrompt is deprecated. Character card generation should be used instead.")
            return generatedPromptText; // Return the text
            
        } catch (error: any) {
            // Log the error with more context
            console.error(`Error in generateBasePrompt for user ${userId}:`, error);
            
            // Rethrow with a more user-friendly message
            if (error.message.includes('Claude API')) {
                throw new Error(`AI service error: ${error.message}`);
            } else if (error.message.includes('No valid assets') || error.message.includes('No text content')) {
                throw new Error(`Content error: ${error.message}`);
            } else {
                throw new Error(`Failed to generate base prompt: ${error.message}`);
            }
        }
    }
    
    /**
     * Generates a character card for a user based on selected asset IDs.
     * Gathers content, calls Claude API, validates JSON, and saves the card.
     * @param userId The user ID.
     * @param assetIds Array of asset IDs to use as source material.
     * @param customPrompt Optional custom prompt for Claude.
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
            // Corrected: Use combinedContent directly
            const combinedContent = await this.gatherAssetContent(userId, assetIds);
            
            if (!combinedContent.trim()) { // Use combinedContent
                throw new Error('No text content gathered from the selected assets.');
            }
            
            console.log(`Total text content length for character card gen: ${combinedContent.length}`); // Use combinedContent
            console.log(`Formatted Text Snippet for Claude:\n${combinedContent.substring(0, 500)}${combinedContent.length > 500 ? '...' : ''}`); // Use combinedContent

            // 2. Generate the character card using Claude API 
            //    (Template is loaded within claudeApi.generateCharacterCard)
            const generatedCardData = await this.claudeAPI.generateCharacterCard(
                combinedContent, 
                customPrompt || undefined // Pass only inputText and optional customPrompt
            );

            // 3. Validate and parse the generated card data
            if (!generatedCardData || typeof generatedCardData !== 'object') {
                throw new Error('Claude API returned invalid or empty data for character card.');
            }
            
            // Ensure we have a string representation for saving/returning
            const generatedCardDataString = JSON.stringify(generatedCardData, null, 2);

            // 4. Save the generated character card using the updated service method
            await this.promptService.saveCharacterCard(
                userId,
                generatedCardDataString, // Pass the validated stringified JSON
                { 
                    basedOnAssetIds: assetIds,
                    cardName: "Generated Card" // Example name, adjust as needed
                }
            );
            
            console.log(`Successfully saved generated character card for user ${userId}.`);
            return generatedCardDataString; // Return the validated string
            
        } catch (error: any) {
            console.error(`Error in generateCharacterCard for user ${userId}:`, error);
            // Re-throw a more specific error or handle it
            throw new Error(`Failed to generate character card: ${error.message}`);
        }
    }
}

export default AbstractionApproach; 