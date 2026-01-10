// ===== DEPOSIT PAGE FUNCTIONS =====
async function initDepositsPage() {
  await loadRecentDeposits();

  const form = document.getElementById("depositForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const amount = Number(document.getElementById("depositAmount").value);
    const txId = document.getElementById("txId").value;
    const proofFile = document.getElementById("proofFile").files[0];

    if (!amount || amount < 100) {
      alert("Minimum deposit amount is $100");
      return;
    }

    if (!proofFile) {
      alert("Proof of payment is required");
      return;
    }

    const upload = await requestUpload("DEPOSIT_PROOF", proofFile);
    await uploadToS3(upload.uploadUrl, proofFile);
    await confirmUpload(upload.fileId);

    await api("/api/v1/deposits", {
      method: "POST",
      body: JSON.stringify({
        amount,
        currency: "USDT",
        method: "USDT_TRC20",
        txId,
        proofKey: upload.storageKey
      })
    });

    alert(
      `Deposit request submitted.\n\n` +
      `Amount: $${amount.toFixed(2)}\n` +
      `Status: PENDING (Awaiting admin approval)\n\n` +
      `Funds will be credited only after approval.`
    );

    form.reset();
    await loadRecentDeposits();
  });
}

async function loadRecentDeposits() {
  const tbody = document.getElementById("depositHistoryBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  const deposits = await api("/api/v1/deposits");

  if (!deposits.length) {
    tbody.innerHTML = `<tr><td colspan="5">No deposits yet.</td></tr>`;
    return;
  }

  deposits.forEach(dep => {
    const tr = document.createElement("tr");

    let reason = dep.statusReason || "—";
    if (dep.status === "pending") {
      reason = "Awaiting admin review";
    }

    tr.innerHTML = `
      <td>${new Date(dep.createdAt).toLocaleString()}</td>
      <td>${dep.method}</td>
      <td>$${Number(dep.amount).toFixed(2)}</td>
      <td>
        <span class="status-badge ${dep.status}">
          ${dep.status.toUpperCase()}
        </span>
      </td>
      <td>${reason}</td>
    `;

    tbody.appendChild(tr);
  });
}

/* Withdraw logic remains unchanged below */

// ===== WITHDRAW PAGE FUNCTIONS =====

function initializeWithdrawPage() {
    const withdrawSourceSelect = document.getElementById('withdrawSource');
    const availableBalanceEl = document.getElementById('availableBalance');
    const displayBalanceEl = document.getElementById('displayBalance');

    let balances = { profit: 0, capital: 0 };

    loadWithdrawBalances().then(b => {
      balances = b;
      updateWithdrawSource();
    });


    function updateWithdrawSource() {
        const source = withdrawSourceSelect.value;
        const available = balances[source] || 0;
        
        availableBalanceEl.textContent = `$${available.toFixed(2)}`;
        displayBalanceEl.textContent = `$${available.toFixed(2)}`;
        
        validateWithdrawForm();
    }
    
    withdrawSourceSelect.addEventListener('change', updateWithdrawSource);
    
    // initialize once
    updateWithdrawSource();
    
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
        const source = document.getElementById('withdrawSource')?.value;

        if (source === 'capital') {
            submitBtn.disabled = true;
            submitBtn.title = 'Capital withdrawals are currently locked';
            return false;
        }

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
                const statusClass =
                    dep.status === "approved" ? "status-completed" :
                    dep.status === "pending" ? "status-pending" :
                    "status-failed";

                const tr = document.createElement("tr");

                let reason = dep.statusReason || "—";
                if (dep.status === "pending") {
                  reason = "Awaiting admin review";
                }
                
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
                      ${dep.status.toUpperCase()}
                    </span>
                  </td>
                
                  <td>${reason}</td>
                `;
                
                tbody.appendChild(tr);

            });

    } catch (err) {
        console.error("Failed to load deposits", err);
        tbody.innerHTML = `<tr><td colspan="4">Failed to load deposits</td></tr>`;
    }
}

async function loadRecentWithdrawals() {
    const tbody = document.querySelector(".withdrawals-table tbody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="4">Loading...</td></tr>`;

    try {
        const token = await getBackendToken();

        const res = await fetch(`${window.API_BASE_URL}/api/v1/me/withdrawals`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!res.ok) {
            throw new Error("Failed to fetch withdrawals");
        }

        const withdrawals = await res.json();

        if (!withdrawals.length) {
            tbody.innerHTML = `<tr><td colspan="4">No withdrawals yet</td></tr>`;
            return;
        }

        tbody.innerHTML = "";

        withdrawals
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5)
            .forEach(w => {
                const statusClass =
                    w.status === "approved" ? "status-completed" :
                    w.status === "pending" ? "status-pending" :
                    "status-failed";

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

// ===== LEDGER-BASED WITHDRAW BALANCE (GLOBAL) =====
async function loadWithdrawBalances() {
  const token = await getBackendToken();

  const res = await fetch(`${window.API_BASE_URL}/api/v1/me/balance`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error("Failed to load ledger balance");
  }

  const available = Number(data.balance.availableBalance || 0);

  return {
    profit: available,   // withdrawals use ledger balance
    capital: 0           // capital still locked
  };
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', function () {
    if (document.querySelector('.deposit-content')) {
        initializeDepositPage();
        loadRecentDeposits();
    }

    if (document.querySelector('.withdraw-content')) {
        initializeWithdrawPage();
        loadRecentWithdrawals();
    }
});
