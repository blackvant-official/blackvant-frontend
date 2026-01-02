// ===== DASHBOARD FUNCTIONS =====

// Mobile sidebar toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('mobile-open');
    }
}

// Close sidebar when clicking outside on mobile
function setupSidebarClose() {
    document.addEventListener('click', function(event) {
        const sidebar = document.getElementById('sidebar');
        const mobileBtn = document.getElementById('mobileMenuBtn');
        
        if (
            window.innerWidth <= 768 &&
            sidebar &&
            mobileBtn &&
            !sidebar.contains(event.target) &&
            !mobileBtn.contains(event.target) &&
            sidebar.classList.contains('mobile-open')
        ) {
            sidebar.classList.remove('mobile-open');
        }
    });
}

// Chart Data for different time periods
// Chart Data (ZERO-STATE, REAL-DATA READY)
const chartDataSets = {
    '7d': {
        labels: ['No data'],
        data: [0]
    },
    '30d': {
        labels: ['No data'],
        data: [0]
    },
    '90d': {
        labels: ['No data'],
        data: [0]
    },
    '1y': {
        labels: ['No data'],
        data: [0]
    }
};


// Initialize Chart.js
let performanceChart = null;

function initializeChart() {
    const ctx = document.getElementById('performanceChart');
    if (!ctx) return;

    performanceChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: chartDataSets['7d'].labels,
            datasets: [{
                label: 'Portfolio Value',
                data: chartDataSets['7d'].data,
                borderColor: '#2d9cff',
                backgroundColor: 'rgba(45, 156, 255, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#2d9cff',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            resizeDelay: 200,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(30, 34, 48, 0.9)',
                    titleColor: '#94a3b8',
                    bodyColor: '#ffffff',
                    borderColor: '#2d3748',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `$${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(45, 55, 72, 0.3)', borderColor: '#2d3748' },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    grid: { color: 'rgba(45, 55, 72, 0.3)', borderColor: '#2d3748' },
                    ticks: {
                        color: '#94a3b8',
                        callback: function(value) { return '$' + value; }
                    }
                }
            },
            interaction: { intersect: false, mode: 'index' }
        }
    });
}

// Chart filter functionality
function setupChartFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const period = this.getAttribute('data-period');

            if (performanceChart) {
                performanceChart.data.labels = chartDataSets[period].labels;
                performanceChart.data.datasets[0].data = chartDataSets[period].data;
                performanceChart.update();
            }
        });
    });
}

// Handle window resize for chart responsiveness
function setupChartResize() {
    window.addEventListener('resize', function() {
        if (performanceChart) performanceChart.resize();
    });
}

// Setup event listeners for dashboard
function setupDashboardEventListeners() {
    const mobileBtn = document.getElementById('mobileMenuBtn');
    if (mobileBtn) {
        mobileBtn.addEventListener('click', toggleSidebar);
    }
}

async function fetchMe() {
  try {
    const token = await window.getAuthToken();
    if (!token) return;

    const res = await fetch(`${window.API_BASE_URL}/api/v1/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    console.log("ME:", data);

    // ---- BALANCE CARDS ----
// ❌ Ledger migration:
// Balances are no longer read from /me
// Kept intentionally disabled


    // ---- PROFIT CARDS ----
    const totalProfitEl = document.getElementById("totalProfit");
    const todayProfitEl = document.getElementById("todayProfit");

    if (totalProfitEl) {
      totalProfitEl.textContent = `+$${(data.balances?.profit ?? 0).toFixed(2)}`;
    }

    if (todayProfitEl) {
      todayProfitEl.textContent = `+$0.00`;
    }

  } catch (e) {
    console.error("fetchMe failed:", e);
  }
}


// ====== BACKEND INTEGRATION (KEPT, NOT AUTO-CALLED) ======

async function loadUserBalances() {
    try {
        const token = await window.getAuthToken();
        if (!token) return;

        const res = await fetch(`${window.API_BASE_URL}/api/v1/me/balance`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await res.json();
        if (!data.success) return;

        const balance = Number(data.balance.availableBalance || 0).toFixed(2);

        const investmentEl = document.getElementById("investmentBalance");
        const profitEl = document.getElementById("profitBalance");

        if (investmentEl) investmentEl.textContent = `$${balance}`;
        if (profitEl) profitEl.textContent = `$0.00`; // profits ledger comes later
    } catch (err) {
        console.error("Ledger balance load failed:", err);
    }
}


async function loadRecentTransactions() {
    const tbody = document.querySelector(".transactions-table tbody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="4">Loading...</td></tr>`;

    try {
        const token = await window.Clerk.session.getToken({ template: "backend" });
        const headers = {
            Authorization: `Bearer ${token}`
        };

        const [depRes, wdRes] = await Promise.all([
            fetch(`${window.API_BASE_URL}/api/v1/me/deposits`, { headers }),
            fetch(`${window.API_BASE_URL}/api/v1/me/withdrawals`, { headers })
        ]);

        const deposits = depRes.ok ? await depRes.json() : [];
        const withdrawals = wdRes.ok ? await wdRes.json() : [];

        const transactions = [
            ...deposits.map(d => ({
                date: d.createdAt,
                type: "Deposit",
                amount: `+$${Number(d.amount).toFixed(2)}`,
                status: d.status
            })),
            ...withdrawals.map(w => ({
                date: w.createdAt,
                type: "Withdraw",
                amount: `-$${Number(w.amount).toFixed(2)}`,
                status: w.status
            }))
        ];

        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (transactions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4">No transactions yet</td></tr>`;
            return;
        }

        tbody.innerHTML = "";
        transactions.slice(0, 5).forEach(tx => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${new Date(tx.date).toLocaleDateString()}</td>
                <td>${tx.type}</td>
                <td>${tx.amount}</td>
                <td>${tx.status}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error("Failed to load transactions", err);
        tbody.innerHTML = `<tr><td colspan="4">Failed to load transactions</td></tr>`;
    }
}

// ======================
// SAFE INITIALIZATION
// ======================
document.addEventListener('DOMContentLoaded', function() {
    requireAuth({
        onReady: () => {
            setupSidebarClose();
            setupDashboardEventListeners();
        
            if (document.getElementById('performanceChart')) {
                initializeChart();
                setupChartFilters();
                setupChartResize();
                loadRecentTransactions();
            }
        
            loadUserBalances(); // ✅ ledger-based balance
        }
    });

});
