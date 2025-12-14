// ===== TRANSACTION HISTORY =====

// 🔐 Load transactions from backend (SAFE VERSION)
async function loadTransactionsFromBackend() {
    try {
        if (!window.Clerk || !window.API_BASE_URL) {
            console.warn("Clerk or API_BASE_URL missing");
            return { deposits: [], withdrawals: [] };
        }

        await Clerk.load();

        const session = Clerk.session;
        if (!session) {
            console.warn("No Clerk session");
            return { deposits: [], withdrawals: [] };
        }

        const token = await session.getToken({ template: "backend" });
        if (!token) {
            console.warn("No backend token");
            return { deposits: [], withdrawals: [] };
        }

        const headers = {
            Authorization: `Bearer ${token}`
        };

        const [depRes, witRes] = await Promise.all([
            fetch(`${window.API_BASE_URL}/api/v1/me/deposits`, { headers }),
            fetch(`${window.API_BASE_URL}/api/v1/me/withdrawals`, { headers })
        ]);

        // 🔒 If backend rejects, stop cleanly
        if (!depRes.ok || !witRes.ok) {
            console.warn("Backend rejected transactions request");
            return { deposits: [], withdrawals: [] };
        }

        const deposits = await depRes.json();
        const withdrawals = await witRes.json();

        // 🛡️ HARD SAFETY: guarantee arrays
        return {
            deposits: Array.isArray(deposits) ? deposits : [],
            withdrawals: Array.isArray(withdrawals) ? withdrawals : []
        };

    } catch (err) {
        console.error("Failed to load transactions:", err);
        return { deposits: [], withdrawals: [] };
    }
}

// ======================
// PAGE INITIALIZATION
// ======================
document.addEventListener("DOMContentLoaded", function () {
    requireAuth({
        onReady: async () => {
            const { deposits, withdrawals } = await loadTransactionsFromBackend();

            // Existing rendering logic continues untouched
            renderTransactions(deposits, withdrawals);
        }
    });
});

// ======================
// RENDERING (UNCHANGED)
// ======================
function renderTransactions(deposits, withdrawals) {
    // ⛔ DO NOT CHANGE YOUR EXISTING TABLE/UI CODE HERE
    // This function already exists in your original file
    // and should remain exactly as-is
}
