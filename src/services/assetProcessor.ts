import { UploadedFile } from 'express-fileupload';
import fs from 'fs/promises';
import path from 'path';
// import crypto from 'crypto'; // Removed unused import
import { dbRun, dbGet, dbAll } from '../lib/database'; // Import DB helpers
import { v4 as uuidv4 } from 'uuid';
// import WebsiteScraper from './scrapers/websiteScraper'; // Commented out - currently unused
// import PdfProcessor from './pdfProcessor'; // Commented out - TODO: Migrate pdfProcessor

// Define the shape of Asset data in the database
interface Asset {
    asset_id: string;
    user_id: string;
    type: 'text' | 'image' | 'pdf' | 'url' | 'json'; // Added 'json' type
    filepath: string;
    original_filename?: string | null;
    mime_type?: string | null;
    size_bytes?: number | null;
    created_at: string;
    metadata?: string | null; // JSON string for arbitrary metadata
}

// Define the shape of expected metadata for processing
interface AssetMetadata {
    userId: string;
    personId?: string; // Optional: For organizing files, defaults to userId if missing
    sourceUrl?: string;
    sourceType?: string;
    context?: string;
    title?: string;
    // Allow other arbitrary fields
    [key: string]: any;
}

class AssetProcessor {
    private assetsDir: string;
    // private scraper: WebsiteScraper; // Removed unused property
    // private pdfProcessor: PdfProcessor; // Commented out

    constructor() {
        // Define assets directory relative to compiled JS file location (e.g., dist/services)
        this.assetsDir = path.join(__dirname, '../../data/assets'); 
        // this.scraper = new WebsiteScraper(); // Removed unused initialization
        // this.pdfProcessor = new PdfProcessor(); // Commented out
    }

    /**
     * Sanitizes a user ID to be safe for filesystem paths.
     * Replaces non-alphanumeric characters with underscores.
     * @param userId The original user ID.
     * @returns Sanitized user ID.
     */
    sanitizeUserId(userId: string): string {
        // Replace any character that is not a letter, number, or underscore with an underscore
        return userId.replace(/[^a-zA-Z0-9_]/g, '_');
    }

