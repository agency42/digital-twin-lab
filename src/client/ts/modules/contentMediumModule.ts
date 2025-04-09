/**
 * contentMediumModule.ts - Handles content medium instructions for different platforms
 */
import { state, showStatus, generateUniqueId } from './utils.js';
import { ContentMediumType, ContentMediumInstruction } from '../types.js';

// UI Elements cache
interface ContentMediumElements {
    // Medium tabs
    mediumTabs: NodeListOf<Element>;
    // Medium content areas
    mediumContents: NodeListOf<Element>;
    // Instruction fields for each medium
    chatInstruction: HTMLTextAreaElement | null;
    chatMainCharacter: HTMLInputElement | null;
    chatMainGoal: HTMLInputElement | null;
    chatDescription: HTMLTextAreaElement | null;
    chatExamplesContainer: HTMLDivElement | null;
    addChatExampleButton: HTMLButtonElement | null;
    saveChatMediumButton: HTMLButtonElement | null;
    resetChatMediumButton: HTMLButtonElement | null;
    chatMediumStatus: HTMLDivElement | null;
    
    blogInstruction: HTMLTextAreaElement | null;
    blogMainCharacter: HTMLInputElement | null;
    blogMainGoal: HTMLInputElement | null;
    blogDescription: HTMLTextAreaElement | null;
    blogExamplesContainer: HTMLDivElement | null;
    addBlogExampleButton: HTMLButtonElement | null;
    saveBlogMediumButton: HTMLButtonElement | null;
    resetBlogMediumButton: HTMLButtonElement | null;
    blogMediumStatus: HTMLDivElement | null;
    
    tweetInstruction: HTMLTextAreaElement | null;
    tweetMainCharacter: HTMLInputElement | null;
    tweetMainGoal: HTMLInputElement | null;
    tweetDescription: HTMLTextAreaElement | null;
    tweetExamplesContainer: HTMLDivElement | null;
    addTweetExampleButton: HTMLButtonElement | null;
    saveTweetMediumButton: HTMLButtonElement | null;
    resetTweetMediumButton: HTMLButtonElement | null;
    tweetMediumStatus: HTMLDivElement | null;
    
    linkedinInstruction: HTMLTextAreaElement | null;
    linkedinMainCharacter: HTMLInputElement | null;
    linkedinMainGoal: HTMLInputElement | null;
    linkedinDescription: HTMLTextAreaElement | null;
    linkedinExamplesContainer: HTMLDivElement | null;
    addLinkedinExampleButton: HTMLButtonElement | null;
    saveLinkedinMediumButton: HTMLButtonElement | null;
    resetLinkedinMediumButton: HTMLButtonElement | null;
    linkedinMediumStatus: HTMLDivElement | null;
}

// Shared default instruction templates for each medium
const DEFAULT_INSTRUCTIONS: Record<ContentMediumType, ContentMediumInstruction> = {
    chat: {
        id: 'default-chat',
        medium_type: 'chat',
        instruction: 'Respond to user messages in a conversational and helpful manner, maintaining the personality and knowledge of the subject.',
        mainCharacter: 'Digital twin of the user',
        mainGoal: 'Provide helpful, accurate, and authentic responses that reflect the real person',
        parameters: {
            description: 'Chat interactions should be casual yet informative, reflecting the real person\'s communication style and knowledge areas.'
        },
        metadata: {
            id: 'default-chat-metadata',
            createdBy: 'system',
            timestamp: new Date().toISOString()
        },
        examples: ['User: How would you approach solving this problem?\nAssistant: I would start by breaking it down into smaller parts, then...']
    },
    blog: {
        id: 'default-blog',
        medium_type: 'blog',
        instruction: 'Create long-form content that reflects the subject\'s writing style, expertise, and perspectives on relevant topics.',
        mainCharacter: 'Digital twin of the user as a content creator',
        mainGoal: 'Write informative, engaging articles that authentically represent the subject\'s voice and knowledge',
        parameters: {
            description: 'Blog posts should be well-structured with clear headings, coherent paragraphs, and the subject\'s typical tone and depth.'
        },
        metadata: {
            id: 'default-blog-metadata',
            createdBy: 'system',
            timestamp: new Date().toISOString()
        },
        examples: ['# How I Approach Problem Solving\n\nWhen faced with complex challenges, I\'ve found that the best approach is to first understand the problem completely before attempting solutions...']
    },
    tweet: {
        id: 'default-tweet',
        medium_type: 'tweet',
        instruction: 'Create concise, engaging tweets that capture the subject\'s voice, interests, and perspectives in the format of Twitter.',
        mainCharacter: 'Digital twin of the user as a Twitter user',
        mainGoal: 'Write authentic tweets that reflect the subject\'s communication style and interests',
        parameters: {
            description: 'Tweets should be concise, engaging, and reflect the typical hashtags, references, and style the subject would use.'
        },
        metadata: {
            id: 'default-tweet-metadata',
            createdBy: 'system',
            timestamp: new Date().toISOString()
        },
        examples: ['Just finished reading an amazing book on AI ethics - really makes you think about where we\'re heading with this technology. #AIEthics #TechFuture']
    },
    linkedin: {
        id: 'default-linkedin',
        medium_type: 'linkedin',
        instruction: 'Create professional, insightful content appropriate for LinkedIn that reflects the subject\'s professional voice and expertise.',
        mainCharacter: 'Digital twin of the user as a professional',
        mainGoal: 'Produce content that authentically represents the subject\'s professional identity and insights',
        parameters: {
            description: 'LinkedIn posts should be professional yet personable, focusing on industry insights, career achievements, and professional perspectives.'
        },
        metadata: {
            id: 'default-linkedin-metadata',
            createdBy: 'system',
            timestamp: new Date().toISOString()
        },
        examples: ['Excited to share that our team just launched a new project after months of hard work. This initiative will help address [industry problem] by leveraging [technology/approach]. Looking forward to seeing its impact! #ProfessionalAchievement #Innovation']
    }
};

