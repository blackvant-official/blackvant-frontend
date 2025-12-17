// ===== DEPOSIT PAGE FUNCTIONS =====

function initializeDepositPage() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const filePreview = document.getElementById('filePreview');
    const fileName = document.getElementById('fileName');
    const removeFileBtn = document.getElementById('removeFileBtn');

    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => fileInput.click());

        uploadArea.addEventListener('dragover', e => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', e => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
        });

        fileInput.addEventListener('change', e => {
            if (e.target.files.length) handleFile(e.target.files[0]);
        });

        if (removeFileBtn) {
            removeFileBtn.addEventListener('click', e => {
                e.stopPropagation();
                fileInput.value = '';
                filePreview.classList.remove('show');
                fileName.textContent = '';
                validateDepositForm();
            });
        }

        function handleFile(file) {
            const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
            if (!validTypes.includes(file.type)) {
                alert('Please upload only JPG, PNG, or PDF files.');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert('File size should be less than 5MB.');
                return;
            }
            fileName.textContent = file.name;
            filePreview.classList.add('show');
            validateDepositForm();
        }
    }

    // Copy wallet address (single, stable implementation)
    const copyBtn = document.getElementById('copyAddressBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const textToCopy = copyBtn.getAttribute('data-copy');
            if (!textToCopy) return;

            const originalText = copyBtn.textContent;
            const originalBg = copyBtn.style.background;

            function success() {
                copyBtn.textContent = 'Copied!';
                copyBtn.style.background = 'var(--accent-green)';
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                    copyBtn.style.background = originalBg || 'var(--accent-blue)';
                }, 2000);
            }

            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(textToCopy).then(success).catch(fallback);
            } else {
                fallback();
            }

            function fallback() {
                const textarea = document.createElement('textarea');
                textarea.value = textToCopy;
                textarea.style.position = 'fixed';
                textarea.style.left = '-9999px';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                success();
            }
        });
    }

    const amountInput = document.getElementById('amount');
    if (amountInput) amountInput.addEventListener('input', validateDepositForm);

    const submitBtn = document.getElementById('submitBtn');

    if (submitBtn) {
        submitBtn.addEventListener('click', async function (e) {
            e.preventDefault();

            const amount = parseFloat(amountInput.value) || 0;
            const file = fileInput.files[0];
            const minAmount = 100;

            if (amount < minAmount) {
                alert(`Minimum deposit amount is $${minAmount}`);
                return;
            }

            if (!file) {
                alert('Please upload proof of payment');
                return;
            }

            const originalText = this.innerHTML;
            this.innerHTML = '<span class="spinner"></span> Processing...';
            this.disabled = true;

            try {
                const token = await window.Clerk.session.getToken({ template: "backend" });

                const formData = new FormData();
                formData.append("amount", amount);
                formData.append("currency", "USD");
                formData.append("method", "USDT_TRC20");
                formData.append("txId", "TX" + Date.now());
                formData.append("proof", file);

                const res = await fetch(`${window.API_BASE_URL}/api/v1/me/deposits`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    body: formData
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || "Deposit failed");
                }

                alert(`Deposit request of $${amount} submitted successfully!\n\nStatus: Pending Review`);

                amountInput.value = '';
                fileInput.value = '';
                filePreview.classList.remove('show');
                fileName.textContent = '';

            } catch (err) {
                alert(err.message || "Server error");
            }

            this.innerHTML = originalText;
            this.disabled = true;
            validateDepositForm();
        });
    }

    validateDepositForm();
}

function validateDepositForm() {
    const amountInput = document.getElementById('amount');
    const amountError = document.getElementById('amountError');
    const submitBtn = document.getElementById('submitBtn');
    const filePreview = document.getElementById('filePreview');

    if (!amountInput || !submitBtn) return;

    const amount = parseFloat(amountInput.value) || 0;
    const hasFile = filePreview && filePreview.classList.contains('show');
    const minAmount = 100;

    let valid = true;

    if (amount < minAmount) {
        amountError?.classList.add('show');
        amountInput.classList.add('error');
        valid = false;
    } else {
        amountError?.classList.remove('show');
        amountInput.classList.remove('error');
    }

    if (!hasFile) valid = false;

    submitBtn.disabled = !valid;
}

// ===== WITHDRAW PAGE FUNCTIONS =====

