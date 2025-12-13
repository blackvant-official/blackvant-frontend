// ===== DASHBOARD FUNCTIONS =====

// Mobile sidebar toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('mobile-open');
}

// Close sidebar when clicking outside on mobile
function setupSidebarClose() {
    document.addEventListener('click', function (event) {
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

// ===== CHART DATA =====
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

let performanceChart = null;

function initializeChart() {
    const ctx = document.getElementById('performanceChart');
    if (!ctx) return;

    performanceChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: chartDataSets['7d'].labels,
            datasets: [{
                data: chartDataSets['7d'].data,
                borderColor: '#2d9cff',
                backgroundColor: 'rgba(45,156,255,.1)',
                borderWidth: 2,
                fill: true,
                tension: .4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}

// ===== BACKEND INTEGRATION (FINAL FIX) =====
async function loadUserBalances(retry = true) {
    try {
        const token = await getAuthToken();
        if (!token) return;

        const res = await fetch(`${window.API_BASE_URL}/api/v1/me`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json"
            }
        });

        if (!res.ok) throw new Error("API not ready");

        const data = await res.json();

        document.getElementById("investmentBalance").innerText =
            `$${data.investmentBalance ?? 0}`;

        document.getElementById("profitBalance").innerText =
            `$${data.profitBalance ?? 0}`;

    } catch (err) {
        // 🔑 IMPORTANT: retry once after Render wakes up
        if (retry) {
            setTimeout(() => loadUserBalances(false), 1200);
        } else {
            console.warn("Backend still waking up, skipping balance load");
        }
    }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', function () {
    requireAuth({
        onReady: async () => {
            setupSidebarClose();
            initializeChart();
            await loadUserBalances();
        }
    });
});
