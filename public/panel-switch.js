// Simple panel switching for sidebar

document.addEventListener('DOMContentLoaded', function () {
    const sidebarSections = document.querySelectorAll('.sidebar-section[data-page]');
    const pages = document.querySelectorAll('.page');

    function showPage(pageId) {
        pages.forEach((page) => {
            page.style.display = page.id === pageId ? '' : 'none';
        });
        sidebarSections.forEach((section) => {
            if (section.getAttribute('data-page') + '' === pageId) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });
    }

    sidebarSections.forEach((section) => {
        section.addEventListener('click', function () {
            const pageId = section.getAttribute('data-page');
            if (pageId) showPage(pageId);
        });
    });

    // Default to lab-page
    showPage('lab-page');
});