// Current UI elements cache
let uiElements: ContentMediumElements | null = null;
let currentMedium: ContentMediumType = 'chat';

/**
 * Initialize the content medium module
 */
export function initContentMediumModule(): void {
    console.log('Initializing Content Medium Module');
    
    // Cache UI elements
    uiElements = {
        mediumTabs: document.querySelectorAll('.medium-tab'),
        mediumContents: document.querySelectorAll('.medium-content'),
        
        // Chat medium elements
        chatInstruction: document.getElementById('chat-instruction') as HTMLTextAreaElement,
        chatMainCharacter: document.getElementById('chat-main-character') as HTMLInputElement,
        chatMainGoal: document.getElementById('chat-main-goal') as HTMLInputElement,
        chatDescription: document.getElementById('chat-description') as HTMLTextAreaElement,
        chatExamplesContainer: document.getElementById('chat-examples-container') as HTMLDivElement,
        addChatExampleButton: document.getElementById('add-chat-example') as HTMLButtonElement,
        saveChatMediumButton: document.getElementById('save-chat-medium') as HTMLButtonElement,
        resetChatMediumButton: document.getElementById('reset-chat-medium') as HTMLButtonElement,
        chatMediumStatus: document.getElementById('chat-medium-status') as HTMLDivElement,
        
        // Blog medium elements
        blogInstruction: document.getElementById('blog-instruction') as HTMLTextAreaElement,
        blogMainCharacter: document.getElementById('blog-main-character') as HTMLInputElement,
        blogMainGoal: document.getElementById('blog-main-goal') as HTMLInputElement,
        blogDescription: document.getElementById('blog-description') as HTMLTextAreaElement,
        blogExamplesContainer: document.getElementById('blog-examples-container') as HTMLDivElement,
        addBlogExampleButton: document.getElementById('add-blog-example') as HTMLButtonElement,
        saveBlogMediumButton: document.getElementById('save-blog-medium') as HTMLButtonElement,
        resetBlogMediumButton: document.getElementById('reset-blog-medium') as HTMLButtonElement,
        blogMediumStatus: document.getElementById('blog-medium-status') as HTMLDivElement,
        
        // Tweet medium elements
        tweetInstruction: document.getElementById('tweet-instruction') as HTMLTextAreaElement,
        tweetMainCharacter: document.getElementById('tweet-main-character') as HTMLInputElement,
        tweetMainGoal: document.getElementById('tweet-main-goal') as HTMLInputElement,
        tweetDescription: document.getElementById('tweet-description') as HTMLTextAreaElement,
        tweetExamplesContainer: document.getElementById('tweet-examples-container') as HTMLDivElement,
        addTweetExampleButton: document.getElementById('add-tweet-example') as HTMLButtonElement,
        saveTweetMediumButton: document.getElementById('save-tweet-medium') as HTMLButtonElement,
        resetTweetMediumButton: document.getElementById('reset-tweet-medium') as HTMLButtonElement,
        tweetMediumStatus: document.getElementById('tweet-medium-status') as HTMLDivElement,
        
        // LinkedIn medium elements
        linkedinInstruction: document.getElementById('linkedin-instruction') as HTMLTextAreaElement,
        linkedinMainCharacter: document.getElementById('linkedin-main-character') as HTMLInputElement,
        linkedinMainGoal: document.getElementById('linkedin-main-goal') as HTMLInputElement,
        linkedinDescription: document.getElementById('linkedin-description') as HTMLTextAreaElement,
        linkedinExamplesContainer: document.getElementById('linkedin-examples-container') as HTMLDivElement,
        addLinkedinExampleButton: document.getElementById('add-linkedin-example') as HTMLButtonElement,
        saveLinkedinMediumButton: document.getElementById('save-linkedin-medium') as HTMLButtonElement,
        resetLinkedinMediumButton: document.getElementById('reset-linkedin-medium') as HTMLButtonElement,
        linkedinMediumStatus: document.getElementById('linkedin-medium-status') as HTMLDivElement,
    };
    
    // Set up tab switching
    uiElements.mediumTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const medium = target.getAttribute('data-medium') as ContentMediumType;
            if (medium) {
                switchMedium(medium);
            }
        });
    });
    
    // Set up example adding for each medium
    if (uiElements.addChatExampleButton) {
        uiElements.addChatExampleButton.addEventListener('click', () => addExample('chat'));
    }
    if (uiElements.addBlogExampleButton) {
        uiElements.addBlogExampleButton.addEventListener('click', () => addExample('blog'));
    }
    if (uiElements.addTweetExampleButton) {
        uiElements.addTweetExampleButton.addEventListener('click', () => addExample('tweet'));
    }
    if (uiElements.addLinkedinExampleButton) {
        uiElements.addLinkedinExampleButton.addEventListener('click', () => addExample('linkedin'));
    }
    
    // Set up save buttons
    if (uiElements.saveChatMediumButton) {
        uiElements.saveChatMediumButton.addEventListener('click', () => saveMediumInstructions('chat'));
    }
    if (uiElements.saveBlogMediumButton) {
        uiElements.saveBlogMediumButton.addEventListener('click', () => saveMediumInstructions('blog'));
    }
    if (uiElements.saveTweetMediumButton) {
        uiElements.saveTweetMediumButton.addEventListener('click', () => saveMediumInstructions('tweet'));
    }
    if (uiElements.saveLinkedinMediumButton) {
        uiElements.saveLinkedinMediumButton.addEventListener('click', () => saveMediumInstructions('linkedin'));
    }
    
    // Set up reset buttons
    if (uiElements.resetChatMediumButton) {
        uiElements.resetChatMediumButton.addEventListener('click', () => resetMediumInstructions('chat'));
    }
    if (uiElements.resetBlogMediumButton) {
        uiElements.resetBlogMediumButton.addEventListener('click', () => resetMediumInstructions('blog'));
    }
    if (uiElements.resetTweetMediumButton) {
        uiElements.resetTweetMediumButton.addEventListener('click', () => resetMediumInstructions('tweet'));
    }
    if (uiElements.resetLinkedinMediumButton) {
        uiElements.resetLinkedinMediumButton.addEventListener('click', () => resetMediumInstructions('linkedin'));
    }
    
    // Add event handlers for remove example buttons
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('remove-example')) {
            const exampleItem = target.closest('.example-item');
            if (exampleItem && exampleItem.parentNode) {
                exampleItem.parentNode.removeChild(exampleItem);
            }
        }
    });
    
    // Listen for user data loaded event
    document.addEventListener('user-data-loaded', (e) => {
        console.log('Content Medium Module: User data loaded');
        loadUserInstructions();
    });
    
    // Initialize with default instructions
    resetAllMediumInstructions();

    // Set up toggle full prompt button
    const toggleFullPromptButton = document.getElementById('toggle-full-prompt');
    const fullStructuredPrompt = document.getElementById('full-structured-prompt');
    
    if (toggleFullPromptButton && fullStructuredPrompt) {
        toggleFullPromptButton.addEventListener('click', () => {
            const isHidden = fullStructuredPrompt.style.display === 'none';
            fullStructuredPrompt.style.display = isHidden ? 'block' : 'none';
            toggleFullPromptButton.textContent = isHidden ? 'Hide Full Structured Prompt' : 'Show Full Structured Prompt';
            
            // If showing, generate the full structured prompt
            if (isHidden) {
                generateFullStructuredPrompt();
            }
        });
    }
    
    // Set up generate content buttons for each medium
    const generateChatContentButton = document.getElementById('generate-chat-content');
    const generateBlogContentButton = document.getElementById('generate-blog-content');
    
    if (generateChatContentButton) {
        generateChatContentButton.addEventListener('click', () => generateSampleContent('chat'));
    }
    
    if (generateBlogContentButton) {
        generateBlogContentButton.addEventListener('click', () => generateSampleContent('blog'));
    }
    
    // Additional generate buttons would be added here for other mediums
    
    console.log('Content Medium module initialized with interactive features');
}

