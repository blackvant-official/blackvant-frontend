// ================================
// TRANSACTIONS.JS — FINAL CLEAN VERSION
// ================================

// ---------- DEPOSIT PAGE ----------

function initializeDepositPage() {
    const uploadArea = document.getElementById("uploadArea");
    const fileInput = document.getElementById("fileInput");
    const filePreview = document.getElementById("filePreview");
    const fileName = document.getElementById("fileName");
    const removeFileBtn = document.getElementById("removeFileBtn");
    const amountInput = document.getElementById("amount");
    const amountError = document.getElementById("amountError");
    const submitBtn = document.getElementById("submitBtn");

    if (!submitBtn) return;

    // File upload UI
    uploadArea?.addEventListener("click", () => fileInput.click());

    uploadArea?.addEventListener("dragover", e => {
        e.preventDefault();
        uploadArea.classList.add("dragover");
    });

    uploadArea?.addEventListener("dragleave", () => {
        uploadArea.classList.remove("dragover");
    });

    uploadArea?.addEventListener("drop", e => {
        e.preventDefault();
        uploadArea.classList.remove("dragover");
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });

    fileInput?.addEventListener("change", e => {
        if (e.target.files.length) handleFile(e.target.files[0]);
    });

    removeFileBtn?.addEventListener("click", e => {
        e.stopPropagation();
        fileInput.value = "";
        filePreview.classList.remove("show");
        fileName.textContent = "";
        validateDeposit();
    });

    function handleFile(file) {
        const validTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
        if (!validTypes.includes(file.type)) {
            alert("Only JPG, PNG or PDF allowed");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert("File must be under 5MB");
            return;
        }
        fileName.textContent = file.name;
        filePreview.classList.add("show");
        validateDeposit();
    }

    amountInput?.addEventListener("input", validateDeposit);

    function validateDeposit() {
        const amount = parseFloat(amountInput.value) || 0;
        const hasFile = fileInput.files.length > 0;
        let valid = true;

        if (amount < 100) {
            amountError.classList.add("show");
            amountInput.classList.add("error");
            submitBtn.title = "Minimum deposit is $100";
            valid = false;
        } else {
            amountError.classList.remove("show");
            amountInput.classList.remove("error");
        }

        if (!hasFile) {
            submitBtn.title = "Please upload payment proof";
            valid = false;
        }

        if (valid) submitBtn.title = "";
        submitBtn.disabled = !valid;
    }

    submitBtn.addEventListener("click", async e => {
        e.preventDefault();

        const amount = parseFloat(amountInput.value);
        const file = fileInput.files[0];
        if (!file || amount < 100) return;

        const originalHTML = submitBtn.innerHTML;
        submitBtn.innerHTML = "Processing...";
        submitBtn.disabled = true;

        try {
            const token = await window.Clerk.session.getToken({ template: "backend" });
            const formData = new FormData();
            formData.append("amount", amount);
            formData.append("method", "USDT_TRC20");
            formData.append("txId", "PENDING-" + Date.now());
            formData.append("proof", file);

            const res = await fetch(`${window.API_BASE_URL}/api/v1/me/deposits`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Deposit failed");

            alert("Deposit submitted successfully");
        } catch (err) {
            alert(err.message || "Server error");
        }

        submitBtn.innerHTML = originalHTML;
        submitBtn.disabled = true;
        amountInput.value = "";
        fileInput.value = "";
        filePreview.classList.remove("show");
        fileName.textContent = "";
        validateDeposit();
    });

    validateDeposit();
}

// ---------- WITHDRAW PAGE ----------

function initializeWithdrawPage() {
    const amountInput = document.getElementById("withdrawAmount");
    const walletInput = document.getElementById("walletAddress");
    const amountError = document.getElementById("amountError");
    const walletError = document.getElementById("walletAddressError");
    const feeDisplay = document.getElementById("feeAmount");
    const netDisplay = document.getElementById("netAmount");
    const submitBtn = document.getElementById("submitBtn");

    if (!submitBtn) return;

    const feeRate = 0.005;

    function validateWithdraw() {
        const amount = parseFloat(amountInput.value) || 0;
        const wallet = walletInput.value.trim();
        let valid = true;

        if (amount < 10) {
            amountError.classList.add("show");
            valid = false;
        } else {
            amountError.classList.remove("show");
        }

        if (!wallet) {
            walletError.classList.add("show");
            valid = false;
        } else {
            walletError.classList.remove("show");
        }

        submitBtn.disabled = !valid;
        return valid;
    }

    amountInput.addEventListener("input", () => {
        const amount = parseFloat(amountInput.value) || 0;
        const fee = amount * feeRate;
        feeDisplay.textContent = `$${fee.toFixed(2)}`;
        netDisplay.textContent = `$${(amount - fee).toFixed(2)}`;
        validateWithdraw();
    });

    walletInput.addEventListener("input", validateWithdraw);

    submitBtn.addEventListener("click", async e => {
        e.preventDefault();
        if (!validateWithdraw()) return;

        submitBtn.disabled = true;
        submitBtn.innerHTML = "Processing...";

        try {
            const token = await window.Clerk.session.getToken({ template: "backend" });

            const res = await fetch(`${window.API_BASE_URL}/api/v1/me/withdrawals`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount: parseFloat(amountInput.value),
                    method: "USDT_TRC20",
                    walletAddress: walletInput.value
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Withdraw failed");

            alert("Withdrawal request submitted");
        } catch (err) {
            alert(err.message || "Server error");
        }

        submitBtn.innerHTML = "Request Withdrawal";
        submitBtn.disabled = true;
        amountInput.value = "";
        walletInput.value = "";
        feeDisplay.textContent = "$0.00";
        netDisplay.textContent = "$0.00";
        validateWithdraw();
    });

    validateWithdraw();
}

// ---------- INIT ----------

document.addEventListener("DOMContentLoaded", () => {
    if (document.querySelector(".deposit-content")) initializeDepositPage();
    if (document.querySelector(".withdraw-content")) initializeWithdrawPage();
});
