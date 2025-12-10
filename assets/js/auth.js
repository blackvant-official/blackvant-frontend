// assets/js/auth.js
// Centralized Clerk auth helpers for all pages

window.CLERK_PUBLISHABLE_KEY =
  window.CLERK_PUBLISHABLE_KEY ||
  "pk_test_Y29taWMta2FuZ2Fyb28tMjMuY2xlcmsuYWNjb3VudHMuZGV2JA";

// Wait until Clerk is available and fully loaded
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

  try {
    await window.Clerk.load();
  } catch (e) {
    console.error("Error loading Clerk:", e);
    throw e;
  }

  return window.Clerk;
}

// UI lock/unlock to avoid flashing between states
function lockUI() {
  document.documentElement.classList.add("app-loading");
}

function unlockUI() {
  document.documentElement.classList.remove("app-loading");
}

/* -------------------------------------------------
   🔥 NEW FUNCTION (IMPORTANT FOR BACKEND CALLS)
---------------------------------------------------*/
async function getAuthToken() {
  const clerk = await waitForClerk();
  const session = clerk.session;

  if (!session) return null;

  // Get valid JWT for backend
  return await session.getToken({ template: "backend" }).catch(() => null);
}

/* -------------------------------------------------
   PAGE GUARDS
---------------------------------------------------*/
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

  if (!user) {
    window.location.href = redirectTo;
    return;
  }

  unlockUI();
  if (typeof onReady === "function") onReady(user, clerk);
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

/* -------------------------------------------------
   SIGN OUT
---------------------------------------------------*/
async function signOutAndRedirect(redirectTo = "login.html") {
  const clerk = await waitForClerk();
  await clerk.signOut();
  window.location.href = redirectTo;
}

// Expose globally
window.waitForClerk = waitForClerk;
window.requireGuest = requireGuest;
window.requireAuth = requireAuth;
window.requireAdmin = requireAdmin;
window.signOutAndRedirect = signOutAndRedirect;
window.getAuthToken = getAuthToken; // <-- IMPORTANT

