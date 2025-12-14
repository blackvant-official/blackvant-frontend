// ===== TRANSACTION HISTORY FUNCTIONS =====

// -------------------------
// 🔥 NEW: LOAD REAL DATA
// -------------------------

async function loadTransactionsFromBackend() {
  if (!window.Clerk || !Clerk.session) return;

  const token = await Clerk.session.getToken({ template: "backend" });
  if (!token) return;

    try {
        if (!window.Clerk || !window.API_BASE_URL) return [];

        const token = await window.getAuthToken();
            if (!token) {
              console.warn("No auth token available, skipping backend call");
              return;
            }

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

        // Normalize transactions (so table can display them consistently)
        const mappedDeposits = deposits.map(d => ({
            id: d.id,
            date: new Date(d.createdAt).toLocaleDateString(),
            type: "Deposit",
            description: d.method || "USDT Deposit",
            amount: `$${Number(d.amount).toFixed(2)}`,
            status: d.status.charAt(0).toUpperCase() + d.status.slice(1)
        }));

        const mappedWithdrawals = withdrawals.map(w => ({
            id: w.id,
            date: new Date(w.createdAt).toLocaleDateString(),
            type: "Withdrawal",
            description: w.method || "Profit Withdrawal",
            amount: `-$${Number(w.amount).toFixed(2)}`,
            status: w.status.charAt(0).toUpperCase() + w.status.slice(1)
        }));

        return [...mappedDeposits, ...mappedWithdrawals];

    } catch (error) {
        console.error("Failed to load transactions:", error);
        return [];
    }
}

// -------------------------
// 🔥 NEW: RENDER ROWS
// -------------------------

function renderTransactionsTable(transactions) {
    const tbody = document.getElementById("transactionsTableBody");
    if (!tbody) return;

    tbody.innerHTML = ""; // Clear old dummy rows

    transactions.forEach(tx => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${tx.date}</td>
            <td><span class="transaction-type">${tx.type}</span></td>
            <td>${tx.description}</td>
            <td>${tx.amount}</td>
            <td>
                <span class="status-badge ${tx.status.toLowerCase()}">
                    ${tx.status}
                </span>
            </td>
            <td>
                <button class="view-details" data-id="${tx.id}">
                    View
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });
}

// -------------------------
// EXISTING CODE (UNCHANGED)
// -------------------------

let currentSort = { column: 'date', direction: 'desc' };

function setupTableSorting() {
    const sortableHeaders = document.querySelectorAll('.transactions-table th.sortable');
    if (!sortableHeaders.length) return;

    sortableHeaders.forEach(header => {
        header.addEventListener('click', function () {
            const column = this.getAttribute('data-column') ||
                this.textContent.toLowerCase().replace(/\s+/g, '');

            const isAsc = currentSort.column === column && currentSort.direction === 'asc';

            document.querySelectorAll('.transactions-table th').forEach(h => {
                h.classList.remove('sorted-asc', 'sorted-desc');
            });

            this.classList.add(isAsc ? 'sorted-desc' : 'sorted-asc');

            currentSort = {
                column: column,
                direction: isAsc ? 'desc' : 'asc'
            };

            sortTableData(column, currentSort.direction);
            updateTableInfo();
        });
    });

    const defaultHeader = document.querySelector('.transactions-table th.sortable');
    if (defaultHeader) {
        defaultHeader.classList.add('sorted-desc');
        currentSort.column = defaultHeader.getAttribute('data-column') || 'date';
    }
}

function sortTableData(column, direction) {
    const table = document.querySelector('.transactions-table');
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));

    rows.sort((a, b) => {
        const aValue = getCellValue(a, column);
        const bValue = getCellValue(b, column);

        if (column === 'date') {
            const aDate = new Date(a.cells[0].textContent);
            const bDate = new Date(b.cells[0].textContent);
            return direction === 'asc' ? aDate - bDate : bDate - aDate;
        } else if (column === 'amount') {
            const aAmount = parseFloat(a.cells[3].textContent.replace(/[^0-9.-]+/g, ''));
            const bAmount = parseFloat(b.cells[3].textContent.replace(/[^0-9.-]+/g, ''));
            return direction === 'asc' ? aAmount - bAmount : bAmount - aAmount;
        } else if (column === 'type') {
            return direction === 'asc'
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
        } else if (column === 'status') {
            return direction === 'asc'
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
        }

        return direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    });

    rows.forEach(row => tbody.appendChild(row));
}

