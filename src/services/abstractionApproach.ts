import fs from 'fs/promises';
import path from 'path';
import { dbAll } from '../lib/database'; // Only dbAll is needed here
// import AssetProcessor from './assetProcessor'; // Removed unused import
import ClaudeAPI from '../api/claude';
import PersonalityProfileService from './personalityProfileService';

// Define interfaces (or import if moved)
interface Asset {
    asset_id: string;
    user_id: string;
    type: 'text' | 'image' | 'pdf' | 'url' | 'json'; // Added json
    filepath: string;
    original_filename?: string | null;
    mime_type?: string | null;
    created_at: string;
    metadata?: string | null; // JSON string
}

class AbstractionApproach {
    private claudeAPI: ClaudeAPI;
    // private assetProcessor: AssetProcessor; // Removed unused property
    private personalityProfileService: PersonalityProfileService;

    constructor() {
        this.claudeAPI = new ClaudeAPI();
        // this.assetProcessor = new AssetProcessor(); // Removed unused initialization
        this.personalityProfileService = new PersonalityProfileService();
    }

    /**
     * Gathers content from various asset types.
     * @param assetIds Array of asset IDs.
     * @param userId The user ID to verify asset ownership.
     * @returns Combined text content and array of image data.
     */
    private async gatherAssetContent(assetIds: string[], userId: string): Promise<{ textContent: string; imageAssets: { base64: string; mediaType: any }[] }> {
        // Use dbAll to fetch multiple assets safely
        const placeholders = assetIds.map(() => '?').join(',');
        const query = `SELECT * FROM assets WHERE user_id = ? AND asset_id IN (${placeholders})`;
        const assets = await dbAll<Asset>(query, [userId, ...assetIds]);

        if (assets.length !== assetIds.length) {
            console.warn(`Requested ${assetIds.length} assets, but found ${assets.length} owned by user ${userId}. Missing or unauthorized IDs may exist.`);
            // Potentially throw error if strict matching is required
        }

        let combinedText = '';
        const imageAssets: { base64: string; mediaType: any }[] = [];
        const assetsDir = path.join(__dirname, '../../data/assets'); // Adjust path relative to compiled code

        for (const asset of assets) {
            const assetPath = path.join(assetsDir, asset.filepath);
            try {
                switch (asset.type) {
                    case 'text':
                    case 'json': // Treat JSON content as text
                        const text = await fs.readFile(assetPath, 'utf-8');
                        combinedText += `\n\n--- Content from ${asset.original_filename || asset.asset_id} (${asset.type}) ---\n${text}`;
                        break;
                    case 'url': // Assuming URL content is stored as text
                        const urlContent = await fs.readFile(assetPath, 'utf-8');
                        combinedText += `\n\n--- Content from URL asset ${asset.original_filename || asset.asset_id} ---\n${urlContent}`;
                        break;
                    case 'image':
                        if (asset.mime_type && ('image/jpeg' === asset.mime_type || 'image/png' === asset.mime_type || 'image/gif' === asset.mime_type || 'image/webp' === asset.mime_type)) {
                            const imageBuffer = await fs.readFile(assetPath);
                            const base64Data = imageBuffer.toString('base64');
                            imageAssets.push({ base64: base64Data, mediaType: asset.mime_type });
                            combinedText += `\n\n--- Image Asset Included: ${asset.original_filename || asset.asset_id} ---`;
                        } else {
                            console.warn(`Skipping image asset ${asset.asset_id} due to unsupported mime type: ${asset.mime_type}`);
                        }
                        break;
                    case 'pdf':
                         // PDF processing might yield text. Assume it's stored alongside/extracted.
                         // For now, let's assume a related .txt file exists if PDF text extraction happened.
                         // This logic might need refinement based on actual PDF processing flow.
                         try {
                             const pdfTextPath = assetPath.replace(/\.pdf$/i, '.txt');
                             const pdfText = await fs.readFile(pdfTextPath, 'utf-8');
                             combinedText += `\n\n--- Text Content from PDF ${asset.original_filename || asset.asset_id} ---\n${pdfText}`;
                         } catch (pdfTextError: any) {
                             if (pdfTextError.code === 'ENOENT') {
                                 console.warn(`No associated text file found for PDF asset ${asset.asset_id}. Including placeholder.`);
                                 combinedText += `\n\n--- PDF Asset Included (No text extracted): ${asset.original_filename || asset.asset_id} ---`;
                             } else {
                                 throw pdfTextError; // Re-throw other read errors
                             }
                         }
                         break;
                    default:
                        console.warn(`Unhandled asset type: ${asset.type} for asset ${asset.asset_id}`);
                }
            } catch (error: any) {
                console.error(`Error processing asset ${asset.asset_id} (${assetPath}):`, error.message);
                combinedText += `\n\n--- Error processing asset ${asset.original_filename || asset.asset_id} ---`;
            }
        }

        return { textContent: combinedText, imageAssets };
    }

    /**
     * Generates a personality profile from combined asset content.
     * @param userId User ID for asset ownership verification.
     * @param assetIds Array of asset IDs to include.
     * @param customPrompt Optional custom prompt for Claude.
     * @returns The generated personality JSON object or null.
     */
    async generatePersonality(userId: string, assetIds: string[], customPrompt?: string): Promise<object | null> {
        console.log(`Starting personality generation for user ${userId} using ${assetIds.length} assets.`);
        const { textContent /*, imageAssets */ } = await this.gatherAssetContent(assetIds, userId);
        
        // Currently not sending images to personality generation, only text.
        // If image analysis becomes part of personality gen, use imageAssets here.
        if (!textContent.trim()) {
            console.error('No text content gathered from assets. Cannot generate personality.');
            throw new Error('No text content found in the selected assets to generate a personality profile.');
        }

        console.log(`Total text content length for personality gen: ${textContent.length}`);
        
        const personalityJson = await this.claudeAPI.generatePersonality(textContent, customPrompt);

        if (!personalityJson) {
            console.error('Claude API failed to generate a valid personality JSON.');
            throw new Error('Failed to generate personality profile from Claude API.');
        }

        // Save the generated persona using the service
        try {
            const personaString = JSON.stringify(personalityJson);
            // Save and potentially overwrite the primary persona
            await this.personalityProfileService.savePrimaryPersona(
                userId,
                personaString
            );
            console.log(`Successfully saved generated primary persona for user ${userId}.`);
            return personalityJson; // Return the generated JSON object
        } catch (dbError: any) {
             console.error(`Database error saving generated persona for user ${userId}:`, dbError);
             // Re-throw the DB error to be caught by the route handler
             throw new Error(`Failed to save the generated personality profile: ${dbError.message}`);
        }
    }
}

export default AbstractionApproach; 