function initializeWithdrawPage() {
    const amountInput = document.getElementById('withdrawAmount');
    const walletAddressInput = document.getElementById('walletAddress');
    const feeDisplay = document.getElementById('feeAmount');
    const netDisplay = document.getElementById('netAmount');
    const submitBtn = document.getElementById('submitBtn');
    const withdrawFee = 0.005;

    if (!amountInput || !submitBtn) return;

    amountInput.addEventListener('input', () => {
        const amount = parseFloat(amountInput.value) || 0;
        const fee = amount * withdrawFee;
        const net = amount - fee;

        feeDisplay.textContent = '$' + fee.toFixed(2);
        netDisplay.textContent = '$' + net.toFixed(2);

        validateWithdrawForm();
    });

    walletAddressInput?.addEventListener('input', validateWithdrawForm);

    submitBtn.addEventListener('click', async function (e) {
        e.preventDefault();

        if (!validateWithdrawForm()) {
            alert('Please fill all required fields correctly.');
            return;
        }

        const amount = parseFloat(amountInput.value) || 0;
        const walletAddress = walletAddressInput.value.trim();

        const originalText = this.innerHTML;
        this.innerHTML = '<span class="spinner"></span> Processing...';
        this.disabled = true;

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
                    currency: "USD",
                    method: "USDT_TRC20",
                    targetAddress: walletAddress
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Withdrawal failed");
            }

            alert(`✅ Withdrawal request submitted!\n\nAmount: $${amount.toFixed(2)}\nStatus: Pending`);

            amountInput.value = '';
            walletAddressInput.value = '';
            feeDisplay.textContent = '$0.00';
            netDisplay.textContent = '$0.00';

        } catch (err) {
            alert(err.message || "Server error");
        }

        this.innerHTML = originalText;
        this.disabled = true;
        validateWithdrawForm();
    });

    validateWithdrawForm();
}

function validateWithdrawForm() {
    const amountInput = document.getElementById('withdrawAmount');
    const walletAddressInput = document.getElementById('walletAddress');
    const submitBtn = document.getElementById('submitBtn');
    const minWithdraw = 10;

    if (!amountInput || !submitBtn) return false;

    const amount = parseFloat(amountInput.value) || 0;
    const walletAddress = walletAddressInput?.value.trim();

    let valid = true;

    if (amount < minWithdraw) valid = false;
    if (!walletAddress) valid = false;

    submitBtn.disabled = !valid;
    return valid;
}

async function getBackendToken() {
    if (!window.Clerk) {
        throw new Error("Clerk not loaded");
    }

    // Wait until Clerk is fully ready
    if (!window.Clerk.session) {
        await window.Clerk.load();
    }

    return await window.Clerk.session.getToken({ template: "backend" });
}

async function loadRecentDeposits() {
    const tbody = document.querySelector(".deposits-table tbody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="4">Loading...</td></tr>`;

    try {
        const token = await getBackendToken();

        const res = await fetch(`${window.API_BASE_URL}/api/v1/me/deposits`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!res.ok) throw new Error("Failed to fetch deposits");

        const deposits = await res.json();

        if (!deposits.length) {
            tbody.innerHTML = `<tr><td colspan="4">No deposits yet</td></tr>`;
            return;
        }

        tbody.innerHTML = "";

        deposits
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5)
            .forEach(dep => {
                const statusClass =
                    dep.status === "approved" ? "status-completed" :
                    dep.status === "pending" ? "status-pending" :
                    "status-failed";

                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${new Date(dep.createdAt).toLocaleDateString()}</td>
                    <td>${dep.method}</td>
                    <td>$${Number(dep.amount).toFixed(2)}</td>
                    <td>
                      <span class="status-badge ${statusClass}">
                        ${dep.status.charAt(0).toUpperCase() + dep.status.slice(1)}
                      </span>
                    </td>
                `;
                tbody.appendChild(tr);
            });

    } catch (err) {
        console.error("Failed to load deposits", err);
        tbody.innerHTML = `<tr><td colspan="4">Failed to load deposits</td></tr>`;
    }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', function () {
    if (document.querySelector('.deposit-content')) {
        initializeDepositPage();
        loadRecentDeposits();
    }
    if (document.querySelector('.withdraw-content')) {
        initializeWithdrawPage();
    }
});
