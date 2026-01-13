// =====================================================
// SYSTEM GLOBALS
// =====================================================
let SYSTEM_MIN_DEPOSIT = null;
let SYSTEM_MIN_WITHDRAW = null;
let SYSTEM_WITHDRAW_FREQUENCY_DAYS = null;

// =====================================================
// AUTH TOKEN (STABLE)
// =====================================================
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

// =====================================================
// ================= DEPOSIT PAGE =======================
// =====================================================
async function loadSystemMinDeposit() {
  try {
    const token = await getBackendToken();
    const res = await fetch(
      `${window.API_BASE_URL}/api/v1/admin/settings/system`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    const min = Number(data.minDepositAmount);
    SYSTEM_MIN_DEPOSIT = Number.isFinite(min) && min > 0 ? min : 100;
  } catch {
    SYSTEM_MIN_DEPOSIT = 100;
  }
}

function initializeDepositPage() {
  /* --- UNCHANGED DEPOSIT CODE --- */
  /* (your deposit logic remains exactly as-is) */
}

function validateDepositForm() {
  /* --- UNCHANGED --- */
}

// =====================================================
// ================= WITHDRAW PAGE ======================
// =====================================================
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

async function loadWithdrawBalances() {
  const token = await getBackendToken();
  const res = await fetch(
    `${window.API_BASE_URL}/api/v1/me/dashboard/summary`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();

  return {
    profit: Number(data.totalProfit || 0),
    capital: Number(data.activeInvestment || 0),
    capitalLocked: Boolean(data.capitalLocked),
    capitalUnlockAt: data.capitalUnlockAt
  };
}

function initializeWithdrawPage() {
  const withdrawSourceSelect = document.getElementById('withdrawSource');
  const availableBalanceEl = document.getElementById('availableBalance');
  const displayBalanceEl = document.getElementById('displayBalance');
  const submitBtn = document.getElementById('submitBtn');
  const amountInput = document.getElementById('withdrawAmount');
  const walletAddressInput = document.getElementById('walletAddress');
  const feeDisplay = document.getElementById('feeAmount');
  const netDisplay = document.getElementById('netAmount');

  if (!withdrawSourceSelect || !submitBtn || !amountInput) return;

  let balances = {
    profit: 0,
    capital: 0,
    capitalLocked: false,
    capitalUnlockAt: null
  };

  loadWithdrawBalances().then(b => {
    balances = b;
    handleCapitalLockUI();
    updateWithdrawSource();
  });

  function handleCapitalLockUI() {
    const capitalOption =
      withdrawSourceSelect.querySelector('option[value="capital"]');
    const lockNotice = document.getElementById('capitalLockNotice');
    const unlockDateEl = document.getElementById('capitalUnlockDate');

    if (!capitalOption) return;

    if (balances.capitalLocked) {
      capitalOption.disabled = true;
      withdrawSourceSelect.value = 'profit';

      if (lockNotice) {
        lockNotice.style.display = 'block';
        if (balances.capitalUnlockAt && unlockDateEl) {
          unlockDateEl.textContent = new Date(
            balances.capitalUnlockAt
          ).toLocaleDateString();
        }
      }
    } else {
      capitalOption.disabled = false;
      if (lockNotice) lockNotice.style.display = 'none';
    }
  }

  function updateWithdrawSource() {
    const source = withdrawSourceSelect.value;
    const available = balances[source] || 0;

    availableBalanceEl.textContent = `$${available.toFixed(2)}`;
    displayBalanceEl.textContent = `$${available.toFixed(2)}`;

    if (source === 'capital' && balances.capitalLocked) {
      submitBtn.disabled = true;
      submitBtn.title = 'Investment capital is locked';
    } else {
      submitBtn.title = '';
    }

    validateWithdrawForm();
  }

  withdrawSourceSelect.addEventListener('change', updateWithdrawSource);

  amountInput.addEventListener('input', () => {
    const amount = parseFloat(amountInput.value) || 0;
    const fee = amount * 0.005;
    const net = amount - fee;

    feeDisplay.textContent = `$${fee.toFixed(2)}`;
    netDisplay.textContent = `$${net.toFixed(2)}`;

    validateWithdrawForm();
  });

  walletAddressInput?.addEventListener('input', validateWithdrawForm);

  submitBtn.addEventListener('click', async e => {
    e.preventDefault();
    if (!validateWithdrawForm()) return;

    const token = await getBackendToken();

    await fetch(`${window.API_BASE_URL}/api/v1/me/withdrawals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        amount: parseFloat(amountInput.value),
        currency: "USD",
        method: "USDT_TRC20",
        source: withdrawSourceSelect.value,
        targetAddress: walletAddressInput.value.trim()
      })
    });

    amountInput.value = '';
    walletAddressInput.value = '';
    feeDisplay.textContent = '$0.00';
    netDisplay.textContent = '$0.00';

    loadRecentWithdrawals();
  });

  updateWithdrawSource();
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
  if (!walletAddress) valid = false;

  submitBtn.disabled = !valid;
  return valid;
}

// =====================================================
// ================= WITHDRAW HISTORY ==================
// =====================================================
async function loadRecentWithdrawals() {
  const tbody = document.querySelector(".withdrawals-table tbody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="4">Loading...</td></tr>`;

  try {
    const token = await getBackendToken();
    const res = await fetch(
      `${window.API_BASE_URL}/api/v1/me/withdrawals`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const result = await res.json();
    const withdrawals = Array.isArray(result) ? result : [];

    if (!withdrawals.length) {
      tbody.innerHTML = `<tr><td colspan="4">No withdrawals yet</td></tr>`;
      return;
    }

    tbody.innerHTML = "";

    withdrawals
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .forEach(w => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${new Date(w.createdAt).toLocaleString()}</td>
          <td>${w.method}</td>
          <td>$${Number(w.amount).toFixed(2)}</td>
          <td><span class="status-badge status-${w.status.toLowerCase()}">${w.status}</span></td>
        `;
        tbody.appendChild(tr);
      });

  } catch {
    tbody.innerHTML = `<tr><td colspan="4">Failed to load withdrawals</td></tr>`;
  }
}

// =====================================================
// ================= INIT (SINGLE SOURCE) ===============
// =====================================================
document.addEventListener('DOMContentLoaded', async () => {

  if (document.querySelector('.deposit-content')) {
    await loadSystemMinDeposit();
    initializeDepositPage();
    loadRecentDeposits();
  }

  if (document.querySelector('.withdraw-content')) {
    await loadSystemWithdrawLimits();
    renderWithdrawRules();
    initializeWithdrawPage();
    loadRecentWithdrawals();
  }

});
