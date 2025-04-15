import { Router, Request, Response } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { UploadedFile } from 'express-fileupload';
import AssetProcessor from '../services/assetProcessor';

/**
 * Creates and configures a router for file upload endpoints
 */
export default function createUploadRouter() {
    const router = Router();
    const assetProcessor = new AssetProcessor();
    
    // File upload endpoint
    router.post('/', asyncHandler(async (req: Request, res: Response) => {
        const { userId } = req.body;
        if (!userId) {
            throw new Error('Missing required field in body: userId');
        }

        if (!req.files || !req.files.file) {
            throw new Error('No files uploaded under the key \'file\'.');
        }

        const filesToProcess: UploadedFile[] = Array.isArray(req.files.file)
            ? req.files.file
            : [req.files.file];

        const metadata = { ...req.body };
        delete metadata.file;

        const results: any[] = [];
        console.log(`Processing upload of ${filesToProcess.length} file(s) for user ${userId}`);

        for (const file of filesToProcess) {
            if (!file || typeof file !== 'object' || !('mv' in file)) {
                console.warn('Skipping an item that does not appear to be an uploaded file.');
                continue;
            }
            try {
                const result = await assetProcessor.processAsset(file, metadata);
                results.push(result);
            } catch (fileError: any) {
                console.error(`Error processing uploaded file ${file.name} for user ${userId}:`, fileError);
                results.push({ filename: file.name, error: fileError.message || 'Failed to process file' });
            }
        }

        const successCount = results.filter(r => r && r.id).length;
        const failureCount = results.length - successCount;
        const overallStatus = failureCount > 0 ? (successCount > 0 ? 207 : 500) : 200;
        const message = failureCount > 0
            ? `Processed ${successCount} file(s) successfully, ${failureCount} failed.`
            : `Successfully processed ${successCount} file(s).`;

        res.status(overallStatus).json({ message, results });
    }));

    return router;
} 