function getCellValue(row, column) {
    const cellIndex = {
        'date': 0,
        'type': 1,
        'description': 2,
        'amount': 3,
        'status': 4,
        'actions': 5
    }[column];

    return row.cells[cellIndex] ? row.cells[cellIndex].textContent.toLowerCase() : '';
}

function setupFilters() {
    const applyBtn = document.getElementById('applyFiltersBtn');
    const searchInput = document.getElementById('searchInput');
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    const typeFilter = document.getElementById('typeFilter');
    const statusFilter = document.getElementById('statusFilter');

    if (!applyBtn) return;

    applyBtn.addEventListener('click', applyFilters);

    if (searchInput) {
        searchInput.addEventListener('keyup', function (e) {
            if (e.key === 'Enter') applyFilters();
        });
    }

    [dateFrom, dateTo, typeFilter, statusFilter].forEach(filter => {
        if (filter) filter.addEventListener('change', applyFilters);
    });
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const dateFrom = document.getElementById('dateFrom')?.value || '';
    const dateTo = document.getElementById('dateTo')?.value || '';
    const typeFilter = document.getElementById('typeFilter')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';

    const table = document.querySelector('.transactions-table tbody');
    const rows = table.querySelectorAll('tr');
    let visibleCount = 0;

    rows.forEach(row => {
        const dateText = row.cells[0].textContent;
        const typeText = row.cells[1].textContent.toLowerCase();
        const descText = row.cells[2].textContent.toLowerCase();
        const amountText = row.cells[3].textContent;
        const statusText = row.cells[4].textContent.toLowerCase();

        let visible = true;

        if (searchTerm) {
            const searchable = `${dateText} ${typeText} ${descText} ${amountText} ${statusText}`;
            if (!searchable.toLowerCase().includes(searchTerm)) visible = false;
        }

        if (dateFrom || dateTo) {
            const rowDate = new Date(dateText);
            if (dateFrom && rowDate < new Date(dateFrom)) visible = false;
            if (dateTo && rowDate > new Date(dateTo)) visible = false;
        }

        if (typeFilter) {
            let rowType =
                typeText.includes('profit') ? 'profit' :
                typeText.includes('deposit') ? 'deposit' :
                typeText.includes('withdrawal') ? 'withdrawal' : '';
            if (rowType !== typeFilter) visible = false;
        }

        if (statusFilter) {
            let rowStatus =
                statusText.includes('completed') ? 'completed' :
                statusText.includes('pending') ? 'pending' :
                statusText.includes('processing') ? 'processing' :
                statusText.includes('failed') ? 'failed' : '';
            if (rowStatus !== statusFilter) visible = false;
        }

        row.style.display = visible ? '' : 'none';
        if (visible) visibleCount++;
    });

    updateTableInfo(visibleCount);
}

function setupViewDetails() {
    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('view-details')) {
            const row = event.target.closest('tr');

            const tx = {
                id: event.target.getAttribute("data-id"),
                date: row.cells[0].textContent,
                type: row.cells[1].textContent,
                description: row.cells[2].textContent,
                amount: row.cells[3].textContent,
                status: row.cells[4].textContent
            };

            showTransactionDetails(tx);
        }
    });
}

function showTransactionDetails(tx) {
    alert(
        `Transaction #${tx.id}\n` +
        `Date: ${tx.date}\n` +
        `Type: ${tx.type}\n` +
        `Description: ${tx.description}\n` +
        `Amount: ${tx.amount}\n` +
        `Status: ${tx.status}`
    );
}

