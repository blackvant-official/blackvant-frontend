// =======================================================
// BLACKVANT — TRANSACTION HISTORY (REAL LEDGER)
// UI: LOCKED | LOGIC: REAL BACKEND
// =======================================================

// =======================================================
// BACKEND LOADER
// =======================================================

async function loadTransactionsFromBackend() {
    if (!window.Clerk || !window.API_BASE_URL) return [];

    try {
        const token = await window.Clerk.session.getToken({ template: "backend" });

        const res = await fetch(
            `${window.API_BASE_URL}/api/v1/me/transactions`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const ledger = await res.json();

        return ledger.map(tx => {
          const type =
            tx.referenceType === "DEPOSIT" ? "deposit" :
            tx.referenceType === "WITHDRAWAL" ? "withdrawal" :
            "profit";
                
          const signedAmount =
            tx.direction === "CREDIT"
              ? Number(tx.amount)
              : -Number(tx.amount);
                
          return {
            id: tx.id,
            createdAt: new Date(tx.createdAt),
            dateLabel: new Date(tx.createdAt).toLocaleString(undefined, {
              year: "numeric",
              month: "short",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit"
            }),
            type,
            description:
              type === "deposit" ? "USDT Deposit" :
              type === "withdrawal" ? "Crypto Withdrawal" :
              "Profit Credit",
            amount: signedAmount,
            status: tx.status || "approved"
          };
        });


    } catch (err) {
        console.error("Transaction load failed:", err);
        return [];
    }
}


// =======================================================
// TABLE RENDERING (UI UNCHANGED)
// =======================================================

function renderTransactionsTable(transactions) {
    const tbody = document.getElementById("transactionsTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    transactions
        .sort((a, b) => b.createdAt - a.createdAt)
        .forEach(tx => {
            const tr = document.createElement("tr");

            if (tx.status === "rejected") {
                tr.style.opacity = "0.55";
            }

            tr.dataset.amount = tx.amount;
            tr.dataset.type = tx.type.toLowerCase();
            tr.dataset.status = tx.status || "approved";
            tr.dataset.date = tx.createdAt.toISOString();

            tr.innerHTML = `
                <td>${tx.dateLabel}</td>
                <td>${tx.type}</td>
                <td>${tx.description}</td>
                <td>${tx.amount >= 0 ? "$" + tx.amount.toFixed(2) : "-$" + Math.abs(tx.amount).toFixed(2)}</td>
                <td>
                    <span class="status-badge status-${tx.status || "approved"}">
                      ${(tx.status || "approved").charAt(0).toUpperCase() +
                        (tx.status || "approved").slice(1)}
                    </span>

                </td>
                <td>
                    <button class="view-details" data-id="${tx.id}">
                        View
                    </button>
                </td>
            `;

            tbody.appendChild(tr);
        });
}

// =======================================================
// STATISTICS (APPROVED-ONLY LEDGER)
// =======================================================

function updateStatistics() {
    const rows = Array.from(
      document.querySelectorAll("#transactionsTableBody tr")
    ).filter(row => row.style.display !== "none");

    let deposits = 0;
    let withdrawals = 0;
    let profits = 0;
    let approvedCount = 0;

    rows.forEach(row => {
        if (row.dataset.status !== "approved") return;

        approvedCount++;

        const amount = Number(row.dataset.amount);
        const type = row.dataset.type;

        if (type === "deposit") deposits += amount;
        else if (type === "withdrawal") withdrawals += Math.abs(amount);
        else if (type === "profit") profits += amount;
    });

    document.getElementById("totalTransactions").textContent = approvedCount;
    document.getElementById("totalDeposited").textContent = `$${deposits.toFixed(2)}`;
    document.getElementById("totalWithdrawn").textContent = `$${withdrawals.toFixed(2)}`;

    const net = profits - withdrawals;
    document.getElementById("netProfit").textContent =
        net >= 0 ? `+$${net.toFixed(2)}` : `-$${Math.abs(net).toFixed(2)}`;
}

// =======================================================
// FILTERS (RESTORED)
// =======================================================

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

        const rowDate = new Date(row.dataset.date);
        const text = row.innerText.toLowerCase();

        if (search && !text.includes(search)) show = false;
        if (from && rowDate < new Date(from)) show = false;
        if (to && rowDate > new Date(to)) show = false;
        if (type && type !== "All Types" && row.dataset.type !== type.toLowerCase()) {
            show = false;
        }
        if (status) {
            const statusMap = {
              completed: "approved",
              pending: "pending",
              rejected: "rejected"
            };


        
            const mappedStatus = statusMap[status] || status;
        
            if (row.dataset.status !== mappedStatus) {
                show = false;
            }
        }
        

        row.dataset.filtered = show ? "true" : "false";
        if (show) visible++;
    });

    setupPagination();
    updateTableInfo(visible);
}

