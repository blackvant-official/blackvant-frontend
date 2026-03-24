// =======================================================
// BLACKVANT — GLOBAL APP INITIALIZER (SINGLE AUTH LAYER)
// =======================================================

(async function () {
  document.addEventListener("DOMContentLoaded", async function () {
    
    // Prevent double execution
    if (window.__APP_INIT__) return;
    window.__APP_INIT__ = true;

    // Detect page type
    const isAuthPage = document.body.classList.contains("auth-page");

    if (isAuthPage) return; // login/signup handle themselves

    // 🔒 REQUIRE AUTH GLOBALLY
    requireAuth({
      redirectTo: "login.html",

      onReady: async (user, clerk) => {
        // ===================================================
        // GLOBAL UI INIT (RUN ON ALL PROTECTED PAGES)
        // ===================================================

        // Mount Clerk User Button (ONLY ONCE)
        const userBtnEl = document.getElementById("clerk-user-button");
        if (userBtnEl && !userBtnEl.dataset.mounted) {
          clerk.mountUserButton(userBtnEl, {
            afterSignOutUrl: "login.html",
          });

          userBtnEl.dataset.mounted = "true";
        }

        // Logout Button (GLOBAL)
        const logoutBtn = document.getElementById("logoutBtn");
        if (logoutBtn && !logoutBtn.dataset.bound) {
          logoutBtn.addEventListener("click", async () => {
            await signOutAndRedirect("login.html");
          });

          logoutBtn.dataset.bound = "true";
        }

        // ===================================================
        // PAGE-SPECIFIC INIT (CONTROLLED)
        // ===================================================

        runPageInit(user, clerk);
      },
    });
  });
})();

// =======================================================
// PAGE ROUTER (VERY IMPORTANT)
// =======================================================

function runPageInit(user, clerk) {
  const path = window.location.pathname;

  if (path.includes("dashboard.html")) {
    if (window.initDashboard) window.initDashboard(user, clerk);
  }

  else if (path.includes("deposit.html") || path.includes("withdraw.html")) {
    if (window.initTransactions) window.initTransactions(user, clerk);
  }

  else if (path.includes("transaction-history.html")) {
    if (window.initHistory) window.initHistory(user, clerk);
  }

  else if (path.includes("profile-settings.html")) {
    if (window.initProfile) window.initProfile(user, clerk);
  }

  else if (path.includes("support.html")) {
    if (window.initSupport) window.initSupport(user, clerk);
  }
}