function setupPagination() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageBtns = document.querySelectorAll('.pagination-btn[data-page]');
    const tableBody = document.getElementById('transactionsTableBody');

    if (!tableBody) return;

    let currentPage = 1;
    const rowsPerPage = 10;

    const getRows = () => Array.from(tableBody.querySelectorAll('tr')).filter(r => r.style.display !== 'none');

    function showPage(page) {
        currentPage = page;

        const rows = getRows();
        const totalPages = Math.ceil(rows.length / rowsPerPage);

        const start = (page - 1) * rowsPerPage;
        const end = start + rowsPerPage;

        rows.forEach((row, i) => {
            row.style.display = (i >= start && i < end) ? "" : "none";
        });

        pageBtns.forEach(btn => {
            const pageNum = Number(btn.getAttribute("data-page"));
            btn.classList.toggle("active", pageNum === page);
        });

        prevBtn.disabled = page === 1;
        nextBtn.disabled = page === totalPages;

        updateTableInfo(rows.length, page, rowsPerPage);
    }

    pageBtns.forEach(btn => {
        btn.addEventListener("click", () => showPage(Number(btn.getAttribute("data-page"))));
    });

    prevBtn?.addEventListener("click", () => {
        if (currentPage > 1) showPage(currentPage - 1);
    });

    nextBtn?.addEventListener("click", () => {
        showPage(currentPage + 1);
    });

    showPage(1);
}

function updateTableInfo(totalVisible = null, currentPage = 1, rowsPerPage = 10) {
    const tableInfo = document.getElementById("tableInfo");
    const paginationInfo = document.getElementById("paginationInfo");

    const table = document.querySelector(".transactions-table tbody");
    const totalRows = table ? table.querySelectorAll("tr").length : 0;

    const visibleRows = totalVisible ?? totalRows;
    const start = (currentPage - 1) * rowsPerPage + 1;
    const end = Math.min(start + rowsPerPage - 1, visibleRows);

    if (tableInfo) tableInfo.textContent = `Showing ${start}-${end} of ${visibleRows} transactions`;

    if (paginationInfo) {
        const totalPages = Math.ceil(visibleRows / rowsPerPage);
        paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    }
}

function setupExport() {
    const exportBtn = document.getElementById("exportBtn");
    if (!exportBtn) return;

    exportBtn.addEventListener("click", function () {
        const table = document.querySelector(".transactions-table");
        const rows = table.querySelectorAll("tr");

        let csv = "Date,Type,Description,Amount,Status\n";

        rows.forEach(row => {
            if (row.style.display !== "none") {
                const cells = row.querySelectorAll("td");
                if (cells.length >= 5) {
                    csv += [
                        cells[0].textContent,
                        cells[1].textContent.trim(),
                        cells[2].textContent,
                        cells[3].textContent.replace(/[^\d.-]/g, ''),
                        cells[4].textContent.trim()
                    ].map(v => `"${v}"`).join(",") + "\n";
                }
            }
        });

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `blackvant-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    });
}

function updateStatistics() {
    const table = document.querySelector(".transactions-table tbody");
    if (!table) return;

    const rows = table.querySelectorAll("tr");

    let depositTotal = 0;
    let withdrawTotal = 0;
    let profitTotal = 0;

    rows.forEach(row => {
        const amount = parseFloat(row.cells[3].textContent.replace(/[^\d.-]/g, "")) || 0;
        const type = row.cells[1].textContent.toLowerCase();

        if (type.includes("deposit")) depositTotal += amount;
        else if (type.includes("withdrawal")) withdrawTotal += Math.abs(amount);
        else if (type.includes("profit")) profitTotal += amount;
    });

    document.getElementById("totalTransactions").textContent = rows.length;
    document.getElementById("totalDeposited").textContent = `$${depositTotal.toFixed(2)}`;
    document.getElementById("totalWithdrawn").textContent = `$${withdrawTotal.toFixed(2)}`;
    document.getElementById("netProfit").textContent =
        profitTotal >= 0 ? `+$${profitTotal.toFixed(2)}` : `-$${Math.abs(profitTotal).toFixed(2)}`;
}

// -------------------------
// INIT PAGE
// -------------------------

async function initTransactionHistory() {
    // 1️⃣ Load real data
    const transactions = await loadTransactionsFromBackend();

    // 2️⃣ Render into table
    renderTransactionsTable(transactions);

    // 3️⃣ Activate your existing UI features
    setupTableSorting();
    setupFilters();
    setupViewDetails();
    setupPagination();
    setupExport();
    updateStatistics();
    applyFilters();
}

document.addEventListener("DOMContentLoaded", () => {
  requireAuth({
    onReady: () => {
      initTransactionHistory();
    }
  });
});
