/**
 * types.ts - Shared TypeScript interfaces and types for the frontend
 */

// Base Prompt structure (String-based)
// We avoid a detailed structure here to allow flexibility in prompt generation
export type BasePromptText = string;

// Prompt Variation structure
export interface PromptVariation {
    variation_id: string; // Renamed from id for consistency with DB
    base_prompt_id: string; // Link to the base prompt
    module_context: string; // e.g., 'chat', 'assessment'
    system_prompt_override: string | null; // The actual variation text, renamed
    updated_at: string; // ISO string
}

// Chat message structure (used in Utils, Chat, UserData)
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

// Content Medium Instruction Interface
export interface ContentMediumInstruction {
    id: string;
    medium_type: ContentMediumType;
    instruction: string;
    mainCharacter: string;
    mainGoal: string;
    parameters: {
        description: string;
        inputs?: Record<string, string>;
        outputs?: {
            expectedType: string;
            destination?: string;
        };
        execution?: {
            priority?: number;
            dependencies?: string[];
            retries?: number;
            timeout?: number;
        };
        agent?: {
            capabilities?: string[];
            stateTracking?: {
                required: boolean;
                variables?: string[];
            };
            learning?: {
                enabled: boolean;
                feedbackEndpoint?: string;
            };
        };
    };
    metadata: {
        id: string;
        createdBy: string;
        timestamp: string;
    };
    examples?: string[];
}

export type ContentMediumType = 'chat' | 'blog' | 'tweet';

// Consolidated User Data structure (using new prompt terminology)
export interface UserData {
    id: string;
    bio?: string;
    createdAt?: string;
    assessment?: {
        // Keep assessment structure for now
        userTipiScores?: Record<string, number> | null;
        aiTipiScores?: Record<string, number> | null;
        userAssessmentResultId?: string | null;
        aiAssessmentResultId?: string | null;
    };
    basePrompt?: {
        // Renamed from primaryPersona
        id: string; // Renamed from base_prompt_id for frontend consistency?
        name?: string | null; // Renamed from prompt_name
        promptText: BasePromptText; // Renamed from profile: Profile
        createdAt: string;
        updatedAt: string;
    } | null; // Allow null if no base prompt exists
    promptVariations?: { [moduleContext: string]: PromptVariation }; // Renamed from personaVariations
    contentMediumInstructions?: { [mediumType in ContentMediumType]?: ContentMediumInstruction }; // Added content medium instructions
    latestChatSession?: { id: string; messages: ChatMessage[] };
}

// Main AppState interface (using new prompt terminology)
export interface AppState {
    currentUserId: string | null;
    selectedAssets: Set<string>;
    userTipiScores: Record<string, number> | null;
    aiTipiScores: Record<string, number> | null;
    currentUserData: any | null; // TODO: Define a proper UserData type if needed
    currentChatSessionId: string | null;
    currentContentMedium: 'chat' | 'post' | null;
    currentCharacterCardData: CharacterCard | null;
    currentSystemPrompt: SystemPrompt | null;
    currentInstructionTemplate: InstructionTemplate | null;
    currentChatHistory?: any[]; // TODO: Use specific ChatMessage type if available
}

// --- Assessment Module Specific Types ---
// (Keep Assessment types for now, may need adjustment later based on prompt usage)

export interface TipiQuestionData {
    id: string;
    text: string;
    direction: 'positive' | 'negative';
    dimension: 'extraversion' | 'agreeableness' | 'conscientiousness' | 'neuroticism' | 'openness';
}

export interface AssessmentResult {
    id: string;
    userId: string;
    assessmentType: string;
    scores: { [key: string]: number };
    rawAnswers?: { [key: string]: number };
    createdAt: string;
    base_prompt_id?: string | null; // Added link (optional)
    prompt_variation_id?: string | null; // Added link (optional)
}

export interface AlignmentScores {
    itemAgreement: number;
    traitCorrelation: number | null;
}

export interface AlignmentResult {
    user_result_id: string;
    ai_result_id: string;
    alignment_scores: AlignmentScores;
}

// Add the new interfaces from promptService
export interface CharacterCard {
    id: string;
    user_id: string;
    card_name?: string | null;
    card_data: string; // JSON string
    is_current: number; // 0 or 1
    based_on_assets?: string | null; // JSON string of asset IDs
    created_at: string;
    updated_at: string;
}

export interface SystemPrompt {
    id: string;
    user_id: string;
    type: 'chat' | 'post';
    prompt_text: string;
    is_custom: number; // 0 or 1
    created_at: string;
    updated_at: string;
}

export interface InstructionTemplate {
    id?: number;
    user_id: string;
    type: string;
    instruction_text: string;
    mainGoal?: string | null;
    examples?: string | null;
    created_at: string;
    updated_at: string;
}

// Added from docs/agent-data-structures.md
export interface Prompt_config {
    id: string; // Unique identifier
    content: string;
    image?: string; // Optional image
    role: 'user' | 'system'; // user | system
}

// Added from docs/agent-data-structures.md
export interface Function_config {
    // Define the structure based on how functions are actually configured
    // Placeholder for now
    name: string;
    description: string;
    parameters: any; // Use a more specific type if possible
}

export interface Tool {
    id: string; // Tool ID
    type: string;
    function: Function_config;
}

// Define the structure of the JSON stored in CharacterCard.card_data
export interface CharacterData {
    id: string; // Unique identifier (optional within the data itself?)
    agent_id: string; // Public unique identifier
    botName: string; // Agent name
    bio?: string; // Optional character biography
    sytem_prompt: string | Prompt_config; // system_prompt in markdown
    // --- OPTIONALS --- //
    version?: number; // Version number of the Agent
    api_key?: string; // key that can be used for the character
    memory_system_prompt?: string | Prompt_config[]; // memory_system_prompt in markdown
    summary_system_prompt?: string | Prompt_config[]; // summary_system_prompt in markdown
    primary_model?: string; // Primary model in use
    logic_model_url?: string; // URL for logic model
    image_model_url?: string; // URL for image processing model
    lora_url?: string; // URL for LoRA tuning
    boredom?: number; // Boredom factor influencing agent behavior
    tools?: Tool[];
}
