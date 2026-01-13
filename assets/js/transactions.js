// ===== DEPOSIT PAGE FUNCTIONS =====
let SYSTEM_MIN_DEPOSIT = null;
let SYSTEM_MIN_WITHDRAW = null;
let SYSTEM_WITHDRAW_FREQUENCY_DAYS = null;

async function loadSystemMinDeposit() {
    try {
        const token = await getBackendToken();

        const res = await fetch(
            `${window.API_BASE_URL}/api/v1/admin/settings/system`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) throw new Error("Failed to load system settings");

        const data = await res.json();
        const min = Number(data.minDepositAmount);

        SYSTEM_MIN_DEPOSIT = Number.isFinite(min) && min > 0 ? min : 100;

    } catch (err) {
        console.error("Failed to load minimum deposit", err);
        SYSTEM_MIN_DEPOSIT = 100; // safe fallback
    }
}

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
        
            if (SYSTEM_MIN_DEPOSIT !== null && amount < SYSTEM_MIN_DEPOSIT) {
                alert(`Minimum deposit amount is $${SYSTEM_MIN_DEPOSIT}`);
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

                // STEP 1 — request signed upload URL
                const { uploadUrl, storageKey } = await requestUpload({
                    purpose: "DEPOSIT_PROOF",
                    file
                });

                // STEP 2 — upload file directly to S3
                await putToS3(uploadUrl, file);

                // STEP 3 — confirm upload (persist FileAttachment)
                await confirmUpload({
                    storageKey,
                    purpose: "DEPOSIT_PROOF",
                    mimeType: file.type,
                    fileSize: file.size,
                    originalName: file.name
                });

                // STEP 4 — submit deposit (NO FILE)
                const res = await fetch(`${window.API_BASE_URL}/api/v1/me/deposits`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        amount,
                        currency: "USD",
                        method: "USDT_TRC20",
                        txId: "TX" + Date.now(),
                        proofKey: storageKey   // <-- THIS replaces proof file
                    })
                });

                

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || "Deposit failed");
                }

                alert(
                  `Deposit request submitted.\n\n` +
                  `Amount: $${amount.toFixed(2)}\n` +
                  `Status: PENDING (Awaiting admin approval)\n\n` +
                  `Funds will be credited only after approval.`
                );

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

    const instructionEl = document.getElementById("minDepositInstruction");
    const amountInputEl = document.getElementById("amount");
    const amountErrorEl = document.getElementById("amountError");

    if (SYSTEM_MIN_DEPOSIT !== null) {
        if (instructionEl) {
            instructionEl.textContent =
              `Minimum deposit: $${SYSTEM_MIN_DEPOSIT} equivalent`;
        }

        if (amountInputEl) {
            amountInputEl.placeholder = SYSTEM_MIN_DEPOSIT.toFixed(2);
        }

        if (amountErrorEl) {
            amountErrorEl.textContent =
              `Minimum deposit amount is $${SYSTEM_MIN_DEPOSIT}`;
        }
    }

}

function validateDepositForm() {
    const amountInput = document.getElementById('amount');
    const amountError = document.getElementById('amountError');
    const submitBtn = document.getElementById('submitBtn');
    const filePreview = document.getElementById('filePreview');

    if (!amountInput || !submitBtn) return;

    const amount = parseFloat(amountInput.value) || 0;
    const hasFile = filePreview && filePreview.classList.contains('show');
    
    let valid = true;

    if (SYSTEM_MIN_DEPOSIT !== null && amount < SYSTEM_MIN_DEPOSIT) {
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
    const withdrawSourceSelect = document.getElementById('withdrawSource');
    const availableBalanceEl = document.getElementById('availableBalance');
    const displayBalanceEl = document.getElementById('displayBalance');
    const submitBtn = document.getElementById('submitBtn'); 

    let balances = { profit: 0, capital: 0, capitalLocked: false, capitalUnlockAt: null };

    loadWithdrawBalances().then(b => {
      balances = b;
      handleCapitalLockUI();
      updateWithdrawSource();
    });


    function handleCapitalLockUI() {
      const capitalOption = withdrawSourceSelect?.querySelector('option[value="capital"]');
      const lockNotice = document.getElementById('capitalLockNotice');
      const unlockDateEl = document.getElementById('capitalUnlockDate');

      if (!capitalOption) return;

      if (balances.capitalLocked) {
        // Disable capital withdrawals
        capitalOption.disabled = true;

        // Auto-switch to profit
        withdrawSourceSelect.value = 'profit';

        // Show lock notice
        if (lockNotice) {
          lockNotice.style.display = 'block';

          if (balances.capitalUnlockAt && unlockDateEl) {
            unlockDateEl.textContent = new Date(
              balances.capitalUnlockAt
            ).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: '2-digit'
            });
          }
        }
      } else {
        // Capital unlocked
        capitalOption.disabled = false;

        if (lockNotice) {
          lockNotice.style.display = 'none';
        }
      }
    }

    function updateWithdrawSource() {
        const source = withdrawSourceSelect.value;
        const available = balances[source] || 0;

        availableBalanceEl.textContent = `$${available.toFixed(2)}`;
        displayBalanceEl.textContent = `$${available.toFixed(2)}`;

        // Safety: never allow capital submit if locked
        if (source === 'capital' && balances.capitalLocked) {
          submitBtn.disabled = true;
          submitBtn.title = 'Investment capital is locked';
        } else {
          submitBtn.title = '';
        }

        validateWithdrawForm();
    }

    
    withdrawSourceSelect.addEventListener('change', updateWithdrawSource);
    
    
    const amountInput = document.getElementById('withdrawAmount');
    const walletAddressInput = document.getElementById('walletAddress');
    const feeDisplay = document.getElementById('feeAmount');
    const netDisplay = document.getElementById('netAmount');
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
                    source: withdrawSourceSelect.value,
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

    if (!amountInput || !submitBtn) return false;

    const amount = parseFloat(amountInput.value) || 0;
    const walletAddress = walletAddressInput?.value.trim();

    let valid = true;

    if (SYSTEM_MIN_WITHDRAW !== null && amount < SYSTEM_MIN_WITHDRAW) {
        valid = false;
    }

    if (!walletAddress) {
        valid = false;
    }

    submitBtn.disabled = !valid;
    return valid;
}


