import PromptService from './promptService';

/**
 * Service for constructing and formatting prompts for Claude API calls
 * Centralizes all prompt construction logic to ensure database-first approach
 */
class PromptConstructionService {
    private promptService: PromptService;

    constructor() {
        this.promptService = new PromptService();
    }

    /**
     * Constructs a complete chat prompt from database values
     * @param userId The user ID
     * @returns An object with formatted system prompt and user message field names
     */
    async constructChatPrompt(userId: string): Promise<{
        formattedSystemPrompt: string;
        userMessageFieldName: string;
    }> {
        // Get data from database
        const generationsData = await this.promptService.getGenerationsData(userId, 'chat');
        
        // Initialize default values
        let systemPrompt = '';
        let instructions = '';

        // Get system prompt from database (falls back to character card if needed)
        if (generationsData.systemPrompt) {
            systemPrompt = generationsData.systemPrompt.prompt_text;
        } else {
            // If no system prompt, use character card
            const characterCard = await this.promptService.getCurrentCharacterCard(userId);
            if (characterCard) {
                systemPrompt = characterCard.card_data;
            }
        }

        // Get instructions from database
        if (generationsData.instructionTemplate) {
            instructions = generationsData.instructionTemplate.instruction_text;
        } else {
            // Default instructions for chat
            instructions = "Engage in a helpful and informative conversation.";
        }

        // Format the complete system prompt with markdown
        const formattedSystemPrompt = this.formatMarkdownPrompt(
            systemPrompt,
            instructions,
            null  // No examples for chat, pass null
        );

        // In chat, the user input field is simply "message"
        return { 
            formattedSystemPrompt,
            userMessageFieldName: "message" 
        };
    }

    /**
     * Constructs a complete post generation prompt from database values
     * @param userId The user ID
     * @param contentType The type of content (should be 'post')
     * @returns An object with formatted system prompt and user message field name
     */
    async constructPostPrompt(userId: string, contentType: string): Promise<{
        formattedSystemPrompt: string;
        userMessageFieldName: string;
        contentTypeInfo: string;
    }> {
        // Validate contentType is either 'post' or something else valid
        if (contentType !== 'post') {
            console.warn(`Unexpected contentType '${contentType}', expected 'post'. Proceeding anyway.`);
        }
        
        // Get data from database (includes instruction template with examples string)
        const generationsData = await this.promptService.getGenerationsData(userId, 'post');
        
        // Initialize default values
        let systemPrompt = '';
        let instructions = '';
        let examplesString: string | null = null; // Expect examples as a single string

        // Get system prompt from database (falls back to character card if needed)
        if (generationsData.systemPrompt) {
            systemPrompt = generationsData.systemPrompt.prompt_text;
        } else {
            // If no system prompt, use character card
            const characterCard = await this.promptService.getCurrentCharacterCard(userId);
            if (characterCard) {
                systemPrompt = characterCard.card_data;
            }
        }

        // Get instructions AND examples string from the already fetched template
        if (generationsData.instructionTemplate) {
            instructions = generationsData.instructionTemplate.instruction_text;
            examplesString = generationsData.instructionTemplate.examples || null; // Get the raw examples string
        } else {
            // Default instructions if none found - simplified to focus on post generation
            instructions = `Generate content in your authentic voice. Content should be engaging and maintain your unique style.`;
            examplesString = null;
        }

        // Format the complete system prompt with markdown
        const formattedSystemPrompt = this.formatMarkdownPrompt(
            systemPrompt,
            instructions,
            examplesString // Pass the examples string
        );

        // In post generation, the user input field is "mainGoal"
        return { 
            formattedSystemPrompt,
            userMessageFieldName: "mainGoal",
            contentTypeInfo: contentType
        };
    }

    /**
     * Format a complete prompt with all components in markdown
     * @param characterCard The character card JSON string
     * @param instructions Instructions for the prompt
     * @param examplesString Optional: Example content as a single string block
     * @returns Formatted markdown string for the system prompt
     */
    formatMarkdownPrompt(
        characterCard: string,
        instructions: string = "",
        examplesString?: string | null // Accept examples as a string
    ): string {
        // Build markdown document
        let prompt = `# Digital Twin Prompt\n\n`;
        
        // Add character card section
        prompt += `## Character Card\n${characterCard}\n\n`;
        
        // Add instructions section if provided
        if (instructions && instructions.trim()) {
            prompt += `## Instructions\n${instructions}\n\n`;
        }
        
        // Add examples section if provided as a non-empty string
        if (examplesString && examplesString.trim()) {
            prompt += `## Examples\n${examplesString.trim()}\n\n`; // Include the whole string block
        }
        
        return prompt;
    }

    /**
     * Helper method to get system prompt text for a specific user and type
     * @param userId The user ID
     * @param type The type of prompt ('chat' or 'post')
     * @returns The system prompt text
     */
    async getSystemPromptText(userId: string, type: 'chat' | 'post'): Promise<string> {
        const systemPrompt = await this.promptService.getSystemPrompt(userId, type);
        
        if (systemPrompt) {
            return systemPrompt.prompt_text;
        }
        
        // Fall back to character card if no system prompt
        const characterCard = await this.promptService.getCurrentCharacterCard(userId);
        if (characterCard) {
            return characterCard.card_data;
        }
        
        return ''; // Empty string if nothing found
    }

    /**
     * Helper method to get instruction text for a specific user and type
     * @param userId The user ID
     * @param type The type of instructions ('chat' or 'post')
     * @returns The instruction text
     */
    async getInstructionText(userId: string, type: 'chat' | 'post'): Promise<string> {
        const instructionTemplate = await this.promptService.getInstructionTemplate(userId, type);
        
        if (instructionTemplate) {
            return instructionTemplate.instruction_text;
        }
        
        // Default instructions if none found
        if (type === 'chat') {
            return "Engage in a helpful and informative conversation.";
        } else {
            return "Generate content for a specific platform that is authentic and engaging.";
        }
    }
}

export default PromptConstructionService; 