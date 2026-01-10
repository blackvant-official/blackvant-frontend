// =======================================================
// BLACKVANT — USER DASHBOARD (LEDGER-TRUTHFUL)
// Source of truth: Ledger only
// =======================================================

// -----------------------------
// UI HELPERS
// -----------------------------
function $(id) {
  return document.getElementById(id);
}

function formatUSD(value) {
  const n = Number(value || 0);
  return `$${n.toFixed(2)}`;
}

function formatSignedUSD(value) {
  const n = Number(value || 0);
  return (n >= 0 ? "+" : "-") + `$${Math.abs(n).toFixed(2)}`;
}

// -----------------------------
// AUTH TOKEN
// -----------------------------
async function getToken() {
  await waitForClerk();
  return Clerk.session.getToken({ template: "backend" });
}

// -----------------------------
// API HELPERS
// -----------------------------
async function apiGET(endpoint) {
  const token = await getToken();
  const res = await fetch(`${window.API_BASE_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "API error");
  }

  return res.json();
}

// =======================================================
// DASHBOARD SUMMARY (BALANCES + PROFITS)
// =======================================================
async function loadDashboardSummary() {
  const data = await apiGET("/api/v1/me/dashboard/summary");

  $("totalBalance").textContent = formatUSD(data.totalBalance);
  $("availableBalance").textContent = formatUSD(data.availableBalance);
  // $("lockedBalance").textContent = formatUSD(data.lockedBalance);
  $("investmentBalance").textContent = formatUSD(data.activeInvestment);

  $("totalProfit").textContent = formatSignedUSD(data.totalProfit);
  $("todayProfit").textContent = formatSignedUSD(data.todayProfit);
}
// Temporarily hide Locked Capital card (not implemented yet)
const lockedCard = $("lockedBalance")?.closest(".card");
if (lockedCard) lockedCard.style.display = "none";

// =======================================================
// RECENT TRANSACTIONS (LEDGER)
// =======================================================
async function loadRecentTransactions() {
  const tbody = document.querySelector(".transactions-table tbody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="4">Loading...</td></tr>`;

  try {
    const txs = await apiGET("/api/v1/me/transactions");

    if (!txs.length) {
      tbody.innerHTML = `<tr><td colspan="4">No transactions yet</td></tr>`;
      return;
    }

    tbody.innerHTML = "";

    txs
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .forEach(tx => {
        const tr = document.createElement("tr");

        const sign = tx.direction === "CREDIT" ? "+" : "-";
        const amount = `${sign}$${Number(tx.amount).toFixed(2)}`;

        tr.innerHTML = `
          <td>${new Date(tx.createdAt).toLocaleDateString()}</td>
          <td>${tx.referenceType}</td>
          <td>${amount}</td>
          <td>${tx.status || "completed"}</td>
        `;

        tbody.appendChild(tr);
      });

  } catch (err) {
    console.error("Transaction load failed:", err);
    tbody.innerHTML = `<tr><td colspan="4">Failed to load transactions</td></tr>`;
  }
}

// =======================================================
// PORTFOLIO PERFORMANCE CHART (LEDGER EQUITY)
// =======================================================
let performanceChart = null;

async function loadPerformanceChart(range = "30d") {
  const ctx = $("performanceChart");
  if (!ctx) return;

  const data = await apiGET(`/api/v1/me/dashboard/chart?range=${range}`);

  if (!data.length) {
    ctx.parentElement.innerHTML =
      `<div style="opacity:.6;text-align:center;padding:40px">
        No historical data yet
      </div>`;
    return;
  }

  const labels = data.map(d => d.date);
  const values = data.map(d => Number(d.balance));

  if (performanceChart) performanceChart.destroy();

  performanceChart = new Chart(ctx.getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Account Equity",
        data: values,
        borderColor: "#2d9cff",
        backgroundColor: "rgba(45,156,255,0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.35,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          ticks: {
            callback: v => `$${v}`
          }
        }
      }
    }
  });
}

// =======================================================
// SIDEBAR (MOBILE)
// =======================================================
function setupSidebar() {
  const btn = $("mobileMenuBtn");
  const sidebar = $("sidebar");

  if (!btn || !sidebar) return;

  btn.onclick = () => sidebar.classList.toggle("mobile-open");

  document.addEventListener("click", e => {
    if (
      window.innerWidth <= 768 &&
      sidebar.classList.contains("mobile-open") &&
      !sidebar.contains(e.target) &&
      !btn.contains(e.target)
    ) {
      sidebar.classList.remove("mobile-open");
    }
  });
}

// =======================================================
// INIT
// =======================================================
document.addEventListener("DOMContentLoaded", () => {
  requireAuth({
    redirectTo: "login.html",
    onReady: async () => {
      setupSidebar();

      try {
        await loadDashboardSummary();
        await loadRecentTransactions();
        await loadPerformanceChart("30d");
      } catch (err) {
        console.error("Dashboard init failed:", err);
        alert("Failed to load dashboard data.");
      }
    }
  });
});
