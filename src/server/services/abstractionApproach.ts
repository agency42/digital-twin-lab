import fs from 'fs/promises';
import path from 'path';
import { dbAll } from '../lib/database'; // Only dbAll is needed here
// import AssetProcessor from './assetProcessor'; // Removed unused import
import ClaudeAPI from '../api/claude';
// import PromptService from '../services/promptService';
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

class AbstractionApproach {
    private claudeAPI: ClaudeAPI;
    // private assetProcessor: AssetProcessor; // Removed unused property
    private templatePath: string;

    constructor(claudeAPI?: ClaudeAPI) {
        this.claudeAPI = claudeAPI || new ClaudeAPI();
        // this.assetProcessor = new AssetProcessor(); // Removed unused initialization
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
            const assets = await dbAll<Asset>(
                `
                SELECT 
                    id, 
                    content, 
                    source_platform,
                    source_medium,
                    mime_type,
                    file_type
                FROM assets 
                WHERE user_id = ? AND id IN (${assetIds.map(() => '?').join(',')})
            `,
                [userId, ...assetIds]
            );

            console.log(`Found ${assets.length} of ${assetIds.length} requested assets.`);

            if (assets.length === 0) {
                throw new Error('No assets found for the given IDs.');
            }

            // Process and combine the content
            const contents: AssetContent[] = assets
                .filter(
                    (asset) =>
                        asset.content &&
                        asset.content.trim() !== '' &&
                        (asset.file_type === 'text' || asset.mime_type?.startsWith('text/'))
                )
                .map((asset) => ({
                    assetId: asset.id,
                    content: asset.content,
                    source_platform: asset.source_platform,
                    source_medium: asset.source_medium,
                }));

            if (contents.length === 0) {
                throw new Error('No text content found in the selected assets.');
            }

            // Create a formatted text with source markers
            let formattedText = '';
            for (const item of contents) {
                const platformMarker = item.source_platform
                    ? ` platform='${item.source_platform}'`
                    : '';
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
     * Loads the template structure from a file and combines it with the user's prompt.
     *
     * @param userId The user ID.
     * @param assetIds Array of asset IDs to use as source material.
     * @param customPrompt Optional custom prompt for generation.
     * @returns The stringified JSON of the generated character card.
     */
    async generateCharacterCard(
        userId: string,
        assetIds: string[],
        customPrompt?: string
    ): Promise<string> {
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

            console.log(
                `Total text content length for character card gen: ${combinedContent.length}`
            );
            console.log(
                `Formatted Text Snippet for Claude:\n${combinedContent.substring(0, 500)}${
                    combinedContent.length > 500 ? '...' : ''
                }`
            );

            // 2. Load the template structure from file
            let templateJsonString = '';
            try {
                templateJsonString = await fs.readFile(this.templatePath, 'utf8');
            } catch (err) {
                console.error(`Error reading template file ${this.templatePath}:`, err);
                throw new Error('Could not load character card template structure.');
            }

            // 3. Use the user-provided prompt or a default if not provided
            const analysisInstruction =
                customPrompt ||
                `Analyze the following text which represents writings and information about a person. Based *only* on this text, generate a structured JSON object representing their personality profile. Ensure the output is ONLY the JSON object, starting with { and ending with }.`;

            // 4. Construct the final prompt: Instructions + Template Structure + Content
            const finalPrompt = `
${analysisInstruction}

Use the following JSON structure:
\`\`\`json
${templateJsonString.trim()}
\`\`\`

Source Content:
${combinedContent.trim()}
            `;

            // 5. Generate the character card using Claude API
            console.log('Sending generation request to Claude API...');
            const generationResult = await this.claudeAPI.generateCompletion(finalPrompt, {
                max_tokens: 4000, // Adjust max tokens as needed
            });

            if (typeof generationResult !== 'string' || !generationResult.trim()) {
                throw new Error('Claude API returned an empty or invalid response.');
            }

            // 6. Clean and validate the generated JSON
            const cleanedJsonString = this.extractJsonFromString(generationResult);
            if (!cleanedJsonString) {
                throw new Error('Failed to extract valid JSON from Claude API response.');
            }

            // Validate JSON format
            try {
                JSON.parse(cleanedJsonString);
            } catch (jsonError) {
                console.error('Generated content is not valid JSON:', cleanedJsonString);
                throw new Error('Generated content is not valid JSON.');
            }

            console.log(`Character card generated successfully for user ${userId}`);
            return cleanedJsonString;
        } catch (error: any) {
            console.error(`Error during character card generation for user ${userId}:`, error);
            throw new Error(`Generation failed: ${error.message}`);
        }
    }

    /**
     * Helper function to extract JSON object from a string, potentially wrapped in markdown.
     * @param str The string potentially containing a JSON object.
     * @returns The extracted JSON string, or null if not found.
     */
    private extractJsonFromString(str: string): string | null {
        const jsonMatch = str.match(/\\{.*\\}/s); // Simple match for content between { and }
        if (jsonMatch) {
            try {
                // Double check it parses
                JSON.parse(jsonMatch[0]);
                return jsonMatch[0];
            } catch {
                // Fall through if simple match fails to parse
            }
        }

        // Try harder: Look for JSON within ```json ... ``` markdown blocks
        const markdownMatch = str.match(/```json\\n(\\{.*?\\})\\n```/s);
        if (markdownMatch && markdownMatch[1]) {
            try {
                JSON.parse(markdownMatch[1]);
                return markdownMatch[1];
            } catch {
                // Ignore if it doesn't parse
            }
        }

        console.warn('Could not reliably extract JSON from string:', str);
        return null; // Return null if no valid JSON found
    }

    /**
     * Legacy method for backwards compatibility.
     * Now just calls generateCharacterCard to ensure consistency.
     */
    async generateBasePrompt(
        userId: string,
        assetIds: string[],
        customPrompt?: string | null
    ): Promise<string> {
        console.warn('generateBasePrompt is deprecated. Using generateCharacterCard instead.');
        const cardJson = await this.generateCharacterCard(
            userId,
            assetIds,
            customPrompt || undefined
        );
        return cardJson;
    }
}

export default AbstractionApproach;
