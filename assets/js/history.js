// ================================
// TRANSACTION HISTORY — FINAL
// ================================

let allTransactions = [];
let filteredTransactions = [];
let currentPage = 1;
const PAGE_SIZE = 10;

// ---------- AUTH HELP ----------
async function getBackendToken() {
  const start = Date.now();
  while (!window.Clerk || !window.Clerk.session) {
    if (Date.now() - start > 5000) {
      throw new Error("Clerk not ready");
    }
    await new Promise(r => setTimeout(r, 50));
  }
  return await window.Clerk.session.getToken({ template: "backend" });
}

// ---------- FETCH & NORMALIZE ----------
async function fetchAndNormalizeTransactions() {
  const token = await getBackendToken();

  const headers = { Authorization: `Bearer ${token}` };

  const [depRes, wdRes] = await Promise.allSettled([
    fetch(`${window.API_BASE_URL}/api/v1/me/deposits`, { headers }),
    fetch(`${window.API_BASE_URL}/api/v1/me/withdrawals`, { headers })
  ]);

  let deposits = [];
  let withdrawals = [];

  if (depRes.status === "fulfilled" && depRes.value.ok) {
    deposits = await depRes.value.json();
  }

  if (wdRes.status === "fulfilled" && wdRes.value.ok) {
    withdrawals = await wdRes.value.json();
  }

  const normalizedDeposits = deposits.map(d => ({
    id: `deposit_${d.id}`,
    type: "deposit",
    amount: Number(d.amount),
    direction: "in",
    status: d.status,
    createdAt: new Date(d.createdAt),
    description: `${d.method} Deposit`,
    raw: d
  }));

  const normalizedWithdrawals = withdrawals.map(w => ({
    id: `withdrawal_${w.id}`,
    type: "withdrawal",
    amount: Number(w.amount),
    direction: "out",
    status: w.status,
    createdAt: new Date(w.createdAt),
    description: `${w.method} Withdrawal`,
    raw: w
  }));

  allTransactions = [...normalizedDeposits, ...normalizedWithdrawals]
    .sort((a, b) => b.createdAt - a.createdAt);

  filteredTransactions = [...allTransactions];
}

// ---------- STATS ----------
function computeStats() {
  const totalTransactions = allTransactions.length;

  const totalDeposited = allTransactions
    .filter(t => t.type === "deposit" && t.status === "approved")
    .reduce((s, t) => s + t.amount, 0);

  const totalWithdrawn = allTransactions
    .filter(t => t.type === "withdrawal" && t.status === "approved")
    .reduce((s, t) => s + t.amount, 0);

  const netProfit = totalDeposited - totalWithdrawn;

  document.getElementById("statTotalTransactions").textContent = totalTransactions;
  document.getElementById("statTotalDeposited").textContent = `$${totalDeposited.toFixed(2)}`;
  document.getElementById("statTotalWithdrawn").textContent = `$${totalWithdrawn.toFixed(2)}`;
  document.getElementById("statNetProfit").textContent = `$${netProfit.toFixed(2)}`;
}

// ---------- FILTERS ----------
function applyFilters() {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const type = document.getElementById("typeFilter").value;
  const status = document.getElementById("statusFilter").value;
  const from = document.getElementById("dateFrom").value;
  const to = document.getElementById("dateTo").value;

  filteredTransactions = allTransactions.filter(t => {
    if (type && t.type !== type) return false;
    if (status && t.status !== status) return false;
    if (from && t.createdAt < new Date(from)) return false;
    if (to && t.createdAt > new Date(to)) return false;
    if (search && !t.description.toLowerCase().includes(search)) return false;
    return true;
  });

  currentPage = 1;
  renderTable();
}

// ---------- TABLE ----------
function renderTable() {
  const tbody = document.getElementById("transactionsTableBody");
  tbody.innerHTML = "";

  if (!filteredTransactions.length) {
    tbody.innerHTML = `<tr><td colspan="6">No transactions found</td></tr>`;
    updatePagination();
    return;
  }

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filteredTransactions.slice(start, start + PAGE_SIZE);

  pageItems.forEach(t => {
    const tr = document.createElement("tr");
    if (t.status === "rejected") tr.classList.add("dimmed");

    const sign = t.direction === "in" ? "+" : "-";

    tr.innerHTML = `
      <td>${t.createdAt.toLocaleDateString()}</td>
      <td>${t.type}</td>
      <td>${t.description}</td>
      <td>${sign}$${t.amount.toFixed(2)}</td>
      <td><span class="status-badge status-${t.status}">${t.status}</span></td>
      <td>-</td>
    `;
    tbody.appendChild(tr);
  });

  updatePagination();
}

// ---------- PAGINATION ----------
function updatePagination() {
  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE);
  document.getElementById("paginationInfo").textContent =
    `Page ${currentPage} of ${totalPages || 1}`;

  document.getElementById("prevPageBtn").disabled = currentPage <= 1;
  document.getElementById("nextPageBtn").disabled = currentPage >= totalPages;
}

document.getElementById("prevPageBtn").onclick = () => {
  if (currentPage > 1) {
    currentPage--;
    renderTable();
  }
};

document.getElementById("nextPageBtn").onclick = () => {
  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE);
  if (currentPage < totalPages) {
    currentPage++;
    renderTable();
  }
};

// ---------- EXPORT ----------
document.getElementById("exportCsvBtn").onclick = () => {
  let csv = "Date,Type,Description,Amount,Status\n";
  filteredTransactions.forEach(t => {
    csv += `${t.createdAt.toISOString()},${t.type},${t.description},${t.amount},${t.status}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "transactions.csv";
  a.click();
};

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await fetchAndNormalizeTransactions();
    computeStats();
    renderTable();
  } catch (err) {
    console.error(err);
  }

  document.getElementById("applyFiltersBtn").onclick = applyFilters;
});
