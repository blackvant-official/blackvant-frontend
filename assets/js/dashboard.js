// =======================================================
// BLACKVANT — FINAL USER DASHBOARD (LEDGER-TRUTHFUL)
// =======================================================

function $(id) {
  return document.getElementById(id);
}

function formatUSD(v) {
  return `$${Number(v || 0).toFixed(2)}`;
}

function formatSignedUSD(v) {
  const n = Number(v || 0);
  return `${n >= 0 ? "+" : "-"}$${Math.abs(n).toFixed(2)}`;
}

// ---------------- AUTH ----------------
async function getToken() {
  await waitForClerk();
  return Clerk.session.getToken({ template: "backend" });
}

async function apiGET(endpoint) {
  const token = await getToken();
  const res = await fetch(`${window.API_BASE_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// =======================================================
// SUMMARY (BALANCES + PROFITS)
// =======================================================
async function loadSummary() {
  const data = await apiGET("/api/v1/me/dashboard/summary");

  $("totalBalance").textContent = formatUSD(data.totalBalance);
  $("investmentBalance").textContent = formatUSD(data.activeInvestment);
  $("totalProfit").textContent = formatSignedUSD(data.totalProfit);
  $("todayProfit").textContent = formatSignedUSD(data.todayProfit);

  // Hide cards that are not meaningful yet
  hideCard("availableBalance");
  hideCard("lockedBalance");
}

function hideCard(valueId) {
  const el = $(valueId);
  if (!el) return;
  const card = el.closest(".card");
  if (card) card.style.display = "none";
}

// =======================================================
// TRANSACTIONS (LEDGER)
// =======================================================
async function loadTransactions() {
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
      .forEach(tx => {
        const sign = tx.direction === "CREDIT" ? "+" : "-";
        const tr = document.createElement("tr");

        tr.innerHTML = `
          <td>${new Date(tx.createdAt).toLocaleDateString()}</td>
          <td>${tx.referenceType}</td>
          <td>${sign}$${Number(tx.amount).toFixed(2)}</td>
          <td>${tx.direction}</td>
        `;

        tbody.appendChild(tr);
      });

  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="4">Failed to load transactions</td></tr>`;
  }
}

// =======================================================
// CHART — LEDGER EQUITY
// =======================================================
let chart;

async function loadChart() {
  const canvas = $("performanceChart");
  if (!canvas) return;

  const data = await apiGET("/api/v1/me/dashboard/chart?range=60d");

  if (!data.length) {
    canvas.parentElement.innerHTML =
      `<div style="padding:40px;text-align:center;opacity:.6">
        Portfolio history will appear once ledger data accumulates.
      </div>`;
    return;
  }

  const labels = data.map(d => d.date);
  const values = data.map(d => Number(d.balance));

  if (chart) chart.destroy();

  chart = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Account Equity",
        data: values,
        borderColor: "#2d9cff",
        backgroundColor: "rgba(45,156,255,0.12)",
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
          ticks: { callback: v => `$${v}` }
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
      await loadSummary();
      await loadChart();
      await loadTransactions();
    }
  });
});
