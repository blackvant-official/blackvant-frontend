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
  const totalBalanceEl = $("totalBalance");
  const investmentBalanceEl = $("investmentBalance");
  const totalProfitEl = $("totalProfit");
  const todayProfitEl = $("todayProfit");

  // 🛑 Not on dashboard page — silently exit
  if (
    !totalBalanceEl ||
    !investmentBalanceEl ||
    !totalProfitEl ||
    !todayProfitEl
  ) {
    return;
  }

  const d = await api("/api/v1/me/dashboard/summary");

  totalBalanceEl.textContent = usd(d.totalBalance);
  investmentBalanceEl.textContent = usd(d.activeInvestment);
  totalProfitEl.textContent = signed(d.totalProfit);
  todayProfitEl.textContent = signed(d.todayProfit);
}


// ---------------- TRANSACTIONS ----------------
async function loadTransactions() {
  const tbody = document.querySelector(".transactions-table tbody");

  // 🛑 Not on dashboard page — silently exit
  if (!tbody) return;

  tbody.innerHTML = "";

  const txs = await api("/api/v1/me/transactions");

  if (!txs.length) {
    tbody.innerHTML = `<tr><td colspan="4">No transactions yet</td></tr>`;
    return;
  }

  // Group by type
  const grouped = {
    deposit: [],
    withdrawal: [],
    profit: []
  };

  txs
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach(tx => {
      if (grouped[tx.type] && grouped[tx.type].length < 2) {
        grouped[tx.type].push(tx);
      }
    });

  // Flatten groups
  const recent = [
    ...grouped.deposit,
    ...grouped.withdrawal,
    ...grouped.profit
  ];

  // Render
  recent.forEach(tx => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${new Date(tx.createdAt).toLocaleDateString()}</td>
      <td>${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}</td>
      <td>${tx.amount >= 0 ? "+" : "-"}$${Math.abs(tx.amount).toFixed(2)}</td>
      <td>
        <span class="status-badge status-${tx.status}">
          ${tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
        </span>
      </td>
    `;

    tbody.appendChild(tr);
  });
}


let chart;
async function loadChart() {
  const canvas = $("performanceChart");
  const indicatorContainer = $("chartIndicators");
  if (!canvas || !indicatorContainer) return;

  const data = await api("/api/v1/me/dashboard/chart?range=30d");

  if (!data || data.length === 0) {
    canvas.parentElement.innerHTML = `
      <div style="padding:40px;text-align:center;opacity:.6">
        Portfolio performance will appear once ledger history grows.
      </div>`;
    return;
  }

  const labels = data.map(d => d.date);

  const datasets = [
    {
      label: "Total Balance",
      data: data.map(d => d.totalBalance),
      color: "#2d9cff",
      borderColor: "#2d9cff",
      backgroundColor: "rgba(45,156,255,0.15)",
      fill: true,
      tension: 0.35
    },
    {
      label: "Active Investment",
      data: data.map(d => d.activeInvestment),
      color: "#9b8cff",
      borderColor: "#9b8cff",
      borderDash: [6, 6],
      fill: false,
      tension: 0.35
    },
    {
      label: "Total Profit",
      data: data.map(d => d.totalProfit),
      color: "#22c55e",
      borderColor: "#22c55e",
      fill: false,
      tension: 0.35
    },
    {
      label: "Daily Profit",
      data: data.map(d => d.dailyProfit),
      color: "#f59e0b",
      borderColor: "#f59e0b",
      borderDash: [4, 4],
      fill: false,
      tension: 0
    }
  ];

  if (chart) chart.destroy();

  chart = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: datasets.map(d => ({
        ...d,
        pointRadius: 0
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx =>
              `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}`
          }
        }
      },
      scales: {
        y: {
          ticks: { callback: v => `$${v}` }
        }
      }
    }
  });

  // ---------- Custom Indicators ----------
  indicatorContainer.innerHTML = "";

  chart.data.datasets.forEach((ds, i) => {
    const pill = document.createElement("div");
    pill.className = "chart-indicator active";

    pill.innerHTML = `
      <span class="chart-indicator-dot" style="background:${datasets[i].color}"></span>
      ${ds.label}
    `;

    pill.onclick = () => {
      const meta = chart.getDatasetMeta(i);
      meta.hidden = meta.hidden === null ? !chart.data.datasets[i].hidden : null;

      pill.classList.toggle("inactive", meta.hidden);
      pill.classList.toggle("active", !meta.hidden);

      chart.update();
    };

    indicatorContainer.appendChild(pill);
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
