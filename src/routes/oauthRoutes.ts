import express, { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import OAuthService from '../services/oauthService'; // Import TS version
import AssetProcessor from '../services/assetProcessor'; // Import TS version
import userDataService from '../services/userDataService'; // Import TS default export
import { asyncHandler } from '../lib/asyncHandler'; // Import the wrapper

// Function to create the OAuth router
function createOAuthRouter(): Router {
    const router = express.Router();
    const oauthService = new OAuthService();
    const assetProcessor = new AssetProcessor();

    // GET /api/oauth/linkedin/authorize - Redirect user to LinkedIn for authorization
    router.get('/linkedin/authorize', asyncHandler(async (req: Request, res: Response) => {
        const userId = req.query.userId as string | undefined;
        if (!userId) {
            throw new Error('Missing required query parameter: userId');
        }

        const state = await oauthService.generateState(userId);
        const clientId = process.env.LINKEDIN_CLIENT_ID;
        const redirectUri = process.env.LINKEDIN_CALLBACK_URL;

        if (!clientId || !redirectUri) {
            throw new Error('LinkedIn OAuth environment variables not configured.');
        }

        const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('client_id', clientId);
        authUrl.searchParams.append('redirect_uri', redirectUri);
        authUrl.searchParams.append('state', state);
        authUrl.searchParams.append('scope', 'openid profile email');

        res.redirect(authUrl.toString());
    }));

    // GET /api/oauth/linkedin/disconnect - Disconnect LinkedIn for a user
    router.get('/linkedin/disconnect', asyncHandler(async (req: Request, res: Response) => {
        const userId = req.query.userId as string | undefined;
        if (!userId) {
            throw new Error('Missing required query parameter: userId');
        }

        // Update user data to remove LinkedIn connection info
        await userDataService.updateUserData(userId, {
            linkedin_connected: false,
            linkedin_profile_asset_id: null
        });

        // Optionally: delete the stored LinkedIn profile asset?
        // const user = await userDataService.getUserData(userId); 
        // if (user?.linkedin_profile_asset_id) {
        //     await assetProcessor.deleteAsset(user.linkedin_profile_asset_id);
        // }

        res.status(200).json({
            success: true,
            message: 'LinkedIn disconnected successfully.'
        });
    }));

    // GET /api/oauth/linkedin/callback - Handle callback from LinkedIn
    router.get('/linkedin/callback', async (req: Request, res: Response) => {
        const { code, state, error, error_description } = req.query as { code?: string; state?: string; error?: string; error_description?: string };

        console.log('LinkedIn OAuth callback received with query params:', { hasCode: !!code, hasState: !!state, error });

        if (error) {
            console.error('LinkedIn OAuth error:', error, error_description);
            return res.redirect(`/?auth_status=error&error=${encodeURIComponent(error_description || error)}`);
        }

        if (!code || !state) {
            console.error('LinkedIn OAuth missing required parameters:', { code: !!code, state: !!state });
            return res.redirect(`/?auth_status=error&error=${encodeURIComponent('Missing required callback parameters from LinkedIn')}`);
        }

        let userId: string | null | undefined = null;
        try {
            // Validate state
            const stateValidation = await oauthService.validateState(state);
            if (!stateValidation.valid || !stateValidation.userId) {
                console.error('LinkedIn OAuth invalid or expired state parameter');
                return res.redirect(`/?auth_status=error&error=${encodeURIComponent('Invalid or expired authentication state. Please try again.')}`);
            }
            userId = stateValidation.userId;
            console.log('LinkedIn OAuth state validation successful:', { state, userId });

            // Exchange code for token
            const tokenData = await oauthService.exchangeCodeForToken(code);
            const accessToken = tokenData.access_token;
            console.log('Successfully obtained access token');

            // Fetch user profile
            console.log('Fetching user profile from LinkedIn API...');
            const linkedInProfile = await oauthService.getProfile(accessToken);
            console.log('Successfully retrieved LinkedIn profile:', { sub: linkedInProfile?.sub, email: linkedInProfile?.email });

            // Process profile as asset
            const linkedInProfileStr = JSON.stringify(linkedInProfile, null, 2);
            console.log(`Creating asset for LinkedIn profile (user: ${userId})`);

            try {
                // Create a structure mimicking UploadedFile
                const assetData = {
                    name: 'linkedin_profile.json',
                    data: Buffer.from(linkedInProfileStr, 'utf8'),
                    size: Buffer.byteLength(linkedInProfileStr, 'utf8'),
                    encoding: 'utf8',
                    tempFilePath: '',
                    truncated: false,
                    mimetype: 'application/json',
                    md5: '',
                    mv: async (dest: string) => {
                        try {
                            const destDir = path.dirname(dest);
                            await fs.mkdir(destDir, { recursive: true });
                            await fs.writeFile(dest, linkedInProfileStr, 'utf8');
                        } catch (mvError: any) {
                            console.error('Error writing LinkedIn profile data during mv:', mvError);
                            throw mvError;
                        }
                    }
                };

                const metadata = {
                    sourceUrl: 'https://www.linkedin.com',
                    sourceType: 'linkedin',
                    context: 'LinkedIn Profile',
                    userId,
                    personId: userId
                };

                const asset = await assetProcessor.processAsset(assetData as any, metadata);
                console.log(`LinkedIn profile saved as asset: ${asset.asset_id}`);

                // Update user data
                await userDataService.updateUserData(userId, {
                    linkedin_connected: true,
                    linkedin_profile_asset_id: asset.asset_id
                });
                 console.log(`Updated user data to mark LinkedIn as connected for user: ${userId}`);

            } catch (assetError: any) {
                console.error(`Error saving LinkedIn profile asset or updating user for ${userId}:`, assetError);
                return res.redirect(`/?oauth_source=linkedin&status=success_profile_error&user_id=${encodeURIComponent(userId)}&auth_status=success&provider=linkedin`);
            }

            // Redirect back to frontend
            console.log(`Redirecting back to frontend with success for user: ${userId}`);
            return res.redirect(`/?oauth_source=linkedin&status=success&user_id=${encodeURIComponent(userId)}&auth_status=success&provider=linkedin`);

        } catch (error: any) {
            console.error('Error processing LinkedIn callback:', error);
            const errorMsg = encodeURIComponent(error.message || 'Failed to process LinkedIn callback');
            const userIdQuery = userId ? `&user_id=${encodeURIComponent(userId)}` : '';
            return res.redirect(`/?auth_status=error&error=${errorMsg}${userIdQuery}&provider=linkedin`);
        }
    });

    return router;
}

export default createOAuthRouter; 