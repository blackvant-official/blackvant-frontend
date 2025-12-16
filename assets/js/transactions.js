// ===== DEPOSIT PAGE FUNCTIONS =====

// Upload handling stays the same
function initializeDepositPage() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const filePreview = document.getElementById('filePreview');
    const fileName = document.getElementById('fileName');
    const removeFileBtn = document.getElementById('removeFileBtn');

    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => fileInput.click());

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) handleFile(e.target.files[0]);
        });

        if (removeFileBtn) {
            removeFileBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                fileInput.value = "";
                filePreview.classList.remove("show");
                fileName.textContent = "";
                validateDepositForm();
            });
        }

        function handleFile(file) {
            const validTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
            if (!validTypes.includes(file.type)) {
                alert("Please upload only JPG, PNG, or PDF files.");
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                alert("File size should be less than 5MB.");
                return;
            }

            fileName.textContent = file.name;
            filePreview.classList.add("show");
            validateDepositForm();
        }
    }

    // Copy address (kept same)
    const copyBtn = document.getElementById("copyAddressBtn");
    if (copyBtn) {
        copyBtn.addEventListener("click", function () {
            const textToCopy = this.getAttribute("data-copy");
            if (!textToCopy) return;
            navigator.clipboard.writeText(textToCopy).then(() => {
                const original = this.textContent;
                this.textContent = "Copied!";
                this.style.background = "var(--accent-green)";
                setTimeout(() => {
                    this.textContent = original;
                    this.style.background = "var(--accent-blue)";
                }, 2000);
            });
        });
    }

    const amountInput = document.getElementById("amount");
    if (amountInput) amountInput.addEventListener("input", validateDepositForm);

    const submitBtn = document.getElementById("submitBtn");

    if (submitBtn) {
        submitBtn.addEventListener("click", async function (e) {
            e.preventDefault();

            const amount = parseFloat(amountInput.value) || 0;
            const file = fileInput.files[0];
            const minAmount = 100;

            if (amount < minAmount) {
                alert(`Minimum deposit amount is $${minAmount}`);
                return;
            }

            if (!file) {
                alert("Please upload proof of payment");
                return;
            }

            const originalHTML = this.innerHTML;
            this.innerHTML = '<span class="spinner"></span> Processing...';
            this.disabled = true;

            // 🔥 REAL BACKEND CALL HERE
            try {
                const token = await window.Clerk.session.getToken({ template: "backend" });

                const res = await fetch(`${window.API_BASE_URL}/api/v1/me/deposits`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        amount,
                        method: "USDT_TRC20",
                        txId: "PENDING-" + Date.now(),
                        proofUrl: file.name // later we implement file uploads
                    })
                });

                const data = await res.json();

                if (res.ok) {
                    alert(`Deposit request submitted!\nAmount: $${amount}\nStatus: Pending`);
                } else {
                    alert("Deposit failed: " + data.error);
                }
            } catch (err) {
                alert("Error connecting to server");
                console.error(err);
            }

            // Reset UI
            if (amountInput) amountInput.value = "";
            if (fileInput) fileInput.value = "";
            if (filePreview) filePreview.classList.remove("show");
            if (fileName) fileName.textContent = "";

            this.innerHTML = originalHTML;
            this.disabled = true;

            validateDepositForm();
        });
    }

    validateDepositForm();
}

// ====== DEPOSIT FORM VALIDATION ======
function validateDepositForm() {
    const fileInput = document.getElementById("fileInput");
    const amountInput = document.getElementById("amount");
    const amountError = document.getElementById("amountError");
    const submitBtn = document.getElementById("submitBtn");
    const filePreview = document.getElementById("filePreview");

    if (!amountInput || !submitBtn) return;

    const amount = parseFloat(amountInput.value) || 0;
    const minAmount = 100;
    const hasFile =
        filePreview?.classList.contains("show") &&
        fileInput &&
        fileInput.files &&
        fileInput.files.length > 0;


    let valid = true;

    if (amount < minAmount) {
        amountError?.classList.add("show");
        amountInput.classList.add("error");
        valid = false;
    } else {
        amountError?.classList.remove("show");
        amountInput.classList.remove("error");
    }

    if (!hasFile) valid = false;

    submitBtn.disabled = !valid;
}

// ===== WITHDRAW PAGE FUNCTIONS =====

