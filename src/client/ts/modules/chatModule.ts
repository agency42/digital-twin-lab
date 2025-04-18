/**
 * chatModule.ts - Handles chat interactions with the digital twin.
 */
import { state, showStatus } from './utils.js';
// Import the function to get the combined prompt from contentMediumModule
import { getCombinedPromptForAPI } from './contentMediumModule.js'; 

interface ChatModuleElements {
    chatHistoryDiv: HTMLDivElement | null;
    chatInput: HTMLInputElement | null;
    sendMessageButton: HTMLButtonElement | null;
    clearChatButton: HTMLButtonElement | null;
    chatStatusDiv: HTMLDivElement | null;
    // Elements related to prompt variations might be removed/simplified
    // systemPromptEditor: HTMLTextAreaElement | null; // Keep if editing is desired here
    // saveVariationButton: HTMLButtonElement | null;
    // resetToBasePromptButton: HTMLButtonElement | null;
}

// UI Elements cache
let chatHistoryDiv: HTMLDivElement | null = null;
let chatInput: HTMLInputElement | null = null;
let sendMessageButton: HTMLButtonElement | null = null;
let clearChatButton: HTMLButtonElement | null = null;
let chatStatusDiv: HTMLDivElement | null = null;
// let systemPromptEditor: HTMLTextAreaElement | null = null; // Keep if needed

// Session management variable removed as unused

/**
 * Initialize the chat module
 */
export function initChatModule(elements: ChatModuleElements): void {
    console.log('Initializing Chat Module...');

    chatHistoryDiv = elements.chatHistoryDiv;
    chatInput = elements.chatInput;
    sendMessageButton = elements.sendMessageButton;
    clearChatButton = elements.clearChatButton;
    chatStatusDiv = elements.chatStatusDiv;
    // systemPromptEditor = elements.systemPromptEditor;

    sendMessageButton?.addEventListener('click', sendMessage);
    chatInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    clearChatButton?.addEventListener('click', clearChat);

    // Listen for user selection changes to clear chat
    document.addEventListener('user-selection-changed', clearChat);

    // Load initial state (e.g., load existing chat history if any)
    // loadChatHistory(); // Implement if session persistence is needed
    clearChat(); // Start with a clean slate for now

    console.log('Chat Module Initialized.');
}

/**
 * Send a message from the user to the backend API.
 */
