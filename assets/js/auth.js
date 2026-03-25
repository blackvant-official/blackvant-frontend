// assets/js/auth.js
// Centralized Clerk auth helpers for all pages

window.CLERK_PUBLISHABLE_KEY =
  window.CLERK_PUBLISHABLE_KEY ||
  "pk_test_Y29taWMta2FuZ2Fyb28tMjMuY2xlcmsuYWNjb3VudHMuZGV2JA";

// -------------------------------------------------
// WAIT FOR CLERK (HARD SAFE)
// -------------------------------------------------
async function waitForClerk() {
  if (!window.Clerk) {
    await new Promise((resolve) => {
      const check = () => {
        if (window.Clerk) resolve();
        else setTimeout(check, 30);
      };
      check();
    });
  }

  await window.Clerk.load();
  return window.Clerk;
}

// -------------------------------------------------
// UI LOCK
// -------------------------------------------------
function lockUI() {
  document.documentElement.classList.add("app-loading");
}

function unlockUI() {
  document.documentElement.classList.remove("app-loading");
}

// -------------------------------------------------
// TOKEN HELPER (USED BY DASHBOARD / OTHER FILES)
// -------------------------------------------------
async function getAuthToken() {
  const clerk = await waitForClerk();
  const session = clerk.session;
  if (!session) return null;

  return await session
    .getToken({ template: "backend" })
    .catch(() => null);
}

// -------------------------------------------------
// PAGE GUARDS
// -------------------------------------------------
async function requireGuest({ redirectTo = "dashboard.html", onReady } = {}) {
  lockUI();

  const clerk = await waitForClerk();
  const user = clerk.user;

  if (user) {
    window.location.href = redirectTo;
    return;
  }

  unlockUI();
  if (typeof onReady === "function") onReady(null, clerk);
}

async function requireAuth({ redirectTo = "login.html", onReady } = {}) {
  lockUI();

  const clerk = await waitForClerk();
  const user = clerk.user;
  const session = clerk.session;

  if (!user || !session) {
    window.location.href = redirectTo;
    return;
  }

  // 🔒 AUTH IS FULLY READY HERE
  unlockUI();

  if (typeof onReady === "function") {
    await onReady(user, clerk);
  }
}

async function requireAdmin({
  loginRedirect = "/login.html",
  nonAdminRedirect = "/dashboard.html",
  onReady,
} = {}) {
  lockUI();

  const clerk = await waitForClerk();
  const user = clerk.user;

  if (!user) {
    window.location.href = loginRedirect;
    return;
  }

  const role = user.publicMetadata?.role;
  if (role !== "admin") {
    window.location.href = nonAdminRedirect;
    return;
  }

  unlockUI();
  if (typeof onReady === "function") onReady(user, clerk);
}

// -------------------------------------------------
// SIGN OUT
// -------------------------------------------------
async function signOutAndRedirect(redirectTo = "login.html") {
  const clerk = await waitForClerk();
  await clerk.signOut();
  window.location.href = redirectTo;
}

// -------------------------------------------------
// GLOBAL EXPORTS
// -------------------------------------------------
window.waitForClerk = waitForClerk;
window.requireGuest = requireGuest;
window.requireAuth = requireAuth;
window.requireAdmin = requireAdmin;
window.signOutAndRedirect = signOutAndRedirect;
window.getAuthToken = getAuthToken;
