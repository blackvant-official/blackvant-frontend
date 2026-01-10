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

  // Prepare data
  const labels = data.map(d => d.date);
  const values = data.map(d => Number(d.balance));

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (chart) chart.destroy();

  chart = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: "#2d9cff",
        backgroundColor: "rgba(45,156,255,0.15)",
        fill: true,
        tension: 0.35,
        pointRadius: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          type: "category"
        },
        y: {
          type: "linear",
          beginAtZero: false,
          suggestedMin: min * 0.995,
          suggestedMax: max * 1.005,
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
