// =======================================================
// 🔥 BACKEND HELPERS (Clerk + BlackVant API)
// =======================================================

async function getBackendToken() {
    if (!window.Clerk) return null;
    return window.Clerk.session.getToken({ template: "backend" });
}

const API = async (endpoint, method = "POST", body = null) => {
    try {
        const token = await getBackendToken();

        const res = await fetch(`${window.API_BASE_URL}${endpoint}`, {
            method,
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: body ? JSON.stringify(body) : null
        });

        if (!res.ok) throw new Error(await res.text());
        return await res.json();

    } catch (err) {
        console.error("Support API error:", err);
        alert("Server error — please try again.");
        return null;
    }
};

// =======================================================
//        ORIGINAL SUPPORT PAGE LOGIC (UI unchanged)
// =======================================================

// ======================
//   FAQ CATEGORY CLICK
// ======================
function setupFAQCategories() {
    const categories = document.querySelectorAll(".faq-category");

    categories.forEach(cat => {
        cat.addEventListener("click", () => {
            const type = cat.dataset.category;

            categories.forEach(c => c.classList.remove("active"));
            cat.classList.add("active");

            loadFAQ(type);
        });
    });
}

// ======================
//    LOAD FAQ DATA
// ======================
function loadFAQ(type) {

    const titles = {
        account: "Account & Login FAQs",
        crypto: "Crypto Transactions FAQs",
        investment: "Investment & Profits FAQs",
        security: "Security & Verification FAQs"
    };

    let content = `📘 ${titles[type]}\n\n`;

    switch (type) {
        case "account":
            content +=
                "1️⃣ How do I reset my password?\n• Go to Profile Settings → Security\n\n" +
                "2️⃣ How do I enable 2FA?\n• Go to Profile Settings → Two-Factor Auth\n\n" +
                "3️⃣ Can I change my email?\n• Contact support to update email.";
            break;

        case "crypto":
            content +=
                "1️⃣ Which network do I use?\n• Only TRC20 for USDT deposits\n\n" +
                "2️⃣ What is the minimum deposit?\n• $100\n\n" +
                "3️⃣ Withdrawal fee?\n• 0.5% fee applies.";
            break;

        case "investment":
            content +=
                "1️⃣ Daily profit calculation?\n• Up to 1% daily on active investment\n\n" +
                "2️⃣ When are profits added?\n• Every day at 00:00 UTC\n\n" +
                "3️⃣ Can I reinvest profits?\n• Yes, auto-reinvest supported.";
            break;

        case "security":
            content +=
                "1️⃣ Is my crypto secure?\n• 95% stored in cold wallets\n\n" +
                "2️⃣ What security measures exist?\n• 2FA, encryption, audits\n\n" +
                "3️⃣ How to report suspicious activity?\n• Contact support immediately.";
            break;
    }

    alert(content);
}

// ======================
//   TOGGLE ISSUE ITEMS
// ======================
function setupCommonIssues() {
    const issues = document.querySelectorAll(".issue-item");

    issues.forEach(issue => {
        issue.addEventListener("click", () => {
            issues.forEach(i => {
                if (i !== issue) i.classList.remove("active");
            });
            issue.classList.toggle("active");
        });
    });
}

// ======================
//     SEARCH FUNCTION
// ======================
function setupSearch() {
    const input = document.getElementById("faqSearch");
    if (!input) return;

    const issues = document.querySelectorAll(".issue-item");
    const categories = document.querySelectorAll(".faq-category");

    input.addEventListener("input", () => {
        const q = input.value.toLowerCase();

        categories.forEach(cat => {
            const t = cat.innerText.toLowerCase();
            cat.style.borderColor = t.includes(q) ? "var(--accent-blue)" : "";
            cat.style.boxShadow = t.includes(q)
                ? "0 0 0 2px rgba(45,156,255,0.2)"
                : "";
        });

        issues.forEach(issue => {
            const text = issue.innerText.toLowerCase();
            issue.style.display = text.includes(q) ? "block" : "none";
        });

        if (q.length < 2) {
            issues.forEach(i => {
                i.style.display = "block";
                i.classList.remove("active");
            });
            categories.forEach(c => {
                c.style.borderColor = "";
                c.style.boxShadow = "";
            });
        }
    });
}

// ================================
//       LIVE CHAT SIMULATION
// ================================
function setupLiveChat() {
    const btn = document.getElementById("liveChatBtn");
    if (!btn) return;

    btn.addEventListener("click", () => {
        alert("Live Chat simulation will open. Backend version coming soon!");
    });
}

// ================================
//     EMAIL SUPPORT BUTTON
// ================================
function setupEmailSupport() {
    const btn = document.getElementById("emailSupportBtn");
    if (!btn) return;

    btn.addEventListener("click", () => {
        window.location.href = "mailto:support@blackvant.com";
    });
}

// =======================================================
// 🔥 SUPPORT TICKET — CONNECTED TO BACKEND
// =======================================================
function setupSupportForm() {
    const form = document.getElementById("supportForm");
    if (!form) return;

    form.addEventListener("submit", async e => {
        e.preventDefault();

        const subject = document.getElementById("subject").value.trim();
        const description = document.getElementById("description").value.trim();

        if (!subject || description.length < 20) {
            alert("Please select subject and write at least 20 characters.");
            return;
        }

        // Show loading placeholder
        const submitBtn = document.getElementById("submitSupportBtn");
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = `<span class="spinner"></span> Sending...`;
        submitBtn.disabled = true;

        // Send to backend
        const res = await API("/api/v1/support/ticket", "POST", {
            subject,
            description
        });

        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;

        if (!res) return;

        alert(
            `🎫 Support Ticket Created!\n\n` +
            `Ticket ID: ${res.ticketId}\n` +
            `Subject: ${subject}\n\n` +
            `Support will reply within 4 hours.`
        );

        form.reset();
    });
}

// ======================
// INITIALIZE PAGE
// ======================
document.addEventListener("DOMContentLoaded", () => {
    setupFAQCategories();
    setupCommonIssues();
    setupSearch();
    setupSupportForm();
    setupLiveChat();
    setupEmailSupport();
});
