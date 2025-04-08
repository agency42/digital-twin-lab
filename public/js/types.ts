/**
 * types.ts - Shared TypeScript interfaces and types for the frontend
 */

// Basic profile structure (used in Personality, Chat, Assessment)
export interface Profile {
    big_five_traits?: { [key: string]: string };
    [key: string]: any; // Allow for other potential profile fields
}

// Persona variation structure (used in Personality, Chat)
export interface PersonaVariation { 
    id: string;
    systemPrompt: string;
    updatedAt: string; // ISO string
}

// Chat message structure (used in Utils, Chat, UserData)
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

// Consolidated User Data structure (used across multiple modules)
export interface UserData {
    id: string;
    bio?: string;
    linkedInConnected?: boolean;
    createdAt?: string; 
    assessment?: {
        userTipiScores?: Record<string, number> | null;
        aiTipiScores?: Record<string, number> | null;
        userAssessmentResultId?: string | null; // Store the ID of the user's assessment record
        aiAssessmentResultId?: string | null; // Store the ID of the AI's assessment record
    };
    primaryPersona?: { 
        id: string; 
        name?: string; 
        profile: Profile; 
        createdAt: string; 
        updatedAt: string 
    };
    personaVariations?: { [key: string]: PersonaVariation };
    latestChatSession?: { id: string; messages: ChatMessage[] }; 
    generation?: { 
        customPrompt?: string; 
        lastGeneratedProfile?: { json?: Profile } 
    };
    // Add other relevant user fields as needed
}

// Main AppState interface (used in Utils and potentially extended by modules)
export interface AppState {
  currentUserId: string | null;
  currentGeneratedProfile: Profile | null; // Use Profile type
  selectedAssets: Set<string>;
  currentChatHistory: ChatMessage[]; // Use ChatMessage type
  userTipiScores: Record<string, number> | null; // User assessment raw scores (could be moved into UserData.assessment)
  aiTipiScores: Record<string, number> | null; // AI assessment raw scores (could be moved into UserData.assessment)
  currentUserData?: UserData | null; // Holds fetched user data including persona/variations
  currentChatSessionId?: string | null; // ID of the active chat session
  // Consider removing deprecated/unused state fields like currentActiveProfileId
}


// --- Assessment Module Specific Types ---

// TIPI question structure (used in Assessment)
export interface TipiQuestionData {
    id: string;
    text: string;
    direction: 'positive' | 'negative';
    dimension: 'extraversion' | 'agreeableness' | 'conscientiousness' | 'neuroticism' | 'openness';
}

// Structure for a saved assessment result (used in Assessment)
export interface AssessmentResult {
    id: string;
    userId: string;
    assessmentType: string; // e.g., 'TIPI'
    scores: { [key: string]: number }; // Calculated dimension scores (e.g., 1-7 scale)
    rawAnswers?: { [key: string]: number }; // Optional: Raw question answers (e.g., 1-5 scale)
    createdAt: string; // ISO Date string
    // Add other fields if relevant (e.g., personaId if it was an AI assessment)
}

// Structure for alignment scores (used in Assessment)
export interface AlignmentScores {
    itemAgreement: number;
    traitCorrelation: number | null; // Correlation between user/AI dimension scores
    // Add dimension-specific scores/differences if provided by backend
}

// Structure for the overall alignment result (used in Assessment)
export interface AlignmentResult {
    user_result_id: string; // Refers to AssessmentResult ID for user
    ai_result_id: string; // Refers to AssessmentResult ID for AI
    alignment_scores: AlignmentScores;
    // Add other alignment fields if relevant (e.g., timestamp)
} 