async function getBackendToken() {
    const start = Date.now();

    while (!window.Clerk || !window.Clerk.session) {
        if (Date.now() - start > 5000) {
            throw new Error("Clerk session not ready");
        }
        await new Promise(r => setTimeout(r, 50));
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
                const statusClass = `status-${dep.status.toLowerCase()}`;

                const tr = document.createElement("tr");

                let statusText =
                  dep.status === "PENDING"
                    ? "Pending (Under Review)"
                    : dep.status.charAt(0) + dep.status.slice(1).toLowerCase();

                tr.innerHTML = `
                    <td>${new Date(dep.createdAt).toLocaleString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit"
                    })}</td>
                
                    <td>${dep.method}</td>
                    <td>$${Number(dep.amount).toFixed(2)}</td>
                    <td>
                      <span class="status-badge ${statusClass}">
                        ${statusText}
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

async function loadSystemWithdrawLimits() {
  const token = await getBackendToken();
  const res = await fetch(
    `${window.API_BASE_URL}/api/v1/admin/settings/system`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();

  SYSTEM_MIN_WITHDRAW = Number(data.minWithdrawAmount || 10);
  SYSTEM_WITHDRAW_FREQUENCY_DAYS = Number(data.withdrawFrequencyDays || 7);
}

async function loadRecentWithdrawals() {
    const tbody = document.querySelector(".withdrawals-table tbody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="4">Loading...</td></tr>`;

    try {
        const token = await getBackendToken();

        const res = await fetch(
          `${window.API_BASE_URL}/api/v1/me/withdrawals`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );


        if (!res.ok) {
            throw new Error("Failed to fetch withdrawals");
        }

        const result = await res.json();

        // Normalize response
        const withdrawals = Array.isArray(result)
          ? result
          : Array.isArray(result.withdrawals)
            ? result.withdrawals
            : Array.isArray(result.data)
              ? result.data
              : [];
            
        if (!withdrawals.length) {
          tbody.innerHTML = `<tr><td colspan="4">No withdrawals yet</td></tr>`;
          return;
        }


        tbody.innerHTML = "";

        withdrawals
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5)
            .forEach(w => {
                const statusClass = `status-${w.status.toLowerCase()}`;

                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${new Date(w.createdAt).toLocaleString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit"
                    })}</td>


                    <td>${w.method}</td>
                    <td>$${Number(w.amount).toFixed(2)}</td>
                    <td>
                      <span class="status-badge ${statusClass}">
                        ${w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                      </span>
                    </td>
                `;
                tbody.appendChild(tr);
            });

    } catch (err) {
        console.error("Withdrawals load error:", err);
        tbody.innerHTML = `<tr><td colspan="4">Failed to load withdrawals</td></tr>`;
    }
}
function renderWithdrawRules() {
  const minRuleEl = document.getElementById("minWithdrawRule");
  const freqRuleEl = document.getElementById("withdrawFrequencyRule");

  if (minRuleEl && SYSTEM_MIN_WITHDRAW !== null) {
    minRuleEl.textContent = `Minimum: $${SYSTEM_MIN_WITHDRAW}`;
  }

  if (freqRuleEl && SYSTEM_WITHDRAW_FREQUENCY_DAYS !== null) {
    freqRuleEl.textContent =
      `Once every ${SYSTEM_WITHDRAW_FREQUENCY_DAYS} day(s)`;
  }
}

// ===== LEDGER-BASED WITHDRAW BALANCE (GLOBAL) =====
async function loadWithdrawBalances() {
  const token = await getBackendToken();

  // We reuse dashboard summary because it is ledger-truthful
  const res = await fetch(`${window.API_BASE_URL}/api/v1/me/dashboard/summary`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json();
  if (!data || typeof data !== "object") {
    throw new Error("Failed to load withdraw balances");
  }

  const totalProfit = Number(data.totalProfit || 0);
  const activeInvestment = Number(data.activeInvestment || 0);

  // 🔐 FUTURE-READY CAPITAL LOCK (ADMIN CONTROLLED)
  // For now: capital is NOT locked
    const capitalLocked = Boolean(data.capitalLocked);

    return {
      profit: totalProfit,
      capital: capitalLocked ? 0 : activeInvestment,
      capitalLocked,
      capitalUnlockAt: data.capitalUnlockAt
    };
}


// ===== INIT =====
document.addEventListener('DOMContentLoaded', async function () {

  // ===== DEPOSIT PAGE =====
  if (document.querySelector('.deposit-content')) {
    await loadSystemMinDeposit();
    initializeDepositPage();
    loadRecentDeposits();
  }

  // ===== WITHDRAW PAGE =====
  if (document.querySelector('.withdraw-content')) {
    await loadSystemWithdrawLimits();
    renderWithdrawRules();
    initializeWithdrawPage();
    loadRecentWithdrawals();
  }
});