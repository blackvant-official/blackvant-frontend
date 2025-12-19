// =======================================================
// TRANSACTION HISTORY — REAL LEDGER (UI PRESERVED)
// =======================================================

// -------------------------
// LOAD REAL DATA (DEPOSITS + WITHDRAWALS)
// -------------------------
async function loadTransactionsFromBackend() {
    try {
        if (!window.Clerk || !window.API_BASE_URL) return [];

        const token = await window.Clerk.session.getToken({ template: "backend" });

        const [depositsRes, withdrawalsRes] = await Promise.all([
            fetch(`${window.API_BASE_URL}/api/v1/me/deposits`, {
                headers: { Authorization: `Bearer ${token}` }
            }),
            fetch(`${window.API_BASE_URL}/api/v1/me/withdrawals`, {
                headers: { Authorization: `Bearer ${token}` }
            })
        ]);

        const deposits = await depositsRes.json();
        const withdrawals = await withdrawalsRes.json();

        const normalize = (tx, kind) => ({
            id: tx.id,
            createdAt: new Date(tx.createdAt),
            dateLabel: new Date(tx.createdAt).toLocaleDateString(),
            type: kind,
            description:
                kind === "Deposit"
                    ? (tx.method || "USDT Deposit")
                    : (tx.method || "Profit Withdrawal"),
            amount:
                kind === "Deposit"
                    ? Number(tx.amount)
                    : -Math.abs(Number(tx.amount)),
            statusRaw: tx.status, // approved | pending | rejected
            statusLabel:
                tx.status.charAt(0).toUpperCase() + tx.status.slice(1)
        });

        const mappedDeposits = deposits.map(d => normalize(d, "Deposit"));
        const mappedWithdrawals = withdrawals.map(w => normalize(w, "Withdrawal"));

        return [...mappedDeposits, ...mappedWithdrawals];

    } catch (err) {
        console.error("Transaction load failed:", err);
        return [];
    }
}

// -------------------------
// RENDER TABLE ROWS (NO UI CHANGE)
// -------------------------
function renderTransactionsTable(transactions) {
    const tbody = document.getElementById("transactionsTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    transactions
        .sort((a, b) => b.createdAt - a.createdAt)
        .forEach(tx => {
            const tr = document.createElement("tr");

            if (tx.statusRaw === "rejected") {
                tr.style.opacity = "0.55"; // required dimming
            }

            tr.innerHTML = `
                <td>${tx.dateLabel}</td>
                <td>${tx.type}</td>
                <td>${tx.description}</td>
                <td>${tx.amount >= 0 ? "$" + tx.amount.toFixed(2) : "-$" + Math.abs(tx.amount).toFixed(2)}</td>
                <td>
                    <span class="status-badge status-${tx.statusRaw}">
                        ${tx.statusLabel}
                    </span>
                </td>
                <td>
                    <button class="view-details" data-id="${tx.id}">
                        View
                    </button>
                </td>
            `;

            tr.dataset.amount = tx.amount;
            tr.dataset.type = tx.type.toLowerCase();
            tr.dataset.status = tx.statusRaw;
            tr.dataset.date = tx.createdAt.toISOString();

            tbody.appendChild(tr);
        });
}

// -------------------------
// STATISTICS — APPROVED ONLY
// -------------------------
function updateStatistics() {
    const rows = document.querySelectorAll("#transactionsTableBody tr");

    let depositTotal = 0;
    let withdrawalTotal = 0;
    let profitTotal = 0;
    let approvedCount = 0;

    rows.forEach(row => {
        if (row.dataset.status !== "approved") return;

        approvedCount++;

        const amount = Number(row.dataset.amount || 0);
        const type = row.dataset.type;

        if (type === "deposit") depositTotal += amount;
        else if (type === "withdrawal") withdrawalTotal += Math.abs(amount);
        else if (type === "profit") profitTotal += amount;
    });

    document.getElementById("totalTransactions").textContent = approvedCount;
    document.getElementById("totalDeposited").textContent = `$${depositTotal.toFixed(2)}`;
    document.getElementById("totalWithdrawn").textContent = `$${withdrawalTotal.toFixed(2)}`;

    const net = profitTotal - withdrawalTotal;
    document.getElementById("netProfit").textContent =
        net >= 0 ? `+$${net.toFixed(2)}` : `-$${Math.abs(net).toFixed(2)}`;
}

// -------------------------
// FILTERS (UNCHANGED BEHAVIOR)
// -------------------------
function applyFilters() {
    const search = document.getElementById("searchInput")?.value.toLowerCase() || "";
    const from = document.getElementById("dateFrom")?.value || "";
    const to = document.getElementById("dateTo")?.value || "";
    const type = document.getElementById("typeFilter")?.value || "";
    const status = document.getElementById("statusFilter")?.value || "";

    const rows = document.querySelectorAll("#transactionsTableBody tr");
    let visible = 0;

    rows.forEach(row => {
        let show = true;

        const rowText = row.innerText.toLowerCase();
        const rowDate = new Date(row.dataset.date);

        if (search && !rowText.includes(search)) show = false;
        if (from && rowDate < new Date(from)) show = false;
        if (to && rowDate > new Date(to)) show = false;
        if (type && row.dataset.type !== type) show = false;
        if (status && row.dataset.status !== status) show = false;

        row.style.display = show ? "" : "none";
        if (show) visible++;
    });

    updateTableInfo(visible);
}

// -------------------------
// PAGINATION / EXPORT / SORT (UNCHANGED)
// -------------------------
function setupViewDetails() {
    document.addEventListener("click", e => {
        if (!e.target.classList.contains("view-details")) return;

        const row = e.target.closest("tr");

        alert(
            `Transaction ID: ${e.target.dataset.id}\n` +
            `Date: ${row.cells[0].innerText}\n` +
            `Type: ${row.cells[1].innerText}\n` +
            `Description: ${row.cells[2].innerText}\n` +
            `Amount: ${row.cells[3].innerText}\n` +
            `Status: ${row.cells[4].innerText}`
        );
    });
}

// -------------------------
// INIT
// -------------------------
async function initTransactionHistory() {
    const txs = await loadTransactionsFromBackend();
    renderTransactionsTable(txs);
    updateStatistics();
    applyFilters();
    setupViewDetails();
}

document.addEventListener("DOMContentLoaded", () => {
    if (document.querySelector(".transaction-content")) {
        initTransactionHistory();
    }
});
