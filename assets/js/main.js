// ===== MAIN FUNCTIONS FOR LANDING PAGE =====

// ======================================================
// GLOBAL AUTH TOKEN HELPER — REQUIRED FOR BACKEND CALLS
// ======================================================
async function getAuthToken() {
    try {
        // Ensure Clerk is loaded
        await waitForClerk();
        const clerk = window.Clerk;

        if (!clerk.user) return null;

        // Get session token (JWT) for backend authentication
        const token = await clerk.session.getToken({ template: "backend" });

        return token || null;

    } catch (err) {
        console.error("Error getting auth token:", err);
        return null;
    }
}

// Expose it globally
window.getAuthToken = getAuthToken;

// FAQ toggle functionality
function toggleFAQ(element) {
    const faqItem = element.closest('.faq-item');
    const answer = faqItem.querySelector('.faq-answer');
    const icon = element.querySelector('span');
    
    // Toggle active class
    answer.classList.toggle('active');
    
    // Change icon
    if (answer.classList.contains('active')) {
        icon.textContent = '▲';
    } else {
        icon.textContent = '▼';
    }
}

// Smooth scrolling for anchor links
function setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Navbar scroll effect
function setupNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            navbar.style.backdropFilter = 'blur(10px)';
            navbar.style.backgroundColor = 'rgba(15, 17, 23, 0.9)';
        } else {
            navbar.style.backdropFilter = 'none';
            navbar.style.backgroundColor = 'var(--bg-primary)';
        }
    });
}

// Initialize landing page
document.addEventListener('DOMContentLoaded', function() {
    // Only run on landing page
    if (document.body.classList.contains('landing-page')) {
        setupSmoothScrolling();
        setupNavbarScroll();
        
        // Set current year in footer
        const yearElement = document.querySelector('.copyright');
        if (yearElement) {
            const currentYear = new Date().getFullYear();
            yearElement.innerHTML = yearElement.innerHTML.replace('2025', currentYear);
        }
    }
});