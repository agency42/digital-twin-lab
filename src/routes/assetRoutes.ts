import express, { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import AssetProcessor from '../services/assetProcessor';
import ClaudeAPI from '../api/claude';
import { asyncHandler } from '../lib/asyncHandler';

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

    // GET /api/assets/:assetId/content - Get the content of an asset
    router.get('/:assetId/content', asyncHandler(async (req: Request, res: Response) => {
        const { assetId } = req.params;
        if (!assetId) {
            res.status(400).json({ error: 'Asset ID parameter is required' });
            return;
        }
        
        const asset = await assetProcessor.getAsset(assetId);
        if (!asset) {
            res.status(404).json({ error: 'Asset not found' });
            return;
        }
        
        // For text assets, read the file and return its content
        if (asset.type === 'text') {
            const assetsDir = path.join(__dirname, '../../data/assets');
            const filePath = path.join(assetsDir, asset.filepath);
            try {
                const content = await fs.readFile(filePath, 'utf8');
                res.status(200).send(content);
            } catch (error: any) {
                console.error(`Error reading asset content for ${assetId}:`, error);
                res.status(500).json({ error: `Failed to read asset content: ${error.message}` });
            }
        } else {
            // For non-text assets, return a 404 or redirect to the asset URL
            res.status(404).json({ error: 'Content not available for this asset type' });
        }
    }));
    
    // GET /api/assets/:assetId/preview - Get a preview of an asset
    router.get('/:assetId/preview', asyncHandler(async (req: Request, res: Response) => {
        const { assetId } = req.params;
        if (!assetId) {
            res.status(400).json({ error: 'Asset ID parameter is required' });
            return;
        }
        
        const asset = await assetProcessor.getAsset(assetId);
        if (!asset) {
            res.status(404).json({ error: 'Asset not found' });
            return;
        }
        
        // For text assets, get a short preview
        if (asset.type === 'text') {
            const assetsDir = path.join(__dirname, '../../data/assets');
            const filePath = path.join(assetsDir, asset.filepath);
            try {
                const content = await fs.readFile(filePath, 'utf8');
                // Take first 200 characters as preview
                const preview = content.substring(0, 200) + (content.length > 200 ? '...' : '');
                res.status(200).send(preview);
            } catch (error: any) {
                console.error(`Error reading asset preview for ${assetId}:`, error);
                res.status(500).json({ error: `Failed to read asset preview: ${error.message}` });
            }
        } else {
            // For non-text assets, return a 404 or redirect to the asset URL
            res.status(404).json({ error: 'Preview not available for this asset type' });
        }
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

        if (asset.type !== 'image' || !asset.mime_type?.startsWith('image/')) {
            res.status(400).json({ error: 'Asset is not an image' });
            return;
        }

        // Read the image file (Paths should be correct relative to compiled JS)
        const assetsDir = path.join(__dirname, '../../data/assets'); // Path relative to dist/routes? -> needs verification after compilation
        const imagePath = path.join(assetsDir, asset.filepath);
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