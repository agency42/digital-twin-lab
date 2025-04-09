import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import querystring from 'querystring';
import { dbGet, dbRun } from '../lib/database'; // Assuming db methods return Promises

// Interface for the structure stored in oauth_state table
interface OAuthState {
    state_key: string;
    provider: string;
    user_id?: string | null;
    expires_at: string;
    created_at: string;
}

// Interface for the token response (adjust based on actual LinkedIn response)
interface LinkedInTokenResponse {
    access_token: string;
    expires_in: number;
    // ... other fields like refresh_token, scope, token_type
}

// Interface for the LinkedIn user profile (adjust based on actual response)
interface LinkedInProfile {
    sub: string; // Unique identifier
    name?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
    email?: string;
    email_verified?: boolean;
    // ... other fields
}

/**
 * Service for handling OAuth interactions, specifically LinkedIn.
 */
class OAuthService {

    constructor() {
        // Ensure necessary environment variables are set
        if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET || !process.env.LINKEDIN_CALLBACK_URL) {
            console.warn('LinkedIn OAuth environment variables (CLIENT_ID, CLIENT_SECRET, CALLBACK_URL) are not fully configured.');
            // Depending on requirements, might throw an error here
        }
    }

    /**
     * Generates a state parameter and stores it for CSRF protection.
     * @param userId The user ID initiating the flow.
     * @returns {Promise<string>} The generated state parameter.
     */
    async generateState(userId: string): Promise<string> {
        const state = uuidv4();
        const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

        try {
            await dbRun(
                'INSERT INTO oauth_state (state_key, provider, user_id, expires_at) VALUES (?, ?, ?, ?)',
                [state, 'linkedin', userId, expires.toISOString()]
            );
            return state;
        } catch (error: any) {
            console.error('Error saving OAuth state to database:', error);
            throw new Error('Failed to generate OAuth state.');
        }
    }

    /**
     * Validates the received state parameter against the stored state.
     * Deletes the state record after validation.
     * @param state The state parameter received from the callback.
     * @returns {Promise<{ valid: boolean; userId?: string | null }>} Validation result and associated user ID.
     */
    async validateState(state: string): Promise<{ valid: boolean; userId?: string | null }> {
        try {
            const storedState = await dbGet<OAuthState>(
                'SELECT * FROM oauth_state WHERE state_key = ? AND provider = ?',
                [state, 'linkedin']
            );

            // Always attempt to delete the used state key
            await dbRun('DELETE FROM oauth_state WHERE state_key = ?', [state]);

            if (!storedState) {
                return { valid: false };
            }

            const now = new Date();
            const expires = new Date(storedState.expires_at);

            if (now > expires) {
                console.warn(`OAuth state expired: ${state}`);
                return { valid: false };
            }

            return { valid: true, userId: storedState.user_id };
        } catch (error: any) {
            console.error(`Error validating OAuth state ${state}:`, error);
            return { valid: false };
        }
    }

    /**
     * Exchanges an authorization code for an access token.
     * @param code The authorization code from the callback.
     * @returns {Promise<LinkedInTokenResponse>} Token response data.
     */
    async exchangeCodeForToken(code: string): Promise<LinkedInTokenResponse> {
        try {
            const response = await axios.post<LinkedInTokenResponse>(
                'https://www.linkedin.com/oauth/v2/accessToken',
                querystring.stringify({
                    grant_type: 'authorization_code',
                    code: code,
                    client_id: process.env.LINKEDIN_CLIENT_ID,
                    client_secret: process.env.LINKEDIN_CLIENT_SECRET,
                    redirect_uri: process.env.LINKEDIN_CALLBACK_URL
                }),
                {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                }
            );
            return response.data;
        } catch (error: any) {
            console.error('Error exchanging code for tokens:', error.message);
            // Check the property directly on the error object
            if (error.isAxiosError && error.response) {
                console.error('LinkedIn Token API Error Details:', { 
                    status: error.response.status, 
                    data: '<omitted>' // Omit potentially large/sensitive data
                });
            }
            throw new Error(`LinkedIn token exchange failed: ${error.message}`);
        }
    }

    /**
     * Get LinkedIn profile using access token.
     * @param accessToken LinkedIn access token.
     * @returns {Promise<LinkedInProfile>} LinkedIn profile data.
     */
    async getProfile(accessToken: string): Promise<LinkedInProfile> {
        try {
            const response = await axios.get<LinkedInProfile>('https://api.linkedin.com/v2/userinfo', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            return response.data;
        } catch (error: any) {
            console.error('Error getting LinkedIn profile:', error.message);
            // Check the property directly on the error object
            if (error.isAxiosError && error.response) {
                 console.error('LinkedIn Profile API Error Details:', { 
                    status: error.response.status, 
                    data: '<omitted>' // Omit potentially large/sensitive data
                 });
            }
            throw new Error(`Failed to get LinkedIn profile: ${error.message}`);
        }
    }
}

export default OAuthService; 