function initializeWithdrawPage() {
    const cryptoOption = document.getElementById("cryptoOption");
    const cryptoForm = document.getElementById("cryptoForm");

    if (cryptoOption && cryptoForm) {
        cryptoOption.addEventListener("click", function () {
            document.querySelectorAll(".method-option").forEach(o => o.classList.remove("selected"));
            this.classList.add("selected");

            document.querySelectorAll(".method-form").forEach(f => f.classList.remove("active"));
            cryptoForm.classList.add("active");

            validateWithdrawForm();
        });
    }

    const amountInput = document.getElementById("withdrawAmount");
    const feeDisplay = document.getElementById("feeAmount");
    const netDisplay = document.getElementById("netAmount");
    const withdrawFee = 0.005;

    if (amountInput && feeDisplay && netDisplay) {
        amountInput.addEventListener("input", function () {
            const amount = parseFloat(this.value) || 0;
            const fee = amount * withdrawFee;
            const net = amount - fee;

            feeDisplay.textContent = "$" + fee.toFixed(2);
            netDisplay.textContent = "$" + net.toFixed(2);

            validateWithdrawForm();
        });

        amountInput.dispatchEvent(new Event("input"));
    }

    const walletAddressInput = document.getElementById("walletAddress");
    if (walletAddressInput) {
        walletAddressInput.addEventListener("input", validateWithdrawForm);
    }

    const submitBtn = document.getElementById("submitBtn");

    if (submitBtn) {
        submitBtn.addEventListener("click", async function (e) {
            e.preventDefault();

            if (!validateWithdrawForm()) {
                alert("Please fill all fields correctly");
                return;
            }

            const amount = parseFloat(amountInput.value) || 0;
            const walletAddress = walletAddressInput.value;
            const minWithdraw = 10;

            if (amount < minWithdraw) {
                alert(`Minimum withdrawal is $${minWithdraw}`);
                return;
            }

            const originalHTML = this.innerHTML;
            this.innerHTML = '<span class="spinner"></span> Processing...';
            this.disabled = true;

            // 🔥 REAL BACKEND CALL
            try {
                const token = await window.Clerk.session.getToken({ template: "backend" });

                const res = await fetch(`${window.API_BASE_URL}/api/v1/me/withdrawals`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        amount,
                        method: "USDT_TRC20",
                        targetAddress: walletAddress
                    })
                });

                const data = await res.json();

                if (res.ok) {
                    alert("Withdrawal request submitted successfully!");
                } else {
                    alert("Withdrawal failed: " + data.error);
                }
            } catch (err) {
                alert("Error connecting to backend");
                console.error(err);
            }

            // Reset UI
            amountInput.value = "";
            walletAddressInput.value = "";
            feeDisplay.textContent = "$0.00";
            netDisplay.textContent = "$0.00";

            this.innerHTML = originalHTML;
            this.disabled = true;

            validateWithdrawForm();
        });
    }

    validateWithdrawForm();
}

// Withdraw validation unchanged except remove fake balance
function validateWithdrawForm() {
    const amountInput = document.getElementById("withdrawAmount");
    const amountError = document.getElementById("amountError");
    const walletAddressInput = document.getElementById("walletAddress");
    const walletAddressError = document.getElementById("walletAddressError");
    const submitBtn = document.getElementById("submitBtn");

    if (!amountInput || !submitBtn) return false;

    const amount = parseFloat(amountInput.value) || 0;
    const walletAddress = walletAddressInput?.value.trim();
    const minWithdraw = 10;

    let valid = true;

    if (amount < minWithdraw) {
        amountError?.classList.add("show");
        amountInput.classList.add("error");
        valid = false;
    } else {
        amountError?.classList.remove("show");
        amountInput.classList.remove("error");
    }

    if (!walletAddress) {
        walletAddressError?.classList.add("show");
        walletAddressInput?.classList.add("error");
        valid = false;
    } else {
        walletAddressError?.classList.remove("show");
        walletAddressInput?.classList.remove("error");
    }

    submitBtn.disabled = !valid;
    return valid;
}

// INIT
document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector(".deposit-content")) {
    initializeDepositPage();
  }

  if (document.querySelector(".withdraw-content")) {
    initializeWithdrawPage();
  }

  if (document.querySelector(".transaction-content")) {
    initTransactionHistory();
  }
});
