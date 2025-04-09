/**
 * navigationModule.ts - Handles navigation between pages
 */
import { state } from './utils.js';

/**
 * Update the state of navigation tabs based on user data
 * This enables/disables tabs based on whether data is available
 */
export function updateNavigationTabsState(): void {
    const navTabs = document.querySelectorAll('.nav-tab');
    
    // Only proceed if we have tabs
    if (!navTabs || navTabs.length === 0) return;
    
    // Check state to determine which tabs should be enabled
    const hasUser = !!state.currentUserId;
    const hasBasePrompt = !!(state.currentUserData?.basePrompt?.promptText || state.currentBasePromptText);
    const hasAssets = state.selectedAssets.size > 0;
    
    // Get tabs by their data-page attribute
    const interactionsTab = Array.from(navTabs).find(tab => tab.getAttribute('data-page') === 'interactions-page');
    const evaluationTab = Array.from(navTabs).find(tab => tab.getAttribute('data-page') === 'evaluation-page');
    
    // Enable/disable tabs based on prerequisites
    if (interactionsTab) {
        if (hasUser && hasBasePrompt) {
            interactionsTab.classList.remove('disabled-tab');
            interactionsTab.removeAttribute('title');
        } else {
            interactionsTab.classList.add('disabled-tab');
            interactionsTab.setAttribute('title', 'First select a user and generate a base prompt');
        }
    }
    
    if (evaluationTab) {
        if (hasUser && hasBasePrompt) {
            evaluationTab.classList.remove('disabled-tab');
            evaluationTab.removeAttribute('title');
        } else {
            evaluationTab.classList.add('disabled-tab');
            evaluationTab.setAttribute('title', 'First select a user and generate a base prompt');
        }
    }
}

/**
 * Initialize the navigation module
 * @param elements - UI elements for navigation
 */
export function initNavigationModule(elements: { navTabs: NodeListOf<Element>, pages: NodeListOf<Element> }): void {
    // Cache UI element references
    const { navTabs, pages } = elements;
    
    // Initial page handling
    const initialPage = getInitialPage();
    activatePage(initialPage, navTabs, pages);
    
    // Listen for tab click events
    if (navTabs) {
        navTabs.forEach(tab => {
            tab.addEventListener('click', (event) => {
                // Don't navigate if tab is disabled
                if (tab.classList.contains('disabled-tab')) {
                    event.preventDefault();
                    return;
                }
                
                const targetPage = tab.getAttribute('data-page');
                if (targetPage) {
                    activatePage(targetPage, navTabs, pages);
                    saveCurrentPage(targetPage);
                    
                    // Dispatch event when content-library-page is activated
                    if (targetPage === 'content-library-page') {
                        const contentLibraryActivatedEvent = new CustomEvent('content-library-page-activated');
                        document.dispatchEvent(contentLibraryActivatedEvent);
                    }
                    
                    // Dispatch event when interactions-page is activated
                    if (targetPage === 'interactions-page') {
                        const interactionsActivatedEvent = new CustomEvent('interactions-page-activated');
                        document.dispatchEvent(interactionsActivatedEvent);
                    }
                    
                    // Dispatch event when evaluation-page is activated
                    if (targetPage === 'evaluation-page') {
                        const evaluationActivatedEvent = new CustomEvent('evaluation-page-activated');
                        document.dispatchEvent(evaluationActivatedEvent);
                    }
                }
            });
        });
    }
    
    // Call updateNavigationTabsState on user data changes
    document.addEventListener('user-data-loaded', updateNavigationTabsState);
    document.addEventListener('base-prompt-generated', updateNavigationTabsState);
    
    // Initial update of navigation tabs
    updateNavigationTabsState();
    
    console.log('Navigation module initialized');
}

/**
 * Activates a specific page
 */
function activatePage(pageId: string, navTabs: NodeListOf<Element>, pages: NodeListOf<Element>): void {
    console.log(`Activating page: ${pageId}`);
    
    // First deactivate all
    navTabs.forEach(tab => tab.classList.remove('active'));
    pages.forEach(page => page.classList.remove('active'));
    
    // Then activate the target
    const targetTab = Array.from(navTabs).find(tab => tab.getAttribute('data-page') === pageId);
    const targetPage = document.getElementById(pageId);
    
    if (targetTab) targetTab.classList.add('active');
    if (targetPage) targetPage.classList.add('active');
}

/**
 * Saves the current page to sessionStorage
 */
function saveCurrentPage(pageId: string): void {
    try {
        sessionStorage.setItem('currentPage', pageId);
    } catch (e) {
        console.warn('Failed to save current page to sessionStorage:', e);
    }
}

/**
 * Gets the initial page from sessionStorage or defaults to "user-setup-page"
 */
function getInitialPage(): string {
    try {
        const savedPage = sessionStorage.getItem('currentPage');
        return savedPage || 'user-setup-page';
    } catch (e) {
        console.warn('Failed to get initial page from sessionStorage:', e);
        return 'user-setup-page';
    }
}

/**
 * Adds CSS styling for disabled tabs (called once during initialization)
 */
export function addDisabledTabStyling(): void {
    // Check if styling already exists
    if (document.getElementById('disabled-tab-styling')) return;
    
    // Create style element
    const style = document.createElement('style');
    style.id = 'disabled-tab-styling';
    style.textContent = `
        .disabled-tab {
            opacity: 0.5;
            pointer-events: none;
            cursor: not-allowed;
        }
    `;
    
    // Add to document head
    document.head.appendChild(style);
} 