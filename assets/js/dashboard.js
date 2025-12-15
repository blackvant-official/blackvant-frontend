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
const chartDataSets = {
    '7d': {
        labels: ['Dec 9', 'Dec 10', 'Dec 11', 'Dec 12', 'Dec 13', 'Dec 14', 'Dec 15'],
        data: [4500, 4525, 4550, 4575, 4600, 4644.5, 4689.5]
    },
    '30d': {
        labels: ['Nov 16', 'Nov 20', 'Nov 24', 'Nov 28', 'Dec 2', 'Dec 6', 'Dec 10', 'Dec 14', 'Dec 15'],
        data: [4200, 4250, 4300, 4350, 4400, 4450, 4525, 4644.5, 4689.5]
    },
    '90d': {
        labels: ['Sep 17', 'Oct 1', 'Oct 15', 'Oct 29', 'Nov 12', 'Nov 26', 'Dec 10', 'Dec 15'],
        data: [3800, 3900, 4000, 4100, 4200, 4300, 4525, 4689.5]
    },
    '1y': {
        labels: ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov', 'Dec'],
        data: [3000, 3200, 3500, 3800, 4100, 4400, 4689.5]
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
    if (!window.Clerk) throw new Error("Clerk not ready");
    await Clerk.load();
    
    const investmentEl = document.getElementById("investmentBalance");
    const profitEl = document.getElementById("profitBalance");

    if (investmentEl) investmentEl.textContent = `$${(data.balances?.investment ?? 0).toFixed(2)}`;
    if (profitEl) profitEl.textContent = `$${(data.balances?.profit ?? 0).toFixed(2)}`;

    const session = Clerk.session;
    if (!session) throw new Error("No session");

    const token = await session.getToken({ template: "backend" });
    if (!token) throw new Error("No token");

    const res = await fetch(`${window.API_BASE_URL}/api/v1/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    console.log("ME:", data);
  } catch (e) {
    console.error("fetchMe failed:", e);
  }
}

// ====== BACKEND INTEGRATION (KEPT, NOT AUTO-CALLED) ======

async function loadUserBalances() {
    if (!window.Clerk || !window.API_BASE_URL) return;

    await Clerk.load();
    const session = Clerk.session;
    if (!session) return;

    const token = await session.getToken({ template: "backend" });
    if (!token) return;

    const res = await fetch(`${window.API_BASE_URL}/api/v1/me`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const data = await res.json();

    if (document.getElementById("investmentBalance"))
        document.getElementById("investmentBalance").innerText =
            `$${data.investmentBalance ?? 0}`;

    if (document.getElementById("profitBalance"))
        document.getElementById("profitBalance").innerText =
            `$${data.profitBalance ?? 0}`;
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
            }

            // ✅ IMPORTANT FIX:
            // ❌ Do NOT auto-call loadUserBalances() on page load
            // This avoids Render cold-start 502 + fake CORS errors
        }
    });
});