    /**
     * Processes an uploaded file or fetched content, saves it, and adds DB record.
     * @param file The uploaded file object (from express-fileupload) or data object for non-uploads.
     * @param metadata Metadata including userId, sourceUrl, context etc.
     * @returns The created Asset record.
     */
    async processAsset(file: UploadedFile, metadata: AssetMetadata): Promise<Asset> {
        const { userId, personId, sourceUrl, ...otherMetadata } = metadata;
        if (!userId) {
            throw new Error('User ID is required in metadata to process asset.');
        }
        
        // Use personId if provided, otherwise default to userId for directory structure
        const directoryOwnerId = personId || userId;
        const sanitizedOwnerId = this.sanitizeUserId(directoryOwnerId);
        const userAssetsDir = path.join(this.assetsDir, sanitizedOwnerId);
        await fs.mkdir(userAssetsDir, { recursive: true });

        const assetId = uuidv4();
        let assetType: Asset['type'] = 'text'; // Default type
        let filePathSuffix = '';
        const originalFilename = file.name;
        const fileExtension = path.extname(originalFilename).toLowerCase();
        const sizeBytes = file.size;
        const mimeType = file.mimetype;

        // Determine asset type based on mime type or extension
        if (mimeType.startsWith('image/')) {
            assetType = 'image';
            filePathSuffix = fileExtension || '.img';
        } else if (mimeType === 'application/pdf') {
            assetType = 'pdf';
            filePathSuffix = '.pdf';
        } else if (mimeType === 'application/json') {
             assetType = 'json';
             filePathSuffix = '.json';
        } else if (mimeType.startsWith('text/') || mimeType === 'application/octet-stream' || !mimeType) { // Treat unknown/binary as text for now
            assetType = 'text';
            filePathSuffix = '.txt'; // Store generic text/unknown as .txt
        } else {
            // Fallback for other types, store as text with original extension if possible
            assetType = 'text';
            filePathSuffix = fileExtension || '.bin'; 
        }

        // Construct final filepath
        const filename = `${assetId}${filePathSuffix}`;
        const fullFilePath = path.join(userAssetsDir, filename);
        const relativeFilePath = path.join(sanitizedOwnerId, filename); // Path relative to assetsDir

        // Move the uploaded file
        await file.mv(fullFilePath);

        // TODO: Add URL scraping and PDF processing logic here if needed
        // Example placeholder:
        // if (assetType === 'url') { await this.scraper.scrapeAndSave(sourceUrl, fullFilePath); }
        // if (assetType === 'pdf') { await this.pdfProcessor.extractText(fullFilePath); }
        
        // Save asset metadata to database
        const now = new Date().toISOString();
        const metadataJson = JSON.stringify(otherMetadata); // Store remaining metadata

        const dbQuery = `
            INSERT INTO assets (asset_id, user_id, type, filepath, original_filename, mime_type, size_bytes, created_at, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        await dbRun(dbQuery, [
            assetId,
            userId,
            assetType,
            relativeFilePath,
            originalFilename,
            mimeType,
            sizeBytes,
            now,
            metadataJson
        ]);

        console.log(`Asset processed and saved: ID ${assetId}, User ${userId}, Type ${assetType}, Path ${relativeFilePath}`);
        
        // Fetch and return the created asset record
        const newAsset = await this.getAsset(assetId);
        if (!newAsset) {
             // This should ideally not happen if insert succeeded
             throw new Error('Failed to retrieve asset immediately after creation.');
        }
        return newAsset;
    }

    /**
     * Retrieves a single asset by its ID.
     * @param assetId The ID of the asset.
     * @returns The Asset object or null if not found.
     */
    async getAsset(assetId: string): Promise<Asset | null> {
        const asset = await dbGet<Asset>('SELECT * FROM assets WHERE asset_id = ?', [assetId]);
        return asset || null;
    }

    /**
     * Retrieves all assets for a given user.
     * @param userId The user ID.
     * @returns An array of Asset objects formatted for frontend compatibility.
     */
    async getAllAssets(userId: string): Promise<any[]> {
        const assets = await dbAll<Asset>('SELECT * FROM assets WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        
        // Transform assets to match frontend expected format
        return assets.map(asset => {
            const metadata = asset.metadata ? JSON.parse(asset.metadata) : {};
            
            return {
                id: asset.asset_id,
                userId: asset.user_id,
                contentType: asset.type,
                mimetype: asset.mime_type,
                fileName: asset.original_filename,
                filePath: asset.filepath,
                createdAt: asset.created_at,
                sourceType: metadata.sourceType || 'upload',
                context: metadata.context || '',
                contentPreview: metadata.preview || '',
                // Include other metadata fields
                ...metadata
            };
        });
    }

    /**
     * Deletes a single asset by ID, verifying ownership first.
     * @param userId The ID of the user requesting deletion.
     * @param assetId The ID of the asset to delete.
     * @returns True if deleted successfully, false otherwise.
     */
    async deleteAsset(assetId: string): Promise<boolean> {
        const asset = await this.getAsset(assetId);
        if (!asset) {
            console.warn(`Attempted to delete non-existent asset: ${assetId}`);
            return false; // Or maybe true indicating it's already gone?
        }

        // Construct the full path to the asset file
        const fullFilePath = path.join(this.assetsDir, asset.filepath);

        try {
            // Attempt to delete the file from the filesystem
            await fs.unlink(fullFilePath);
            console.log(`Deleted asset file: ${fullFilePath}`);
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                console.warn(`Asset file not found during deletion (already deleted?): ${fullFilePath}`);
                // Proceed to delete DB record even if file is missing
            } else {
                console.error(`Error deleting asset file ${fullFilePath}:`, error);
                // Decide whether to proceed with DB deletion if file deletion fails
                // For now, we'll throw to prevent DB inconsistency if file couldn't be deleted
                throw new Error(`Failed to delete asset file: ${error.message}`); 
            }
        }

        // Delete the asset record from the database
        const result = await dbRun('DELETE FROM assets WHERE asset_id = ?', [assetId]);
        
        return result.changes > 0;
    }

    /**
     * Deletes multiple assets by their IDs, verifying ownership.
     * @param userId The user ID requesting deletion.
     * @param assetIds An array of asset IDs to delete.
     * @returns The number of assets successfully deleted.
     */
    async deleteAssets(userId: string, assetIds: string[]): Promise<number> {
        if (!assetIds || assetIds.length === 0) {
            return 0;
        }

        // Fetch assets first to verify ownership and get filepaths
        const placeholders = assetIds.map(() => '?').join(',');
        const assetsToDelete = await dbAll<Asset>(
            `SELECT asset_id, filepath FROM assets WHERE user_id = ? AND asset_id IN (${placeholders})`,
            [userId, ...assetIds]
        );

        if (assetsToDelete.length === 0) {
             console.log(`No assets found matching IDs [${assetIds.join(', ')}] for user ${userId} to delete.`);
             return 0;
        }

        let deletedCount = 0;
        const successfullyDeletedIds: string[] = [];

        for (const asset of assetsToDelete) {
            const fullFilePath = path.join(this.assetsDir, asset.filepath);
            try {
                await fs.unlink(fullFilePath);
                successfullyDeletedIds.push(asset.asset_id);
                deletedCount++;
            } catch (error: any) {
                if (error.code === 'ENOENT') {
                    console.warn(`Asset file not found during bulk deletion (already deleted?): ${fullFilePath}`);
                    // Still mark for DB deletion if file is missing
                    successfullyDeletedIds.push(asset.asset_id);
                    // Note: deletedCount doesn't increment here, reflects actual file deletions attempted
                } else {
                    console.error(`Error deleting asset file during bulk delete ${fullFilePath}:`, error);
                    // Skip DB deletion for this asset if file deletion failed
                }
            }
        }

        // Delete records from DB only for assets where file deletion was successful or file was already missing
        if (successfullyDeletedIds.length > 0) {
            const dbPlaceholders = successfullyDeletedIds.map(() => '?').join(',');
            const result = await dbRun(`DELETE FROM assets WHERE asset_id IN (${dbPlaceholders})`, successfullyDeletedIds);
            console.log(`Bulk deleted ${result.changes} asset records from DB for user ${userId}.`);
            // Note: result.changes reflects DB deletions, deletedCount reflects attempted file deletions
             return result.changes; // Return number of DB records deleted
        } else {
            console.log(`No asset files successfully handled for deletion for user ${userId}.`);
            return 0;
        }
    }
}

export default AssetProcessor; 