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

let chart;
async function loadChart() {
  const canvas = $("performanceChart");
  if (!canvas) return;

  const data = await api("/api/v1/me/dashboard/chart?range=30d");

  if (!data || data.length === 0) {
    canvas.parentElement.innerHTML = `
      <div style="padding:40px;text-align:center;opacity:.6">
        Portfolio performance will appear once ledger history grows.
      </div>`;
    return;
  }

  const labels = data.map(d => d.date);

  if (chart) chart.destroy();

  chart = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Total Balance",
          data: data.map(d => d.totalBalance),
          borderColor: "#2d9cff",
          backgroundColor: "rgba(45,156,255,0.15)",
          fill: true,
          tension: 0.35,
          pointRadius: 2
        },
        {
          label: "Active Investment",
          data: data.map(d => d.activeInvestment),
          borderColor: "#9b8cff",
          borderDash: [6, 6],
          fill: false,
          tension: 0.35,
          pointRadius: 0
        },
        {
          label: "Total Profit",
          data: data.map(d => d.totalProfit),
          borderColor: "#22c55e",
          fill: false,
          tension: 0.35,
          pointRadius: 0
        },
        {
          label: "Daily Profit",
          data: data.map(d => d.dailyProfit),
          borderColor: "#f59e0b",
          borderDash: [4, 4],
          fill: false,
          tension: 0,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            usePointStyle: true,
            pointStyle: "line"
          }
        },
        tooltip: {
          callbacks: {
            label: ctx =>
              `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          ticks: {
            callback: v => `$${v}`
          }
        }
      }
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
