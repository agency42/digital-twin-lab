/**
 * utils.ts - Shared utility functions
 */

// Import shared interfaces from the central types file
import { AppState, BasePromptText } from './types'; // Updated import path

// Define shared interfaces (can be moved to a dedicated types file later)
// --- REMOVED INTERFACES (moved to types.ts) ---
// interface Profile { ... }
// interface PersonaVariation { ... } 
// interface UserData { ... }
// interface ChatMessage { ... }
// interface AppState { ... }


// Global state - initialized with the extended AppState
export const state: AppState = {
  currentUserId: null,
  currentBasePromptText: null, // Added
  selectedAssets: new Set<string>(),
  currentChatHistory: [], // Use ChatMessage type from types.ts
  userTipiScores: null, 
  aiTipiScores: null,
  currentUserData: null, // Use UserData type from types.ts
  currentChatSessionId: null,
  currentContentMedium: null
};

/**
 * Generate a unique ID (simple implementation)
 * @returns A unique ID string
 */
export function generateUniqueId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Define StatusType - add 'warning' if needed, or map warnings to info/error
type StatusType = 'success' | 'error' | 'loading' | 'info';

/**
 * Show a status message in a given container
 * @param container - The container element (can be null)
 * @param message - The message to display
 * @param type - The type of status
 * @param timeout - Optional timeout (ms)
 */
export function showStatus(container: HTMLElement | null, message: string, type: StatusType, timeout?: number): void {
  if (!container) {
    console.warn("showStatus called with null container for message:", message);
    return;
  }

  // First clear any existing status classes
  container.classList.remove('success', 'error', 'loading', 'info');

  // Set the message and add the appropriate class
  container.textContent = message;
  container.classList.add(type);
  container.style.display = 'block';

  // If a timeout is provided, clear the status after that time
  if (timeout) {
    setTimeout(() => {
      if (container) { // Check container still exists
          container.textContent = '';
          container.style.display = 'none';
      }
    }, timeout);
  }
}

/**
 * Create a debounced version of a function
 * @param func - The function to debounce
 * @param delay - The delay in milliseconds
 * @returns The debounced function
 */
// Using a generic type for better type safety with debounced functions
export function debounce<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    return function(this: any, ...args: Parameters<T>): void {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}


/**
 * Format message content for display in chat
 * @param content - The message content (can be null or undefined)
 * @returns The formatted content as an HTML string
 */
export function formatMessageContent(content: string | null | undefined): string {
  if (!content) return '';

  // Escape HTML
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Simple markdown-style formatting
  return escaped
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold
    .replace(/\*(.*?)\*/g, '<em>$1</em>')              // Italic
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>') // Code blocks
    .replace(/`([^`]+)`/g, '<code>$1</code>')          // Inline code
    .replace(/\n/g, '<br>');                           // Line breaks
} 