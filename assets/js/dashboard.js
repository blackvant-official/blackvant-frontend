// =======================================================
// BLACKVANT — FINAL USER DASHBOARD (LEDGER-TRUTHFUL)
// =======================================================

function $(id) {
  return document.getElementById(id);
}

function usd(v) {
  return `$${Number(v || 0).toFixed(2)}`;
}

function signed(v) {
  const n = Number(v || 0);
  return `${n >= 0 ? "+" : "-"}$${Math.abs(n).toFixed(2)}`;
}

// ---------------- AUTH ----------------
async function token() {
  await waitForClerk();
  return Clerk.session.getToken({ template: "backend" });
}

async function api(endpoint) {
  const t = await token();
  const r = await fetch(`${window.API_BASE_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${t}` }
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// ---------------- SUMMARY ----------------
async function loadSummary() {
  const d = await api("/api/v1/me/dashboard/summary");
  $("totalBalance").textContent = usd(d.totalBalance);
  $("investmentBalance").textContent = usd(d.activeInvestment);
  $("totalProfit").textContent = signed(d.totalProfit);
  $("todayProfit").textContent = signed(d.todayProfit);
}

// ---------------- TRANSACTIONS ----------------
async function loadTransactions() {
  const tbody = document.querySelector(".transactions-table tbody");
  tbody.innerHTML = "";

  const txs = await api("/api/v1/me/transactions");

  if (!txs.length) {
    tbody.innerHTML = `<tr><td colspan="4">No transactions yet</td></tr>`;
    return;
  }

  txs.forEach(tx => {
    const tr = document.createElement("tr");
    const sign = tx.direction === "CREDIT" ? "+" : "-";

    tr.innerHTML = `
      <td>${new Date(tx.createdAt).toLocaleDateString()}</td>
      <td>${tx.referenceType}</td>
      <td>${sign}$${Number(tx.amount).toFixed(2)}</td>
      <td>${tx.direction}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ---------------- CHART ----------------
let chart;

async function loadChart() {
  const canvas = $("performanceChart");
  const data = await api("/api/v1/me/dashboard/chart?range=30d");

  if (!data.length) {
    canvas.parentElement.innerHTML =
      `<div class="chart-empty">
        Portfolio performance will appear once ledger history grows.
      </div>`;
    return;
  }

  // Ensure at least 2 points for Chart.js
  if (data.length === 1) {
    data.unshift({
      date: data[0].date,
      balance: data[0].balance
    });
  }

  if (chart) chart.destroy();

  chart = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels: data.map(d => d.date),
      datasets: [{
        data: data.map(d => Number(d.balance)),
        borderColor: "#2d9cff",
        backgroundColor: "rgba(45,156,255,0.15)",
        fill: true,
        tension: 0.35
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

// ---------------- INIT ----------------
document.addEventListener("DOMContentLoaded", () => {
  requireAuth({
    redirectTo: "login.html",
    onReady: async () => {
      await loadSummary();
      await loadChart();
      await loadTransactions();
    }
  });
});