async function sendMessage(): Promise<void> {
    if (!chatInput || !sendMessageButton || !chatHistoryDiv || !chatStatusDiv) return;

    const messageText = chatInput.value.trim();
    if (!messageText) return; // Don't send empty messages

    if (!state.currentUserId) {
        showStatus(chatStatusDiv, 'Please select a user profile first', 'error');
        return;
    }

    // Get the current combined prompt and instructions from contentMediumModule
    // Ensure contentMediumModule is initialized and has the function available
    // This assumes we are *always* using the 'chat' medium's settings here.
    // If chat prompt can be edited independently, this needs adjustment.
    const promptData = getCombinedPromptForAPI(); // This function needs to be accessible

    if (!promptData) {
        showStatus(chatStatusDiv, 'System prompt or instructions not available. Please configure in Interactions tab.', 'error');
        return;
    }

    // Disable input and button during processing
    chatInput.disabled = true;
    sendMessageButton.disabled = true;
    showStatus(chatStatusDiv, 'Sending message...', 'loading');

    // Add user message to chat history immediately
    appendMessage('user', messageText);
    chatInput.value = ''; // Clear the input field

    try {
        console.log(`Sending chat message for user ${state.currentUserId}`);
        console.log("System Prompt Used (from chat medium):", promptData.systemPrompt);
        console.log("Instruction Used (from chat medium):", promptData.instructions);
        console.log("User Message:", messageText);

        // Use the root endpoint for chat
        const response = await fetch('/api/chat/', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: state.currentUserId,
                systemPrompt: promptData.systemPrompt,
                userMessage: messageText,
                temperature: 0.7, // Or make configurable
                stream: true // Assuming we want streaming
            })
        });

        if (!response.ok) {
            let errorMsg = `Error sending message (${response.status})`;
            try {
                // Try to get error details from the body, even for stream errors initially
                const errorData = await response.json(); 
                errorMsg = errorData.error || errorMsg;
            } catch {
                // Handle non-JSON error responses
                errorMsg = `${errorMsg}: ${response.statusText || 'Server error'}`;
            }
            // Throw before trying to process the stream
            throw new Error(errorMsg); 
        }

        // Handle the SSE stream
        if (response.body) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let currentMessage = ''; // To accumulate AI response text
            let buffer = ''; // Buffer to handle chunks potentially splitting lines

            // Create an element for the AI's message now, we'll update its content
            appendMessage('assistant', ''); // Append empty initially
            const assistantMessageDivs = chatHistoryDiv.querySelectorAll('.assistant-message');
            const lastAssistantMessageDiv = assistantMessageDivs[assistantMessageDivs.length - 1]?.querySelector('.message');

            if (!lastAssistantMessageDiv) {
                throw new Error("Could not find assistant message element to update.");
            }

            try {
                // eslint-disable-next-line no-constant-condition
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) {
                        console.log("Stream finished.");
                        // Final update in case 'complete' event wasn't received cleanly
                        lastAssistantMessageDiv.textContent = currentMessage;
                        showStatus(chatStatusDiv, '', 'info'); // Clear loading status
                        break; // Exit the loop
                    }

                    // Decode the chunk and add to buffer
                    buffer += decoder.decode(value, { stream: true });

                    // Process lines in the buffer
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // Keep the last potentially incomplete line in buffer

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const jsonData = line.substring(6).trim(); // Remove 'data: ' prefix
                            if (jsonData) {
                                try {
                                    const eventData = JSON.parse(jsonData);
                                    if (eventData.type === 'chunk') {
                                        currentMessage += eventData.data;
                                        lastAssistantMessageDiv.textContent = currentMessage; // Update UI progressively
                                        // Scroll down as content is added
                                        chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
                                    } else if (eventData.type === 'complete') {
                                        console.log("Stream complete event received.");
                                        // Final content might be in eventData.data
                                        currentMessage = eventData.data || currentMessage; 
                                        lastAssistantMessageDiv.textContent = currentMessage;
                                        // The 'done' flag from reader.read() should handle loop exit
                                    } else if (eventData.type === 'error') {
                                        console.error("Stream error event received:", eventData.error);
                                        throw new Error(eventData.error || 'Unknown stream error');
                                    }
                                } catch (parseError) {
                                    console.error("Error parsing stream JSON data:", parseError, "Data:", jsonData);
                                    // Don't throw here, maybe just log and continue?
                                }
                            }
                        }
                    }
                }
            } finally {
                // Ensure reader is cancelled if loop exits unexpectedly (e.g., error)
                reader.cancel(); 
            }
        } else {
            throw new Error("Response body is null");
        }

    } catch (error) {
        console.error('Error sending message:', error);
        showStatus(chatStatusDiv, `Error: ${error instanceof Error ? error.message : String(error)}`, 'error');
        // Optionally add an error message to the chat history
        appendMessage('error', `Failed to get reply: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        // Re-enable input and button
        chatInput.disabled = false;
        sendMessageButton.disabled = false;
        chatInput.focus(); // Set focus back to input
    }
}

/**
 * Append a message to the chat history UI.
 * @param sender - 'user' or 'assistant' or 'error'
 * @param text - The message content
 */
function appendMessage(sender: 'user' | 'assistant' | 'error', text: string): void {
    if (!chatHistoryDiv) return;

    const messageWrapper = document.createElement('div');
    messageWrapper.classList.add('message-wrapper', `${sender}-message`);

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    // Basic text display for now, consider markdown rendering later
    messageDiv.textContent = text;

    messageWrapper.appendChild(messageDiv);
    chatHistoryDiv.appendChild(messageWrapper);

    // Scroll to the bottom of the chat history
    chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
}

/**
 * Clear the chat history UI and reset session state.
 */
function clearChat(): void {
    if (chatHistoryDiv) {
        chatHistoryDiv.innerHTML = ''; // Clear messages from UI
        // Add a placeholder message if desired
        appendMessage('assistant', 'Digital Twin Terminal v1.0 - Chat history cleared. Type a message to start.');
    }
    if (chatStatusDiv) {
        showStatus(chatStatusDiv, 'Chat cleared.', 'info', 1500);
    }
    // Session tracking removed; no state to reset
    console.log('Chat history cleared.');
}

// --- Prompt/Variation Handling (Simplified/Removed) ---
// Remove functions related to saving/loading variations specific to the chat module
// if all prompt editing is handled by contentMediumModule.

// Example of how loading might work if chat prompt is independent:
// async function loadChatPromptVariation(): Promise<void> {
//    // Fetch the specific variation for the 'chat' medium
//    // Update systemPromptEditor if it exists
// } 