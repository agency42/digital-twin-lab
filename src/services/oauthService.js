const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

/**
 * Service to handle OAuth integration with social platforms
 */
class OAuthService {
  constructor() {
    // Store active OAuth sessions with state
    this.sessions = new Map();
    
    // LinkedIn OAuth config
    this.linkedinConfig = {
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      redirectUri: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/api/oauth/linkedin/callback',
      scope: 'openid profile email',
      authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
      userInfoUrl: 'https://api.linkedin.com/v2/userinfo'
    };
  }

  /**
   * Initialize a LinkedIn OAuth session and return the authorization URL
   * @param {string} userId - The user ID to associate with this OAuth session
   * @return {string} The authorization URL to redirect the user to
   */
  initiateLinkedInAuth(userId) {
    if (!this.linkedinConfig.clientId || !this.linkedinConfig.clientSecret) {
      throw new Error('LinkedIn OAuth credentials not configured. Please set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET environment variables.');
    }

    // Generate a unique state parameter to prevent CSRF attacks
    const state = uuidv4();
    
    // Store the state and associate it with the user ID
    this.sessions.set(state, {
      userId,
      platform: 'linkedin',
      timestamp: Date.now()
    });
    
    // Cleanup old sessions (older than 1 hour)
    this.cleanupSessions();
    
    // Build the authorization URL
    const authUrl = new URL(this.linkedinConfig.authUrl);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', this.linkedinConfig.clientId);
    authUrl.searchParams.append('redirect_uri', this.linkedinConfig.redirectUri);
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('scope', this.linkedinConfig.scope);
    
    return authUrl.toString();
  }

  /**
   * Process LinkedIn OAuth callback and exchange code for tokens
   * @param {string} code - The authorization code from LinkedIn
   * @param {string} state - The state parameter to verify session
   * @return {Promise<object>} Object containing user ID and profile data
   */
  async processLinkedInCallback(code, state) {
    // Verify state to prevent CSRF attacks
    if (!this.sessions.has(state)) {
      throw new Error('Invalid OAuth state parameter. Authentication session may have expired or been tampered with.');
    }
    
    // Get the user ID associated with this OAuth session
    const { userId } = this.sessions.get(state);
    
    // Exchange the authorization code for access token and ID token
    const tokenResponse = await this.exchangeCodeForTokens(code);
    
    // Get user profile information from LinkedIn
    const profile = await this.getLinkedInProfile(tokenResponse.access_token);
    
    // Clean up the session
    this.sessions.delete(state);
    
    return {
      userId,
      profile
    };
  }

  /**
   * Exchange authorization code for access token and ID token
   * @param {string} code - The authorization code from LinkedIn
   * @return {Promise<object>} Object containing access_token and id_token
   * @private
   */
  async exchangeCodeForTokens(code) {
    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('code', code);
      params.append('redirect_uri', this.linkedinConfig.redirectUri);
      params.append('client_id', this.linkedinConfig.clientId);
      params.append('client_secret', this.linkedinConfig.clientSecret);
      
      const response = await axios.post(this.linkedinConfig.tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error exchanging code for tokens:', error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code for access token');
    }
  }

  /**
   * Get LinkedIn user profile using the access token
   * @param {string} accessToken - The access token from LinkedIn
   * @return {Promise<object>} LinkedIn profile data
   * @private
   */
  async getLinkedInProfile(accessToken) {
    try {
      const response = await axios.get(this.linkedinConfig.userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error getting LinkedIn profile:', error.response?.data || error.message);
      throw new Error('Failed to retrieve LinkedIn profile');
    }
  }

  /**
   * Cleanup old OAuth sessions (older than 1 hour)
   * @private
   */
  cleanupSessions() {
    const now = Date.now();
    const hour = 60 * 60 * 1000; // 1 hour in milliseconds
    
    for (const [state, session] of this.sessions.entries()) {
      if (now - session.timestamp > hour) {
        this.sessions.delete(state);
      }
    }
  }
}

module.exports = OAuthService; 