// ================================
// TRANSACTIONS.JS — FIXED VERSION
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
    const copyAddressBtn = document.getElementById("copyAddressBtn");

    if (!submitBtn) return;

    // Initialize copy address button
    if (copyAddressBtn) {
        copyAddressBtn.addEventListener("click", function() {
            const address = this.getAttribute("data-copy") || document.getElementById("walletAddress")?.textContent?.trim();
            if (address) {
                navigator.clipboard.writeText(address)
                    .then(() => {
                        const originalText = this.textContent;
                        this.textContent = "Copied!";
                        setTimeout(() => {
                            this.textContent = originalText;
                        }, 2000);
                    })
                    .catch(err => {
                        console.error("Failed to copy:", err);
                        alert("Failed to copy address. Please copy manually.");
                    });
            }
        });
    }

    // File upload UI
    uploadArea?.addEventListener("click", () => fileInput?.click());

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
    amountInput?.addEventListener("blur", validateDeposit);

    function validateDeposit() {
        const amount = parseFloat(amountInput.value) || 0;
        const hasFile = fileInput?.files?.length > 0;
        let isValid = true;

        // Amount validation
        if (amount < 100) {
            amountError.classList.add("show");
            amountInput.classList.add("error");
            isValid = false;
        } else {
            amountError.classList.remove("show");
            amountInput.classList.remove("error");
        }

        // File validation
        if (!hasFile) {
            isValid = false;
        }

        // Update button state
        submitBtn.disabled = !isValid;
        submitBtn.title = isValid ? "" : 
            (amount < 100 ? "Minimum deposit is $100" : "Please upload payment proof");

        return isValid;
    }

    submitBtn.addEventListener("click", async e => {
        e.preventDefault();

        const amount = parseFloat(amountInput.value) || 0;
        const file = fileInput?.files?.[0];
        
        // Final validation
        if (!validateDeposit()) {
            if (amount < 100) {
                alert("Minimum deposit amount is $100");
            } else if (!file) {
                alert("Please upload payment proof");
            }
            return;
        }

        const originalHTML = submitBtn.innerHTML;
        const originalText = submitBtn.textContent;
        submitBtn.innerHTML = "Processing...";
        submitBtn.disabled = true;

        try {
            const token = await window.Clerk.session.getToken({ template: "backend" });
            const formData = new FormData();
            formData.append("amount", amount);
            formData.append("method", "USDT_TRC20");
            formData.append("txId", "PENDING-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9));
            formData.append("proof", file);

            const res = await fetch(`${window.API_BASE_URL}/api/v1/me/deposits`, {
                method: "POST",
                headers: { 
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            });

            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error || data.message || `Deposit failed: ${res.status}`);
            }

            alert("Deposit submitted successfully! It will be reviewed shortly.");
            
            // Reset form
            amountInput.value = "";
            fileInput.value = "";
            filePreview.classList.remove("show");
            fileName.textContent = "";
            
        } catch (err) {
            console.error("Deposit error:", err);
            alert(err.message || "Server error. Please try again.");
        } finally {
            submitBtn.innerHTML = originalHTML;
            submitBtn.textContent = originalText;
            validateDeposit(); // Re-validate to update button state
        }
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

    if (!submitBtn || !amountInput || !walletInput) return;

    const feeRate = 0.005;
    const minWithdraw = 10;

    function validateWithdraw() {
        const amount = parseFloat(amountInput.value) || 0;
        const wallet = walletInput.value.trim();
        let isValid = true;

        // Amount validation
        if (amount < minWithdraw) {
            amountError.classList.add("show");
            isValid = false;
        } else {
            amountError.classList.remove("show");
        }

        // Wallet validation
        if (!wallet) {
            walletError.classList.add("show");
            isValid = false;
        } else {
            walletError.classList.remove("show");
        }

        // Update button state
        submitBtn.disabled = !isValid;
        
        return isValid;
    }

    function updateCalculations() {
        const amount = parseFloat(amountInput.value) || 0;
        const fee = amount * feeRate;
        const net = amount - fee;
        
        if (feeDisplay) feeDisplay.textContent = `$${fee.toFixed(2)}`;
        if (netDisplay) netDisplay.textContent = `$${net.toFixed(2)}`;
    }

    amountInput.addEventListener("input", () => {
        updateCalculations();
        validateWithdraw();
    });

    amountInput.addEventListener("blur", validateWithdraw);
    
    walletInput.addEventListener("input", validateWithdraw);
    walletInput.addEventListener("blur", validateWithdraw);

    submitBtn.addEventListener("click", async e => {
        e.preventDefault();
        
        // Final validation
        if (!validateWithdraw()) {
            const amount = parseFloat(amountInput.value) || 0;
            const wallet = walletInput.value.trim();
            
            if (amount < minWithdraw) {
                alert(`Minimum withdrawal amount is $${minWithdraw}`);
                amountInput.focus();
            } else if (!wallet) {
                alert("Please enter your TRC20 wallet address");
                walletInput.focus();
            }
            return;
        }

        const originalHTML = submitBtn.innerHTML;
        const originalText = submitBtn.textContent;
        submitBtn.innerHTML = "Processing...";
        submitBtn.disabled = true;

        try {
            const token = await window.Clerk.session.getToken({ template: "backend" });
            
            const withdrawalData = {
                amount: parseFloat(amountInput.value),
                method: "USDT_TRC20",
                walletAddress: walletInput.value.trim()
            };

            const res = await fetch(`${window.API_BASE_URL}/api/v1/me/withdrawals`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(withdrawalData)
            });

            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error || data.message || `Withdrawal failed: ${res.status}`);
            }

            alert("Withdrawal request submitted successfully! It will be processed within 24-48 hours.");
            
            // Reset form
            amountInput.value = "";
            walletInput.value = "";
            updateCalculations();
            
        } catch (err) {
            console.error("Withdrawal error:", err);
            alert(err.message || "Server error. Please try again.");
        } finally {
            submitBtn.innerHTML = originalHTML;
            submitBtn.textContent = originalText;
            validateWithdraw(); // Re-validate to update button state
        }
    });

    // Initial calculations and validation
    updateCalculations();
    validateWithdraw();
}

// ---------- INIT ----------

document.addEventListener("DOMContentLoaded", () => {
    // Check which page we're on by looking for specific containers
    if (document.querySelector(".deposit-content")) {
        initializeDepositPage();
    }
    
    if (document.querySelector(".withdraw-content")) {
        initializeWithdrawPage();
    }
});