/**
 * navigationModule.ts - Handles navigation between tabs
 */
import { state, showStatus } from './utils.js'; // Correct relative path
// Module state/cache
let navTabs = null;
let pageContainers = null;
/**
 * Initialize the navigation module
 * @param elements - UI elements containing navTabs and pages
 */
export function initNavigationModule(elements) {
    navTabs = elements.navTabs;
    pageContainers = elements.pages;
    console.log('Navigation module initialized with', navTabs ? navTabs.length : 0, 'tabs and', pageContainers ? pageContainers.length : 0, 'pages');
    // Add click event listeners to tabs
    if (navTabs) {
        navTabs.forEach(tab => {
            // Ensure tab is an element that can have event listeners
            if (tab instanceof HTMLElement) {
                tab.addEventListener('click', handleNavTabClick);
            }
        });
    }
    // Initial state update
    updateNavigationTabsState();
}
/**
 * Handle navigation tab clicks
 * @param event - The click event
 */
function handleNavTabClick(event) {
    // Use currentTarget and assert it's an HTMLElement
    const tab = event.currentTarget;
    if (!tab)
        return;
    // Skip if already active
    if (tab.classList.contains('active'))
        return;
    // Get target page ID
    const targetPageId = tab.getAttribute('data-page');
    if (!targetPageId) {
        console.warn('Clicked tab is missing data-page attribute');
        return;
    }
    console.log('Tab clicked:', targetPageId, 'Current user:', state.currentUserId, 'Tab class:', tab.className);
    // Fix for issue where currentUserId might be lost
    if (state.currentUserId === null) {
        const userDisplaySpan = document.getElementById('current-user-display');
        if (userDisplaySpan?.textContent && userDisplaySpan.textContent !== 'None Selected') {
            console.log('Restoring lost user context during tab navigation:', userDisplaySpan.textContent);
            state.currentUserId = userDisplaySpan.textContent;
        }
    }
    // Get potential status element
    const contentLibraryStatusDiv = document.getElementById('content-library-status');
    // SPECIAL HANDLING FOR CONTENT LIBRARY TAB
    if (targetPageId === 'content-library-page') {
        const userDisplaySpan = document.getElementById('current-user-display');
        const hasUserInUI = userDisplaySpan?.textContent && userDisplaySpan.textContent !== 'None Selected';
        if (state.currentUserId || hasUserInUI) {
            if (hasUserInUI && !state.currentUserId) {
                // Ensure textContent is not null/empty before assigning
                if (userDisplaySpan?.textContent) {
                    state.currentUserId = userDisplaySpan.textContent;
                    console.log('Updated state.currentUserId from UI:', state.currentUserId);
                }
            }
            console.log('Allowing navigation to Content Library with user:', state.currentUserId);
            // Force remove disabled state
            tab.classList.remove('disabled');
            tab.style.opacity = '1';
            tab.style.pointerEvents = 'auto';
            tab.setAttribute('data-enabled', 'true');
            // Make sure to load assets when navigating to Content Library
            // Define detail type for CustomEvent
            const eventDetail = { detail: { userId: state.currentUserId } };
            document.dispatchEvent(new CustomEvent('content-library-page-activated', eventDetail));
        }
        else {
            // No user, so keep content library disabled
            console.log('Content Library tab requires a user to be selected');
            // Ensure status div exists before showing status
            showStatus(contentLibraryStatusDiv ?? document.createElement('div'), 'Please select a user first to access the Content Library', 'error');
            return;
        }
    }
    else if (tab.classList.contains('disabled')) {
        console.log('Navigation blocked - tab is disabled');
        return;
    }
    // Force UI update to show correct state after context restoration
    updateNavigationTabsState();
    // Update active states
    if (navTabs) {
        navTabs.forEach(t => t.classList.remove('active'));
    }
    if (pageContainers) {
        pageContainers.forEach(p => p.classList.remove('active'));
    }
    // Activate clicked tab and corresponding page
    tab.classList.add('active');
    const targetPage = document.getElementById(targetPageId);
    if (targetPage instanceof HTMLElement) {
        targetPage.classList.add('active');
        // Perform any necessary page-specific initialization
        handlePageTransition(targetPageId);
    }
    else {
        console.error(`Target page element with ID '${targetPageId}' not found or not an HTMLElement.`);
    }
}
/**
 * Handle actions needed when transitioning to a specific page
 * @param pageId - The ID of the page being navigated to
 */
