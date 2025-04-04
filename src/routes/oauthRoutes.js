const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const AssetProcessor = require('../services/assetProcessor');
const path = require('path');
const fs = require('fs/promises');

function createOAuthRouter() {
  const router = express.Router();
  const assetProcessor = new AssetProcessor();
  
  // Store OAuth state for validation (in memory for simplicity)
  // In production, use a more persistent and secure storage mechanism
  const pendingAuth = new Map();
  
  /**
   * Initiate LinkedIn OAuth flow
   * GET /api/oauth/linkedin/authorize
   */
  router.get('/linkedin/authorize', (req, res) => {
    try {
      const { userId } = req.query;
      
      if (!userId) {
        return res.status(400).json({ error: 'Missing required query parameter: userId' });
      }
      
      // Generate state parameter for security
      const state = crypto.randomBytes(16).toString('hex');
      
      // Store state with user ID and timestamp for validation
      pendingAuth.set(state, {
        userId,
        timestamp: Date.now(),
        provider: 'linkedin'
      });
      
      // Construct LinkedIn authorization URL
      const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('client_id', process.env.LINKEDIN_CLIENT_ID);
      authUrl.searchParams.append('redirect_uri', process.env.LINKEDIN_REDIRECT_URI);
      authUrl.searchParams.append('state', state);
      authUrl.searchParams.append('scope', 'openid profile email');
      
      // Return authorization URL to frontend
      return res.status(200).json({ authUrl: authUrl.toString() });
    } catch (error) {
      console.error('Error initiating LinkedIn OAuth:', error);
      return res.status(500).json({ error: `Failed to initiate LinkedIn authorization: ${error.message}` });
    }
  });
  
  /**
   * LinkedIn OAuth callback
   * GET /api/oauth/linkedin/callback
   */
  router.get('/linkedin/callback', async (req, res) => {
    try {
      const { code, state, error } = req.query;
      
      if (error) {
        console.error('LinkedIn OAuth error:', error);
        // Redirect to frontend with error
        return res.redirect(`/?auth_status=error&error=${encodeURIComponent(error)}`);
      }
      
      if (!code || !state) {
        // Redirect to frontend with error
        return res.redirect('/?auth_status=error&error=Missing required parameters');
      }
      
      // Validate state parameter
      let authData;
      // First check if we have it in the pendingAuth map (used by the /oauth/linkedin/authorize endpoint)
      authData = pendingAuth.get(state);
      
      // If not found in map, check cookies (used by direct /auth/linkedin endpoint)
      if (!authData && req.cookies) {
        const cookieState = req.cookies.linkedin_auth_state;
        const cookieUserId = req.cookies.linkedin_auth_user_id;
        
        if (cookieState === state && cookieUserId) {
          authData = {
            userId: cookieUserId,
            provider: 'linkedin',
            timestamp: Date.now() - 5 * 60 * 1000 // Assume it was 5 minutes ago
          };
          
          // Clear the cookies
          res.clearCookie('linkedin_auth_state');
          res.clearCookie('linkedin_auth_user_id');
        }
      }
      
      if (!authData) {
        return res.redirect('/?auth_status=error&error=Invalid state parameter');
      }
      
      // Check if state is expired (15 minutes)
      if (Date.now() - authData.timestamp > 15 * 60 * 1000) {
        pendingAuth.delete(state);
        return res.redirect('/?auth_status=error&error=Authorization expired');
      }
      
      // Exchange authorization code for access token
      const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
        params: {
          grant_type: 'authorization_code',
          code,
          redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
          client_id: process.env.LINKEDIN_CLIENT_ID,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const { access_token } = tokenResponse.data;
      
      // Get user info from LinkedIn using the v2 userinfo endpoint (OpenID Connect)
      const userInfoResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      });
      
      const linkedInProfile = userInfoResponse.data;
      
      // Process LinkedIn profile data as an asset
      const { userId } = authData;
      const linkedInProfileStr = JSON.stringify(linkedInProfile, null, 2);
      
      // Create a file object that matches what AssetProcessor.processAsset expects
      const assetData = {
        name: 'linkedin_profile.json',
        filename: 'linkedin_profile.json',
        mimetype: 'application/json',
        size: Buffer.byteLength(linkedInProfileStr, 'utf8'),
        data: Buffer.from(linkedInProfileStr, 'utf8'),
        mv: async (dest) => {
          try {
            // Ensure the directory exists
            const destDir = path.dirname(dest);
            await fs.mkdir(destDir, { recursive: true });
            // Write the file to destination
            await fs.writeFile(dest, linkedInProfileStr, 'utf8');
            return true;
          } catch (error) {
            console.error('Error writing LinkedIn profile data:', error);
            throw error;
          }
        }
      };
      
      const metadata = {
        sourceUrl: 'https://www.linkedin.com',
        sourceType: 'linkedin',
        context: 'LinkedIn Profile',
        userId
      };
      
      console.log(`Saving LinkedIn profile as asset for existing user: ${userId}`);
      
      try {
        // Save as asset 
        await assetProcessor.processAsset(assetData, metadata);
        console.log(`Successfully saved LinkedIn profile as asset for user: ${userId}`);
      } catch (error) {
        console.error(`Error saving LinkedIn profile for user ${userId}:`, error);
        // Continue to redirect even if asset saving fails
      }
      
      // Clean up
      pendingAuth.delete(state);
      
      // Redirect back to frontend with success
      return res.redirect(`/?auth_status=success&provider=linkedin&user_id=${encodeURIComponent(userId)}`);
    } catch (error) {
      console.error('Error processing LinkedIn callback:', error);
      return res.redirect(`/?auth_status=error&error=${encodeURIComponent(error.message)}`);
    }
  });
  
  return router;
}

module.exports = createOAuthRouter; 