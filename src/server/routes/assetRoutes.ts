import express, { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import AssetProcessor from '../services/assetProcessor';
import ClaudeAPI from '../api/claude';
import { asyncHandler } from '../lib/asyncHandler';
import { dbRun, dbGet, dbAll } from '../lib/database'; // Import DB helpers
import { v4 as uuidv4 } from 'uuid';
import PdfProcessor from '../services/pdfProcessor'; // Import PdfProcessor

// Function to create the asset router, injecting dependencies
function createAssetRouter(assetProcessor: AssetProcessor, claudeAPI: ClaudeAPI): Router {
    const router = express.Router();

    // GET /api/assets/:userId - Get all assets for a user
    router.get('/:userId', asyncHandler(async (req: Request, res: Response) => {
        const userId = req.params.userId;
        if (!userId) {
            res.status(400).json({ error: 'User ID parameter is required' });
            return;
        }
        const assets = await assetProcessor.getAllAssets(userId);
        res.status(200).json(assets);
        return;
    }));

    // GET /api/assets/asset/:assetId - Get a single asset by ID (securely checks user later if needed)
    // Consider adding user ID check here for security if assets shouldn't be public
    router.get('/asset/:assetId', asyncHandler(async (req: Request, res: Response) => {
        const assetId = req.params.assetId;
        if (!assetId) {
            res.status(400).json({ error: 'Asset ID parameter is required' });
            return;
        }
        const asset = await assetProcessor.getAsset(assetId);
        if (asset) {
            res.status(200).json(asset);
        } else {
            res.status(404).json({ error: 'Asset not found' });
        }
        return;
    }));

    // GET /api/assets/:userId/:assetId/content - Get asset text content
    router.get('/:userId/:assetId/content', asyncHandler(async (req: Request, res: Response) => {
        const { assetId } = req.params;
        const asset = await assetProcessor.getAsset(assetId);

        if (!asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }
        // Ensure it's a text-based asset
        if (asset.file_type !== 'text' && asset.file_type !== 'json' && asset.file_type !== 'pdf') { // Use file_type
            return res.status(400).json({ error: 'Asset is not a text-based type (text, json, pdf)' });
        }

        const assetsDir = path.join(__dirname, '../../data/assets');
        const filePath = path.join(assetsDir, asset.file_path); // Use file_path

        try {
            // Special handling for PDF
            if (asset.file_type === 'pdf') {
                const pdfProcessor = new PdfProcessor();
                const textContent = await pdfProcessor.extractText(filePath);
                res.status(200).type('text/plain').send(textContent);
            } else {
                // For text and json, read the file content
                const content = await fs.readFile(filePath, 'utf-8');
                // Set content type based on original type
                 if (asset.file_type === 'json') {
                     res.status(200).type('application/json').send(content);
                 } else {
                     res.status(200).type('text/plain').send(content);
                 }
            }
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                console.error(`Asset file not found at path: ${filePath}`);
                res.status(404).json({ error: 'Asset file not found on server' });
            } else {
                console.error(`Error reading asset content ${assetId}:`, error);
                res.status(500).json({ error: 'Failed to read asset content' });
            }
        }
        return;
    }));

    // GET /api/assets/:userId/:assetId/preview - Get text preview
    router.get('/:userId/:assetId/preview', asyncHandler(async (req: Request, res: Response) => {
        const { assetId } = req.params;
        const asset = await assetProcessor.getAsset(assetId);

        if (!asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        const assetsDir = path.join(__dirname, '../../data/assets'); // Define assetsDir

        if (asset.file_type === 'text' || asset.file_type === 'json') { // Use file_type
            try {
                const filePath = path.join(assetsDir, asset.file_path); // Use file_path
                const content = await fs.readFile(filePath, 'utf-8');
                const preview = content.substring(0, 500) + (content.length > 500 ? '...' : '');
                res.status(200).type('text/plain').send(preview);
            } catch (error: any) {
                 if (error.code === 'ENOENT') {
                     console.error(`Asset file not found for preview: ${asset.file_path}`);
                     res.status(404).json({ error: 'Asset file not found on server' });
                 } else {
                    console.error(`Error reading asset content for preview ${assetId}:`, error);
                    res.status(500).json({ error: 'Failed to read asset content for preview' });
                 }
            }
        } else if (asset.file_type === 'pdf') {
            try {
                const filePath = path.join(assetsDir, asset.file_path);
                const pdfProcessor = new PdfProcessor(); // Instantiate PdfProcessor
                const extractionResult = await pdfProcessor.extractText(filePath);
                
                // Access the .text property from the result before using substring
                const textContent = extractionResult.text || ''; // Ensure textContent is a string
                
                const preview = textContent.substring(0, 500) + (textContent.length > 500 ? '...' : '');
                res.status(200).type('text/plain').send(preview);
            } catch (error) {
                console.error(`Error processing PDF for preview ${assetId}:`, error);
                res.status(500).json({ error: 'Failed to process PDF for preview' });
            }
        } else {
            res.status(400).json({ error: 'Preview not available for this asset type' });
        }
        return;
    }));

    // GET /api/assets/:userId/:assetId/image - Get image content
    router.get('/:userId/:assetId/image', asyncHandler(async (req: Request, res: Response) => {
        const { assetId } = req.params;
        const asset = await assetProcessor.getAsset(assetId);

        if (!asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        if (asset.file_type !== 'image' || !asset.mime_type?.startsWith('image/')) { // Use file_type
            return res.status(400).json({ error: 'Asset is not an image' });
        }

        // Use file_path from the asset record
        const assetsDir = path.join(__dirname, '../../data/assets');
        const imagePath = path.join(assetsDir, asset.file_path); // Use file_path

        // Check if file exists before sending
        try {
            await fs.access(imagePath); // Check if the file exists and is accessible
            res.sendFile(imagePath, (err) => {
                if (err) {
                    console.error(`Error sending image file ${assetId}:`, err);
                    // Avoid sending another response if headers already sent
                    if (!res.headersSent) {
                         res.status(500).json({ error: 'Failed to send image file' });
                    }
                }
            });
        } catch (error) {
            console.error(`Image file not found or inaccessible: ${imagePath}`);
            res.status(404).json({ error: 'Image file not found on server' });
        }
        return;
    }));

    // POST /api/assets/describe/:assetId - Generate description for an image asset
    router.post('/describe/:assetId', asyncHandler(async (req: Request, res: Response) => {
        const { assetId } = req.params;
        const { prompt } = req.body; // Optional custom prompt

        if (!assetId) {
            res.status(400).json({ error: 'Asset ID is required' });
            return;
        }

        const asset = await assetProcessor.getAsset(assetId);
        if (!asset) {
            res.status(404).json({ error: 'Asset not found' });
            return;
        }

        if (asset.file_type !== 'image' || !asset.mime_type?.startsWith('image/')) {
            res.status(400).json({ error: 'Asset is not an image' });
            return;
        }

        // Read the image file (Paths should be correct relative to compiled JS)
        const assetsDir = path.join(__dirname, '../../data/assets'); // Path relative to dist/routes? -> needs verification after compilation
        const imagePath = path.join(assetsDir, asset.file_path);
        const imageBuffer = await fs.readFile(imagePath);
        const imageBase64 = imageBuffer.toString('base64');

        const descriptionPrompt = prompt || 'Describe this image in detail.';

        const description = await claudeAPI.generateImageDescription(
            descriptionPrompt,
            imageBase64,
            asset.mime_type as any // Cast mime_type, ensure it fits expected types
        );

        res.status(200).json({ description });
        return;
    }));


    // DELETE /api/assets/:userId - Clear all assets for a user
    router.delete('/:userId', asyncHandler(async (req: Request, res: Response) => {
        const { userId } = req.params;
        
        const userAssets = await assetProcessor.getAllAssets(userId);
        if (!userAssets || userAssets.length === 0) {
            res.status(200).json({ success: true, message: 'No assets found for the user.', deletedCount: 0, failedCount: 0 });
            return;
        }
        
        let deletedCount = 0;
        let failedCount = 0;
        const deletionErrors: string[] = []; // Store specific errors
        
        for (const asset of userAssets) {
            try {
                const deleted = await assetProcessor.deleteAsset(asset.asset_id);
                if (deleted) {
                    deletedCount++;
                } else {
                    // Record failure, potentially with more detail if deleteAsset provided it
                    failedCount++;
                    deletionErrors.push(`Failed to delete asset ${asset.asset_id} (reason unknown).`);
                }
            } catch (error: any) {
                console.error(`Error during bulk delete of asset ${asset.asset_id}:`, error);
                failedCount++;
                deletionErrors.push(`Error deleting asset ${asset.asset_id}: ${error.message}`);
            }
        }
        
        // Determine status based on counts
        const status = failedCount > 0 ? (deletedCount > 0 ? 207 : 500) : 200;
        const message = failedCount > 0
            ? `Deleted ${deletedCount} assets for user ${userId}. Failed to delete ${failedCount}.`
            : `Successfully deleted ${deletedCount} assets for user ${userId}.`;

        res.status(status).json({
            success: failedCount === 0,
            message,
            deletedCount,
            failedCount,
            errors: failedCount > 0 ? deletionErrors : undefined
        });
        return;
    }));

    // DELETE /api/assets/:userId/bulk - Delete specific assets for a user
    router.delete('/:userId/bulk', asyncHandler(async (req: Request, res: Response) => {
        const { userId } = req.params;
        const { assetIds } = req.body; // Assuming body is { assetIds: string[] }

        if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
            res.status(400).json({ error: 'Missing required field: assetIds array.' });
            return;
        }

        // deleteAssets now checks ownership internally
        const deletedCount = await assetProcessor.deleteAssets(userId, assetIds);
        const attemptedCount = assetIds.length;
        const failedCount = attemptedCount - deletedCount;

        const message = failedCount > 0
            ? `Attempted to delete ${attemptedCount} assets. Successfully deleted: ${deletedCount}. Failed: ${failedCount}.`
            : `Successfully deleted ${deletedCount} of ${attemptedCount} requested assets.`;

        res.status(failedCount > 0 ? 207 : 200).json({
            success: failedCount === 0,
            message,
            deletedCount,
            failedCount
        });
        return;
    }));

    return router;
}

// Use ES module export
export default createAssetRouter; 