export function handlePageTransition(pageId) {
    console.log('Page transition to:', pageId, 'Current user:', state.currentUserId);
    if (!state.currentUserId) {
        console.warn('Page transition attempted with no user selected');
        return; // Nothing to do if no user is selected
    }
    // Define detail type for CustomEvent
    const eventDetail = { detail: { pageId, userId: state.currentUserId } };
    // Dispatch events for page transition
    const genericEvent = new CustomEvent('page-transition', eventDetail);
    document.dispatchEvent(genericEvent);
    // Also dispatch a specific event for the page
    const specificEvent = new CustomEvent(`${pageId}-activated`, eventDetail);
    document.dispatchEvent(specificEvent);
}
/**
 * Update the state of navigation tabs based on current user and data availability
 */
export function updateNavigationTabsState() {
    if (!navTabs) {
        console.error('updateNavigationTabsState: navTabs is null or undefined!');
        return;
    }
    // Debug: Log the current state
    console.log('Navigation module state check:', {
        currentUserId: state.currentUserId,
        currentGeneratedProfile: !!state.currentGeneratedProfile ? 'exists' : 'missing',
        currentUserData: !!state.currentUserData ? 'exists' : 'missing',
        currentUserData_primaryPersona: !!state.currentUserData?.primaryPersona ? 'exists' : 'missing',
        currentUserData_primaryPersona_profile: !!state.currentUserData?.primaryPersona?.profile ? 'exists' : 'missing',
        currentUserData_primaryPersona_id: state.currentUserData?.primaryPersona?.id || 'missing'
    });
    // Check for profile from all possible sources:
    const hasGeneratedProfile = !!state.currentGeneratedProfile;
    const hasUserDataProfile = !!state.currentUserData?.primaryPersona?.profile;
    const hasPrimaryPersonaId = !!state.currentUserData?.primaryPersona?.id;
    // If any of these conditions is true, the user has a profile
    const hasProfile = hasGeneratedProfile || hasUserDataProfile || hasPrimaryPersonaId;
    console.log('Updating navigation tab states with:', {
        currentUserId: state.currentUserId,
        hasGeneratedProfile,
        hasUserDataProfile,
        hasPrimaryPersonaId,
        hasProfile
    });
    // Get each tab separately to maintain type safety
    const userSetupTab = document.getElementById('user-setup-tab');
    const contentLibraryTab = document.getElementById('content-library-tab');
    const chatTab = document.getElementById('chat-tab');
    const alignmentTab = document.getElementById('alignment-tab');
    // Update each tab individually with proper type checking
    if (userSetupTab) {
        const targetPageId = userSetupTab.getAttribute('data-target') || '';
        const shouldEnable = true; // Always enabled
        console.log(`Tab ${targetPageId} - shouldEnable: ${shouldEnable} (User: ${state.currentUserId || 'null'}, Profile: ${hasProfile})`);
        userSetupTab.setAttribute('data-enabled', shouldEnable.toString());
        userSetupTab.classList.toggle('disabled-tab', !shouldEnable);
    }
    if (contentLibraryTab) {
        const targetPageId = contentLibraryTab.getAttribute('data-target') || '';
        const shouldEnable = !!state.currentUserId;
        console.log(`Tab ${targetPageId} - shouldEnable: ${shouldEnable} (User: ${state.currentUserId || 'null'}, Profile: ${hasProfile})`);
        contentLibraryTab.setAttribute('data-enabled', shouldEnable.toString());
        contentLibraryTab.classList.toggle('disabled-tab', !shouldEnable);
    }
    if (chatTab) {
        const targetPageId = chatTab.getAttribute('data-target') || '';
        const shouldEnable = !!state.currentUserId && hasProfile;
        console.log(`Tab ${targetPageId} - shouldEnable: ${shouldEnable} (User: ${state.currentUserId || 'null'}, Profile: ${hasProfile})`);
        chatTab.setAttribute('data-enabled', shouldEnable.toString());
        chatTab.classList.toggle('disabled-tab', !shouldEnable);
    }
    if (alignmentTab) {
        const targetPageId = alignmentTab.getAttribute('data-target') || '';
        const shouldEnable = !!state.currentUserId && hasProfile;
        console.log(`Tab ${targetPageId} - shouldEnable: ${shouldEnable} (User: ${state.currentUserId || 'null'}, Profile: ${hasProfile})`);
        alignmentTab.setAttribute('data-enabled', shouldEnable.toString());
        alignmentTab.classList.toggle('disabled-tab', !shouldEnable);
    }
}
/**
 * Navigate to a specific tab programmatically
 * @param pageId - ID of the page to navigate to
 */
export function navigateToPage(pageId) {
    const tab = document.querySelector(`.nav-tab[data-page="${pageId}"]`);
    // Check if tab exists and is an HTMLElement before clicking
    if (tab instanceof HTMLElement && !tab.classList.contains('disabled')) {
        // Use click() to trigger the same logic as user interaction
        tab.click();
    }
    else if (tab) {
        console.warn(`Navigation to page '${pageId}' blocked: Tab is disabled or not found.`);
    }
}
//# sourceMappingURL=navigationModule.js.map