// =======================================================
// 🔥 BACKEND HELPERS (Clerk + BlackVant API)
// =======================================================

async function getBackendToken() {
    if (!window.Clerk || !window.Clerk.session) return null;
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
//        View botton handler
// =======================================================
async function handleViewTicket(ticketId) {
  try {
    const ticket = await API(`/api/v1/support/ticket/${ticketId}`, "GET");
    
    const message =
      `Ticket ID: ${ticket.ticketId}\n` +
      `Subject: ${ticket.subject}\n` +
      `Status: ${ticket.status}\n\n` +
      ticket.description;

    window.open(
      "data:text/plain;charset=utf-8," + encodeURIComponent(message),
      "_blank"
    );



  } catch (err) {
    alert("Failed to load ticket details");
    console.error(err);
  }
}

// =======================================================
//        ORIGINAL SUPPORT PAGE LOGIC (UI unchanged)
// =======================================================
async function loadSupportTickets() {
    const tbody = document.getElementById("ticketsTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    const tickets = await API("/api/v1/support/tickets", "GET");
    if (!tickets || tickets.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; opacity:0.6;">
                    No support tickets yet
                </td>
            </tr>`;
        return;
    }

    tickets.forEach(t => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
          <td>#${t.ticketId}</td>
          <td>${t.subject}</td>
          <td>
            <span class="status-badge status-${t.status}">
              ${t.status.charAt(0).toUpperCase() + t.status.slice(1)}
            </span>
          </td>

          <td>${new Date(t.createdAt).toLocaleString(undefined, {
                year: "numeric",
                month: "short",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
            })
            }</td>
          <td>
            <button class="view-ticket" data-ticket-id="${t.ticketId}">
              View
            </button>
          </td>
        `;


        tbody.appendChild(tr);

        document.querySelectorAll(".view-ticket").forEach(btn => {
          btn.onclick = () => {
            const ticketId = btn.getAttribute("data-ticket-id");
            handleViewTicket(ticketId);
          };
        });

    });
}

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
        alert("Live chat is coming soon. Please use support tickets for now.");
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

        const subjectSelect = document.getElementById("subject");
        const subject = subjectSelect.options[subjectSelect.selectedIndex].text.trim();
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
        const priority = document.getElementById("priority").value;

        const files = document.getElementById("supportFileInput").files;

        // 1. Create ticket FIRST (we need ticketId)
        const res = await API("/api/v1/support/ticket", "POST", {
          subject,
          description,
          priority
        });

        if (!res) return;

        const ticketId = res.ticketId;

        // 2. Upload attachments (if any)
        if (files.length > 0) {
          await uploadSupportAttachments(files, ticketId);
        }

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
        await loadSupportTickets();

    });
}

async function uploadSupportAttachments(files, ticketId) {
  const uploaded = [];

  for (const file of files) {
    // 1. Request signed upload URL
    const { uploadUrl, storageKey } = await requestUpload({
      purpose: "support",
      file,
      ticketId,
    });

    // 2. Upload to S3
    await putToS3(uploadUrl, file);

    // 3. Confirm upload
    const { attachmentId } = await confirmUpload({
      storageKey,
      purpose: "support",
      mimeType: file.type,
      fileSize: file.size,
      originalName: file.name,
      ticketId,
    });

    uploaded.push(attachmentId);
  }
  console.log("Uploading attachment:", file.name);
  console.log("Files selected:", files.length);

  return uploaded;

}

// ======================
// INITIALIZE PAGE
// ======================
document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("supportFileInput");
    const preview = document.getElementById("supportFilePreview");

    if (fileInput && preview) {
      fileInput.addEventListener("change", () => {
        preview.innerHTML = "";
        Array.from(fileInput.files).forEach(file => {
          const div = document.createElement("div");
          div.className = "file-item";
          div.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
          preview.appendChild(div);
        });
      });
    }
    setupFAQCategories();
    setupCommonIssues();
    setupSearch();
    setupSupportForm();
    setupLiveChat();
    setupEmailSupport();
});
