// ========================================
// TRANSACTIONS.JS — FINAL STABLE VERSION
// ========================================

// ---------------- DEPOSIT ----------------

function initializeDepositPage() {
    const uploadArea = document.getElementById("uploadArea");
    const fileInput = document.getElementById("fileInput");
    const filePreview = document.getElementById("filePreview");
    const fileName = document.getElementById("fileName");
    const removeFileBtn = document.getElementById("removeFileBtn");
    const amountInput = document.getElementById("amount");
    const amountError = document.getElementById("amountError");
    const submitBtn = document.getElementById("submitBtn");
    const copyBtn = document.getElementById("copyAddressBtn");
    const walletAddress = document.getElementById("walletAddress");

    if (!submitBtn) return;

    // ---- Copy address (RESTORED ORIGINAL FEEL) ----
    if (copyBtn) {
        copyBtn.addEventListener("click", () => {
            const text = copyBtn.getAttribute("data-copy") || walletAddress?.textContent?.trim();
            if (!text) return;

            navigator.clipboard.writeText(text).then(() => {
                const original = copyBtn.textContent;
                const originalBg = copyBtn.style.background;
                copyBtn.textContent = "Copied!";
                copyBtn.style.background = "var(--accent-green)";
                setTimeout(() => {
                    copyBtn.textContent = original;
                    copyBtn.style.background = originalBg;
                }, 2000);
            });
        });
    }

    // ---- File upload ----
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
        const valid = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
        if (!valid.includes(file.type)) {
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
        return valid;
    }

    submitBtn.addEventListener("click", async e => {
        e.preventDefault();

        if (!validateDeposit()) {
            if (parseFloat(amountInput.value) < 100) {
                alert("Minimum deposit amount is $100");
            } else {
                alert("Please upload payment proof");
            }
            return;
        }

        const file = fileInput.files[0];
        const amount = parseFloat(amountInput.value);

        const original = submitBtn.innerHTML;
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

            alert("Deposit submitted successfully. Status: Pending");

            amountInput.value = "";
            fileInput.value = "";
            filePreview.classList.remove("show");
            fileName.textContent = "";

        } catch (err) {
            alert(err.message || "Server error");
        }

        submitBtn.innerHTML = original;
        validateDeposit();
    });

    validateDeposit();
}

// ---------------- WITHDRAW ----------------

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
    const minWithdraw = 10;

    function update() {
        const amount = parseFloat(amountInput.value) || 0;
        const fee = amount * feeRate;
        netDisplay.textContent = "$" + (amount - fee).toFixed(2);
        feeDisplay.textContent = "$" + fee.toFixed(2);
        validate();
    }

    function validate() {
        let valid = true;
        const amount = parseFloat(amountInput.value) || 0;

        if (amount < minWithdraw) {
            amountError.classList.add("show");
            valid = false;
        } else {
            amountError.classList.remove("show");
        }

        if (!walletInput.value.trim()) {
            walletError.classList.add("show");
            valid = false;
        } else {
            walletError.classList.remove("show");
        }

        submitBtn.disabled = !valid;
        return valid;
    }

    amountInput.addEventListener("input", update);
    walletInput.addEventListener("input", validate);

    submitBtn.addEventListener("click", async e => {
        e.preventDefault();
        if (!validate()) {
            alert("Please fill all fields correctly");
            return;
        }

        const original = submitBtn.innerHTML;
        submitBtn.innerHTML = "Processing...";
        submitBtn.disabled = true;

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
                    walletAddress: walletInput.value.trim()
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Withdrawal failed");

            alert("Withdrawal request submitted successfully");

            amountInput.value = "";
            walletInput.value = "";
            update();

        } catch (err) {
            alert(err.message || "Server error");
        }

        submitBtn.innerHTML = original;
        validate();
    });

    update();
}

// ---------------- INIT ----------------

document.addEventListener("DOMContentLoaded", () => {
    if (document.querySelector(".deposit-content")) initializeDepositPage();
    if (document.querySelector(".withdraw-content")) initializeWithdrawPage();
});
