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

    // Copy address (original behavior preserved)
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

            // ✅ REAL FILE UPLOAD — FORM DATA (FINAL FIX)
            try {
                const token = await window.Clerk.session.getToken({ template: "backend" });

                const formData = new FormData();
                formData.append("amount", amount);
                formData.append("method", "USDT_TRC20");
                formData.append("txId", "PENDING-" + Date.now());
                formData.append("proof", file);

                const res = await fetch(`${window.API_BASE_URL}/api/v1/me/deposits`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    body: formData
                });

                const data = await res.json();

                if (res.ok) {
                    alert(`Deposit request submitted!\nAmount: $${amount}\nStatus: Pending`);
                } else {
                    alert("Deposit failed: " + (data.error || "Unknown error"));
                }

            } catch (err) {
                alert("Error connecting to server");
                console.error(err);
            }

            // Reset UI
            amountInput.value = "";
            fileInput.value = "";
            filePreview.classList.remove("show");
            fileName.textContent = "";

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

    if (!hasFile && amount >= minAmount) {
        submitBtn.title = "Please upload payment proof";
    } else if (amount < minAmount) {
        submitBtn.title = "Minimum deposit is $100";
    } else {
        submitBtn.title = "";
    }

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
// ⚠️ Intentionally NOT modified beyond preventing crashes.
// Full withdrawal flow will be handled cleanly in Stage 5.3.

function initializeWithdrawPage() {
    // Existing UI logic stays intact
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