/**
 * Switch between different medium tabs
 */
function switchMedium(medium: ContentMediumType): void {
    if (!uiElements) return;
    
    currentMedium = medium;
    state.currentContentMedium = medium;
    
    // Update tab UI
    uiElements.mediumTabs.forEach(tab => {
        const tabMedium = tab.getAttribute('data-medium');
        if (tabMedium === medium) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Update content UI
    uiElements.mediumContents.forEach(content => {
        const contentId = content.id;
        if (contentId === `${medium}-medium-content`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

/**
 * Add a new example to the specified medium
 */
function addExample(medium: ContentMediumType): void {
    if (!uiElements) return;
    
    const container = getExampleContainer(medium);
    if (!container) return;
    
    const exampleItem = document.createElement('div');
    exampleItem.className = 'example-item';
    
    const textarea = document.createElement('textarea');
    textarea.className = 'example-text';
    textarea.rows = medium === 'tweet' ? 2 : 3;
    textarea.placeholder = `Example ${getMediumTypeName(medium)}...`;
    
    const removeButton = document.createElement('button');
    removeButton.className = 'remove-example action-button danger-button';
    removeButton.style.width = 'auto';
    removeButton.textContent = 'Remove';
    
    exampleItem.appendChild(textarea);
    exampleItem.appendChild(removeButton);
    container.appendChild(exampleItem);
}

/**
 * Get the appropriate example container element based on medium type
 */
function getExampleContainer(medium: ContentMediumType): HTMLDivElement | null {
    if (!uiElements) return null;
    
    switch (medium) {
        case 'chat':
            return uiElements.chatExamplesContainer;
        case 'blog':
            return uiElements.blogExamplesContainer;
        case 'tweet':
            return uiElements.tweetExamplesContainer;
        case 'linkedin':
            return uiElements.linkedinExamplesContainer;
        default:
            return null;
    }
}

/**
 * Get appropriate status element based on medium type
 */
function getStatusElement(medium: ContentMediumType): HTMLDivElement | null {
    if (!uiElements) return null;
    
    switch (medium) {
        case 'chat':
            return uiElements.chatMediumStatus;
        case 'blog':
            return uiElements.blogMediumStatus;
        case 'tweet':
            return uiElements.tweetMediumStatus;
        case 'linkedin':
            return uiElements.linkedinMediumStatus;
        default:
            return null;
    }
}

/**
 * Get a human-readable name for the medium type
 */
function getMediumTypeName(medium: ContentMediumType): string {
    switch (medium) {
        case 'chat':
            return 'chat exchange';
        case 'blog':
            return 'blog post';
        case 'tweet':
            return 'tweet';
        case 'linkedin':
            return 'LinkedIn post';
        default:
            return 'content';
    }
}

/**
 * Get form values for the specified medium
 */
function getMediumFormValues(medium: ContentMediumType): ContentMediumInstruction | null {
    if (!uiElements) return null;
    
    let instruction = '';
    let mainCharacter = '';
    let mainGoal = '';
    let description = '';
    let examplesContainer: HTMLDivElement | null = null;
    
    switch (medium) {
        case 'chat':
            instruction = uiElements.chatInstruction?.value || '';
            mainCharacter = uiElements.chatMainCharacter?.value || '';
            mainGoal = uiElements.chatMainGoal?.value || '';
            description = uiElements.chatDescription?.value || '';
            examplesContainer = uiElements.chatExamplesContainer;
            break;
        case 'blog':
            instruction = uiElements.blogInstruction?.value || '';
            mainCharacter = uiElements.blogMainCharacter?.value || '';
            mainGoal = uiElements.blogMainGoal?.value || '';
            description = uiElements.blogDescription?.value || '';
            examplesContainer = uiElements.blogExamplesContainer;
            break;
        case 'tweet':
            instruction = uiElements.tweetInstruction?.value || '';
            mainCharacter = uiElements.tweetMainCharacter?.value || '';
            mainGoal = uiElements.tweetMainGoal?.value || '';
            description = uiElements.tweetDescription?.value || '';
            examplesContainer = uiElements.tweetExamplesContainer;
            break;
        case 'linkedin':
            instruction = uiElements.linkedinInstruction?.value || '';
            mainCharacter = uiElements.linkedinMainCharacter?.value || '';
            mainGoal = uiElements.linkedinMainGoal?.value || '';
            description = uiElements.linkedinDescription?.value || '';
            examplesContainer = uiElements.linkedinExamplesContainer;
            break;
        default:
            return null;
    }
    
    // Collect examples
    const examples: string[] = [];
    if (examplesContainer) {
        const exampleTextareas = examplesContainer.querySelectorAll('.example-text') as NodeListOf<HTMLTextAreaElement>;
        exampleTextareas.forEach(textarea => {
            if (textarea.value.trim()) {
                examples.push(textarea.value.trim());
            }
        });
    }
    
    // Get existing instruction data if available, or create a new one
    const existingInstructions = state.currentUserData?.contentMediumInstructions?.[medium];
    
    return {
        id: existingInstructions?.id || `${medium}-${generateUniqueId()}`,
        medium_type: medium,
        instruction,
        mainCharacter,
        mainGoal,
        parameters: {
            description,
            ...existingInstructions?.parameters
        },
        metadata: {
            id: existingInstructions?.metadata?.id || `${medium}-metadata-${generateUniqueId()}`,
            createdBy: existingInstructions?.metadata?.createdBy || 'user',
            timestamp: new Date().toISOString()
        },
        examples
    };
}

/**
 * Set form values for the specified medium
 */
function setMediumFormValues(medium: ContentMediumType, data: ContentMediumInstruction): void {
    if (!uiElements) return;
    
    switch (medium) {
        case 'chat':
            if (uiElements.chatInstruction) uiElements.chatInstruction.value = data.instruction || '';
            if (uiElements.chatMainCharacter) uiElements.chatMainCharacter.value = data.mainCharacter || '';
            if (uiElements.chatMainGoal) uiElements.chatMainGoal.value = data.mainGoal || '';
            if (uiElements.chatDescription) uiElements.chatDescription.value = data.parameters.description || '';
            setExamples('chat', data.examples || []);
            break;
        case 'blog':
            if (uiElements.blogInstruction) uiElements.blogInstruction.value = data.instruction || '';
            if (uiElements.blogMainCharacter) uiElements.blogMainCharacter.value = data.mainCharacter || '';
            if (uiElements.blogMainGoal) uiElements.blogMainGoal.value = data.mainGoal || '';
            if (uiElements.blogDescription) uiElements.blogDescription.value = data.parameters.description || '';
            setExamples('blog', data.examples || []);
            break;
        case 'tweet':
            if (uiElements.tweetInstruction) uiElements.tweetInstruction.value = data.instruction || '';
            if (uiElements.tweetMainCharacter) uiElements.tweetMainCharacter.value = data.mainCharacter || '';
            if (uiElements.tweetMainGoal) uiElements.tweetMainGoal.value = data.mainGoal || '';
            if (uiElements.tweetDescription) uiElements.tweetDescription.value = data.parameters.description || '';
            setExamples('tweet', data.examples || []);
            break;
        case 'linkedin':
            if (uiElements.linkedinInstruction) uiElements.linkedinInstruction.value = data.instruction || '';
            if (uiElements.linkedinMainCharacter) uiElements.linkedinMainCharacter.value = data.mainCharacter || '';
            if (uiElements.linkedinMainGoal) uiElements.linkedinMainGoal.value = data.mainGoal || '';
            if (uiElements.linkedinDescription) uiElements.linkedinDescription.value = data.parameters.description || '';
            setExamples('linkedin', data.examples || []);
            break;
    }
}

/**
 * Set examples for a medium
 */
function setExamples(medium: ContentMediumType, examples: string[]): void {
    const container = getExampleContainer(medium);
    if (!container) return;
    
    // Clear existing examples
    container.innerHTML = '';
    
    // Add examples
    examples.forEach(example => {
        const exampleItem = document.createElement('div');
        exampleItem.className = 'example-item';
        
        const textarea = document.createElement('textarea');
        textarea.className = 'example-text';
        textarea.rows = medium === 'tweet' ? 2 : 3;
        textarea.value = example;
        
        const removeButton = document.createElement('button');
        removeButton.className = 'remove-example action-button danger-button';
        removeButton.style.width = 'auto';
        removeButton.textContent = 'Remove';
        
        exampleItem.appendChild(textarea);
        exampleItem.appendChild(removeButton);
        container.appendChild(exampleItem);
    });
    
    // Add an empty example if there are none
    if (examples.length === 0) {
        const exampleItem = document.createElement('div');
        exampleItem.className = 'example-item';
        
        const textarea = document.createElement('textarea');
        textarea.className = 'example-text';
        textarea.rows = medium === 'tweet' ? 2 : 3;
        textarea.placeholder = `Example ${getMediumTypeName(medium)}...`;
        
        const removeButton = document.createElement('button');
        removeButton.className = 'remove-example action-button danger-button';
        removeButton.style.width = 'auto';
        removeButton.textContent = 'Remove';
        
        exampleItem.appendChild(textarea);
        exampleItem.appendChild(removeButton);
        container.appendChild(exampleItem);
    }
}

/**
 * Save medium instructions to the server
 */
async function saveMediumInstructions(medium: ContentMediumType): Promise<void> {
    if (!state.currentUserId) {
        const statusElement = getStatusElement(medium);
        showStatus(statusElement, 'Please select a user first', 'error');
        return;
    }
    
    const instruction = getMediumFormValues(medium);
    if (!instruction) {
        console.error(`Could not get form values for ${medium} medium`);
        return;
    }
    
    const statusElement = getStatusElement(medium);
    showStatus(statusElement, `Saving ${getMediumTypeName(medium)} instructions...`, 'loading');
    
    try {
        const response = await fetch(`/api/users/${state.currentUserId}/content-medium-instructions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(instruction)
        });
        
        if (!response.ok) {
            throw new Error(`Failed to save ${medium} instructions: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Update the state
        if (!state.currentUserData) {
            state.currentUserData = { id: state.currentUserId };
        }
        
        if (!state.currentUserData.contentMediumInstructions) {
            state.currentUserData.contentMediumInstructions = {} as Record<ContentMediumType, ContentMediumInstruction>;
        }
        
        state.currentUserData.contentMediumInstructions[medium] = data;
        
        showStatus(statusElement, `${getMediumTypeName(medium)} instructions saved successfully`, 'success', 3000);
        
        // Notify other modules that content medium instructions have been updated
        document.dispatchEvent(new CustomEvent('content-medium-updated', {
            detail: { medium, instruction: data }
        }));
        
    } catch (error) {
        console.error(`Error saving ${medium} instructions:`, error);
        showStatus(statusElement, `Error saving instructions: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
}

/**
 * Reset the medium instructions to defaults
 */
function resetMediumInstructions(medium: ContentMediumType): void {
    const defaultInstructions = DEFAULT_INSTRUCTIONS[medium];
    setMediumFormValues(medium, defaultInstructions);
    
    // Show status message
    const statusElement = getStatusElement(medium);
    showStatus(statusElement, `${getMediumTypeName(medium)} instructions reset to default`, 'success', 3000);
}

/**
 * Reset all medium instructions to defaults
 */
function resetAllMediumInstructions(): void {
    resetMediumInstructions('chat');
    resetMediumInstructions('blog');
    resetMediumInstructions('tweet');
    resetMediumInstructions('linkedin');
}

/**
 * Load the user's instructions from the server
 */
async function loadUserInstructions(): Promise<void> {
    if (!state.currentUserId || !state.currentUserData) return;
    
    try {
        // If the instructions already exist in state, use them
        if (state.currentUserData.contentMediumInstructions) {
            const instructions = state.currentUserData.contentMediumInstructions;
            
            // Load each medium's instructions if they exist, otherwise use defaults
            if (instructions.chat) {
                setMediumFormValues('chat', instructions.chat);
            } else {
                resetMediumInstructions('chat');
            }
            
            if (instructions.blog) {
                setMediumFormValues('blog', instructions.blog);
            } else {
                resetMediumInstructions('blog');
            }
            
            if (instructions.tweet) {
                setMediumFormValues('tweet', instructions.tweet);
            } else {
                resetMediumInstructions('tweet');
            }
            
            if (instructions.linkedin) {
                setMediumFormValues('linkedin', instructions.linkedin);
            } else {
                resetMediumInstructions('linkedin');
            }
            
            return;
        }
        
        // Otherwise, fetch them from the server
        const response = await fetch(`/api/users/${state.currentUserId}/content-medium-instructions`);
        
        if (!response.ok) {
            // If the instructions don't exist yet, just use defaults
            if (response.status === 404) {
                resetAllMediumInstructions();
                return;
            }
            
            throw new Error(`Failed to load content medium instructions: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Update the state
        if (!state.currentUserData.contentMediumInstructions) {
            state.currentUserData.contentMediumInstructions = {} as Record<ContentMediumType, ContentMediumInstruction>;
        }
        
        // For each medium, load the instructions if they exist
        ['chat', 'blog', 'tweet', 'linkedin'].forEach((medium) => {
            const mediumType = medium as ContentMediumType;
            if (data[mediumType]) {
                state.currentUserData!.contentMediumInstructions![mediumType] = data[mediumType];
                setMediumFormValues(mediumType, data[mediumType]);
            } else {
                resetMediumInstructions(mediumType);
            }
        });
        
    } catch (error) {
        console.error('Error loading content medium instructions:', error);
        resetAllMediumInstructions();
    }
}

/**
 * Generate the full structured prompt based on current medium selections
 */
function generateFullStructuredPrompt(): void {
    const fullPromptDisplay = document.getElementById('full-prompt-display') as HTMLTextAreaElement;
    const systemPromptEditor = document.getElementById('system-prompt-editor') as HTMLTextAreaElement;
    
    if (!fullPromptDisplay || !systemPromptEditor) return;
    
    // Get the current medium
    const activeTab = document.querySelector('.medium-tab.active');
    const medium = activeTab?.getAttribute('data-medium') || 'chat';
    
    // Get the medium instructions
    let mainInstruction = '';
    let mainCharacter = '';
    let mainGoal = '';
    let description = '';
    let examples: string[] = [];
    
    try {
        switch (medium) {
            case 'chat':
                mainInstruction = (document.getElementById('chat-instruction') as HTMLTextAreaElement)?.value || '';
                mainCharacter = (document.getElementById('chat-main-character') as HTMLInputElement)?.value || '';
                mainGoal = (document.getElementById('chat-main-goal') as HTMLInputElement)?.value || '';
                description = (document.getElementById('chat-description') as HTMLTextAreaElement)?.value || '';
                
                // Get chat examples
                const chatExampleContainers = document.querySelectorAll('#chat-examples-container .example-item');
                chatExampleContainers.forEach(container => {
                    const textArea = container.querySelector('.example-text') as HTMLTextAreaElement;
                    if (textArea && textArea.value.trim()) {
                        examples.push(textArea.value.trim());
                    }
                });
                break;
                
            case 'blog':
                mainInstruction = (document.getElementById('blog-instruction') as HTMLTextAreaElement)?.value || '';
                mainCharacter = (document.getElementById('blog-main-character') as HTMLInputElement)?.value || '';
                mainGoal = (document.getElementById('blog-main-goal') as HTMLInputElement)?.value || '';
                description = (document.getElementById('blog-description') as HTMLTextAreaElement)?.value || '';
                
                // Get blog examples
                const blogExampleContainers = document.querySelectorAll('#blog-examples-container .example-item');
                blogExampleContainers.forEach(container => {
                    const textArea = container.querySelector('.example-text') as HTMLTextAreaElement;
                    if (textArea && textArea.value.trim()) {
                        examples.push(textArea.value.trim());
                    }
                });
                break;
                
            // Additional cases for other mediums would be added here
        }
        
        // Generate a structured prompt
        const baseSystemPrompt = systemPromptEditor.value || '';
        
        const structuredPrompt = {
            instruction: mainInstruction || "Respond to user messages in a conversational and helpful manner.",
            mainCharacter: mainCharacter || "Digital twin of the user",
            mainGoal: mainGoal || "Provide accurate, authentic responses that reflect the real person.",
            parameters: {
                description: description || "Chat interactions should be casual yet informative, reflecting the real person's style.",
                medium: medium,
                examples: examples
            },
            baseSystemPrompt: baseSystemPrompt
        };
        
        // Display the structured prompt
        fullPromptDisplay.value = JSON.stringify(structuredPrompt, null, 2);
        
    } catch (error) {
        console.error('Error generating full structured prompt:', error);
        fullPromptDisplay.value = `Error generating structured prompt: ${error instanceof Error ? error.message : String(error)}`;
    }
}

/**
 * Generate sample content for the selected medium
 * @param medium - The medium to generate content for (chat, blog, etc.)
 */
async function generateSampleContent(medium: string): Promise<void> {
    if (!state.currentUserId) {
        alert('Please select a user first');
        return;
    }
    
    // Get the relevant UI elements
    const chatStatus = document.getElementById('chat-status');
    const blogStatus = document.getElementById('blog-medium-status');
    
    try {
        // Generate the full structured prompt first
        generateFullStructuredPrompt();
        
        // Get the structured prompt
        const fullPromptDisplay = document.getElementById('full-prompt-display') as HTMLTextAreaElement;
        let structuredPrompt: any = {};
        
        try {
            structuredPrompt = JSON.parse(fullPromptDisplay.value);
        } catch (error) {
            throw new Error('Could not parse the structured prompt. Please check the format.');
        }
        
        // Show loading status
        switch (medium) {
            case 'chat':
                showStatus(chatStatus, 'Generating sample chat interaction...', 'loading');
                break;
            case 'blog':
                showStatus(blogStatus, 'Generating blog article...', 'loading');
                break;
            // Add cases for other mediums
        }
        
        // Simulate a delay (in a real app, this would be an API call)
        // In a production app, you would call your backend API here
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // For the demo, generate some placeholder content
        switch (medium) {
            case 'chat':
                // Get chat history div
                const chatHistory = document.getElementById('chat-history');
                if (chatHistory) {
                    // Add a user message
                    const userMessage = document.createElement('div');
                    userMessage.className = 'message-wrapper user-message';
                    userMessage.innerHTML = `<div class="message">How would you describe yourself?</div>`;
                    chatHistory.appendChild(userMessage);
                    
                    // Add an assistant message
                    const assistantMessage = document.createElement('div');
                    assistantMessage.className = 'message-wrapper assistant-message';
                    assistantMessage.innerHTML = `<div class="message">I would describe myself as ${structuredPrompt.mainCharacter || 'a digital twin'} focused on ${structuredPrompt.mainGoal || 'helping you'}. My communication style is thoughtful and responsive, and I try to reflect the authentic voice of the person I represent.</div>`;
                    chatHistory.appendChild(assistantMessage);
                    
                    // Scroll to bottom
                    chatHistory.scrollTop = chatHistory.scrollHeight;
                    
                    showStatus(chatStatus, 'Sample chat interaction generated!', 'success', 3000);
                }
                break;
                
            case 'blog':
                // Get blog output container
                const blogOutputContainer = document.getElementById('blog-output-container');
                const blogOutputTitle = document.getElementById('blog-output-title');
                const blogOutputContent = document.getElementById('blog-output-content');
                
                if (blogOutputContainer && blogOutputTitle && blogOutputContent) {
                    blogOutputTitle.textContent = "The Future of Digital Communication";
                    blogOutputContent.textContent = `As ${structuredPrompt.mainCharacter || 'someone'} who has spent years thinking about technology, I believe we're at an inflection point in how we interact with digital systems.

The evolution of AI and natural language processing has fundamentally changed what's possible in human-computer interaction. Gone are the days of rigid command structures and limited response patterns.

What I find most interesting about this shift is how it's forcing us to reconsider what makes communication "human." When a computer can generate prose that's indistinguishable from human writing, what unique value do we bring to the conversation?

${structuredPrompt.parameters?.description || 'This is something I think about frequently.'}

I believe the answer lies not in the words themselves, but in the authentic lived experiences behind them. Technology can mimic our communication patterns, but it cannot yet live a human life with all its complexity and contradiction.

What are your thoughts on this technological evolution? I'd love to continue this conversation in the comments.`;

                    // Show the output container
                    blogOutputContainer.style.display = 'block';
                    
                    showStatus(blogStatus, 'Blog article generated successfully!', 'success', 3000);
                }
                break;
                
            // Add cases for other mediums
        }
        
    } catch (error) {
        console.error(`Error generating ${medium} content:`, error);
        
        // Show error status
        switch (medium) {
            case 'chat':
                showStatus(chatStatus, `Error generating chat: ${error instanceof Error ? error.message : String(error)}`, 'error');
                break;
            case 'blog':
                showStatus(blogStatus, `Error generating blog: ${error instanceof Error ? error.message : String(error)}`, 'error');
                break;
            // Add cases for other mediums
        }
    }
} 