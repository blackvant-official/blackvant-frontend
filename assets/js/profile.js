// =======================================================
// 🔥 ADD BACKEND SUPPORT (Clerk + BlackVant API)
// =======================================================

async function getBackendToken() {
    if (!window.Clerk) return null;
    return window.Clerk.session.getToken({ template: "backend" });
}

const API = async (endpoint, method = "GET", body = null) => {
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
        console.error("API ERROR:", err);
        alert("Server error — please try again.");
        return null;
    }
};

// =======================================================
// 🔥 LOAD USER PROFILE FROM BACKEND
// =======================================================

async function loadUserProfile() {
    const data = await API("/api/v1/me");

    if (!data) return;

    // Fill UI fields
    const fullName = document.getElementById("fullName");
    const phone = document.getElementById("phone");
    const country = document.getElementById("country");

    if (fullName) fullName.value = data.fullName || "";
    if (phone) phone.value = data.phone || "";
    if (country) country.value = data.country || "";

    // Wallets
    renderWallets(data.wallets || []);

    // Notification toggles
    if (data.notifications) {
        Object.entries(data.notifications).forEach(([key, value]) => {
            const toggle = document.getElementById(key);
            if (toggle) toggle.checked = value;
        });
    }
}

// =======================================================
// 🔥 RENDER WALLETS
// =======================================================

function renderWallets(wallets) {
    const list = document.getElementById("cryptoWalletsList");
    if (!list) return;

    // Remove all except Add Button
    [...list.querySelectorAll(".payment-method")].forEach(el => el.remove());

    wallets.forEach(wallet => {
        const el = document.createElement("div");
        el.className = "payment-method";
        el.innerHTML = `
            <div class="method-info">
                <div class="method-icon">₿</div>
                <div class="method-details">
                    <h4>TRC20 Wallet</h4>
                    <p>${wallet.address.substring(0, 10)}...${wallet.address.slice(-5)} • USDT</p>
                </div>
            </div>

            <div class="method-actions">
                <button class="btn-outline btn-sm edit-wallet-btn" data-id="${wallet.id}">Edit</button>
                <button class="btn-danger btn-sm remove-wallet-btn" data-id="${wallet.id}">Remove</button>
            </div>
        `;
        list.insertBefore(el, document.getElementById("addCryptoWalletBtn"));
    });

    setupDynamicWalletButtons();
}

// =======================================================
// 🔥 SAVE PERSONAL INFO (name, phone, country)
// =======================================================

function setupPersonalInfo() {
    const saveBtn = document.getElementById('savePersonalBtn');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', async function () {
        const fullName = document.getElementById("fullName").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const country = document.getElementById("country").value.trim();

        if (!fullName) return alert("Please enter full name");

        this.innerHTML = `<span class="spinner"></span> Saving...`;
        this.disabled = true;

        const result = await API("/api/v1/me/update", "POST", {
            fullName,
            phone,
            country
        });

        this.innerHTML = "Save Changes";
        this.disabled = false;

        if (result) alert("Profile updated successfully!");
    });
}

// =======================================================
// 🔥 ADD + EDIT + DELETE CRYPTO WALLETS
// =======================================================

function setupPaymentMethods() {
    const addBtn = document.getElementById("addCryptoWalletBtn");
    if (!addBtn) return;

    addBtn.addEventListener("click", async function () {
        const walletAddress = prompt("Enter TRC20 wallet address:");
        if (!walletAddress) return;

        if (!walletAddress.startsWith("T") || walletAddress.length < 25)
            return alert("Invalid TRC20 address");

        addBtn.innerHTML = `<span class="spinner"></span> Adding...`;
        addBtn.disabled = true;

        const res = await API("/api/v1/me/wallets/add", "POST", {
            address: walletAddress
        });

        addBtn.innerHTML = "Add Wallet";
        addBtn.disabled = false;

        if (res) {
            renderWallets(res.wallets);
            alert("Wallet added successfully!");
        }
    });
}

function setupDynamicWalletButtons() {
    document.querySelectorAll(".edit-wallet-btn").forEach(btn => {
        btn.addEventListener("click", async function () {
            const id = this.getAttribute("data-id");
            const newAddress = prompt("Enter new wallet address:");
            if (!newAddress) return;

            if (!newAddress.startsWith("T") || newAddress.length < 25)
                return alert("Invalid TRC20 address");

            const res = await API("/api/v1/me/wallets/edit", "POST", {
                id,
                address: newAddress
            });

            if (res) {
                renderWallets(res.wallets);
                alert("Wallet updated!");
            }
        });
    });

    document.querySelectorAll(".remove-wallet-btn").forEach(btn => {
        btn.addEventListener("click", async function () {
            const id = this.getAttribute("data-id");

            if (!confirm("Remove this wallet?")) return;

            const res = await API("/api/v1/me/wallets/remove", "POST", { id });

            if (res) {
                renderWallets(res.wallets);
                alert("Wallet removed.");
            }
        });
    });
}

// =======================================================
// 🔥 SAVE NOTIFICATION SETTINGS
// =======================================================

function setupToggleSwitches() {
    document.querySelectorAll('.toggle-switch input').forEach(toggle => {
        toggle.addEventListener('change', async function () {
            await API("/api/v1/me/notifications/update", "POST", {
                key: this.id,
                value: this.checked
            });
        });
    });
}

// =======================================================
// KEEP ALL EXISTING UI LOGIC (No Changes)
// =======================================================

function setupTabs() { /* unchanged */ }
function setupPasswordStrength() { /* unchanged */ }
function setupPasswordChange() { /* unchanged */ }
function setupDangerZone() { /* unchanged */ }
function updateProfileFromClerk() {
    if (!window.Clerk) return;

    const el = document.getElementById("clerk-account-management");
    if (!el) return;

    function updateProfileFromClerk(clerk) {
        if (!clerk) return;

        const el = document.getElementById("clerk-account-management");
        if (!el) return;

        el.style.display = "block";

        clerk.mountUserProfile(el, {
            appearance: {
                baseTheme: "dark"
            }
        });

        // ✅ hide fallback ONLY after mount attempt
        const fallback = document.getElementById("fallback-profile-ui");
        if (fallback) fallback.style.display = "none";
    }

}


// =======================================================
// INITIALIZE PAGE
// =======================================================