function setupFilters() {
    const applyBtn = document.getElementById("applyFiltersBtn");
    if (!applyBtn) return;

    applyBtn.onclick = () => {
        currentPage = 1;      // reset pagination
        applyFilters();
        updateStatistics();
    };
}

// =======================================================
// PAGINATION (FULLY RESTORED)
// =======================================================

let currentPage = 1;
const rowsPerPage = 10;

function setupPagination() {
    const rows = Array.from(document.querySelectorAll("#transactionsTableBody tr"))
        .filter(r => r.dataset.filtered !== "false");

    const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));

    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const pageBtns = document.querySelectorAll(".pagination-btn[data-page]");

    function showPage(page) {
        currentPage = page;

        rows.forEach((row, i) => {
            row.style.display =
                i >= (page - 1) * rowsPerPage && i < page * rowsPerPage
                    ? ""
                    : "none";
        });

        pageBtns.forEach(btn => {
            const p = Number(btn.dataset.page);
            btn.classList.toggle("active", p === page);
            btn.style.display = p <= totalPages ? "" : "none";
        });

        prevBtn.disabled = page === 1;
        nextBtn.disabled = page === totalPages;

        updateTableInfo(rows.length, page);
        const paginationInfo = document.getElementById("paginationInfo");
        if (paginationInfo) {
            paginationInfo.textContent = `Page ${page} of ${totalPages}`;
        }

    }

    pageBtns.forEach(btn => {
        btn.onclick = () => showPage(Number(btn.dataset.page));
    });

    prevBtn.onclick = () => currentPage > 1 && showPage(currentPage - 1);
    nextBtn.onclick = () => currentPage < totalPages && showPage(currentPage + 1);

    showPage(Math.min(currentPage, totalPages));
}

// =======================================================
// TABLE INFO
// =======================================================

function updateTableInfo(total, page = currentPage) {
    const start = (page - 1) * rowsPerPage + 1;
    const end = Math.min(start + rowsPerPage - 1, total);

    document.getElementById("tableInfo").textContent =
        total === 0
            ? "Showing 0 transactions"
            : `Showing ${start}-${end} of ${total} transactions`;
}

// =======================================================
// EXPORT CSV (RESTORED)
// =======================================================

function setupExport() {
    const btn = document.getElementById("exportBtn");
    if (!btn) return;

    btn.onclick = () => {
        const rows = document.querySelectorAll("#transactionsTableBody tr");
        let csv = "Date,Type,Description,Amount,Status\n";

        rows.forEach(row => {
            if (row.style.display === "none") return;

            const cells = row.querySelectorAll("td");
            csv += [
                cells[0].innerText,
                cells[1].innerText,
                cells[2].innerText,
                cells[3].innerText.replace(/[^\d.-]/g, ""),
                cells[4].innerText
            ].map(v => `"${v}"`).join(",") + "\n";
        });

        const blob = new Blob([csv], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `blackvant-transactions-${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
    };
}

// =======================================================
// VIEW DETAILS
// =======================================================

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

// =======================================================
// INIT (ORDER IS CRITICAL)
// =======================================================

async function initTransactionHistory() {
    const data = await loadTransactionsFromBackend();
    renderTransactionsTable(data);
    setupExport();
    setupViewDetails();
    setupFilters();       // ✅ ADD THIS
    applyFilters();       // initial load
    updateStatistics();
    
    document.querySelector(".transaction-content").style.visibility = "visible";
}


