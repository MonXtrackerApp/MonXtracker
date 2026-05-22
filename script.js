let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
let initialBalance = Number(localStorage.getItem("initialBalance")) || 0;
let monthlyBudget = Number(localStorage.getItem("monthlyBudget")) || 0;
let goal = JSON.parse(localStorage.getItem("goal")) || null;
let currentFilter = "all";

const incomeCategories = ["Allowance", "Salary", "Business", "Refund", "Gift", "Other Income"];
const expenseCategories = ["Food", "Transport", "Shopping", "Bills", "Entertainment", "Education", "Health", "Emergency", "Other Expense"];

const form = document.getElementById("transactionForm");
const typeInput = document.getElementById("type");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const walletInput = document.getElementById("wallet");
const noteInput = document.getElementById("note");

const balanceDisplay = document.getElementById("balance");
const moneyInDisplay = document.getElementById("moneyIn");
const moneyOutDisplay = document.getElementById("moneyOut");
const transactionList = document.getElementById("transactionList");
const recentList = document.getElementById("recentList");
const insightText = document.getElementById("insightText");

const initialBalanceInput = document.getElementById("initialBalanceInput");
const setBalanceBtn = document.getElementById("setBalanceBtn");

const budgetInput = document.getElementById("budgetInput");
const setBudgetBtn = document.getElementById("setBudgetBtn");
const budgetStatus = document.getElementById("budgetStatus");
const budgetProgress = document.getElementById("budgetProgress");
const budgetWarning = document.getElementById("budgetWarning");

const goalName = document.getElementById("goalName");
const goalTarget = document.getElementById("goalTarget");
const goalSaved = document.getElementById("goalSaved");
const saveGoalBtn = document.getElementById("saveGoalBtn");
const goalTitle = document.getElementById("goalTitle");
const goalAmount = document.getElementById("goalAmount");
const goalProgress = document.getElementById("goalProgress");

const searchInput = document.getElementById("searchInput");
const themeToggle = document.getElementById("themeToggle");

let weeklyChart;
let incomeExpenseChart;
let categoryChart;
let monthlyChart;

document.querySelectorAll(".type-btn").forEach(function (button) {
  button.addEventListener("click", function () {
    document.querySelectorAll(".type-btn").forEach(function (btn) {
      btn.classList.remove("active");
    });

    button.classList.add("active");
    typeInput.value = button.dataset.type;
    updateCategories();
  });
});

setBalanceBtn.addEventListener("click", function () {
  const value = Number(initialBalanceInput.value);

  if (initialBalanceInput.value === "") {
    alert("Please enter a balance amount.");
    return;
  }

  initialBalance = value;
  localStorage.setItem("initialBalance", initialBalance);
  initialBalanceInput.value = "";
  updateApp();
});

setBudgetBtn.addEventListener("click", function () {
  const value = Number(budgetInput.value);

  if (budgetInput.value === "") {
    alert("Please enter a monthly budget.");
    return;
  }

  monthlyBudget = value;
  localStorage.setItem("monthlyBudget", monthlyBudget);
  budgetInput.value = "";
  updateApp();
});

saveGoalBtn.addEventListener("click", function () {
  if (!goalName.value || !goalTarget.value || !goalSaved.value) {
    alert("Please fill in all goal details.");
    return;
  }

  goal = {
    name: goalName.value,
    target: Number(goalTarget.value),
    saved: Number(goalSaved.value)
  };

  localStorage.setItem("goal", JSON.stringify(goal));

  goalName.value = "";
  goalTarget.value = "";
  goalSaved.value = "";

  updateGoal();
});

searchInput.addEventListener("input", renderHistory);

themeToggle.addEventListener("click", function () {
  document.body.classList.toggle("light");

  if (document.body.classList.contains("light")) {
    localStorage.setItem("theme", "light");
    themeToggle.textContent = "☀️";
  } else {
    localStorage.setItem("theme", "dark");
    themeToggle.textContent = "🌙";
  }
});

form.addEventListener("submit", function (event) {
  event.preventDefault();

  const amount = Number(amountInput.value);

  if (amount <= 0) {
    alert("Please enter an amount greater than 0.");
    return;
  }

  const now = new Date();

  const transaction = {
    id: Date.now(),
    type: typeInput.value,
    amount: amount,
    category: categoryInput.value,
    wallet: walletInput.value,
    note: noteInput.value,
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    day: now.getDay(),
    monthDay: now.getDate(),
    month: now.getMonth(),
    year: now.getFullYear()
  };

  transactions.unshift(transaction);

  saveTransactions();
  form.reset();

  typeInput.value = "income";
  document.querySelectorAll(".type-btn").forEach(function (btn) {
    btn.classList.remove("active");
  });
  document.querySelector('[data-type="income"]').classList.add("active");

  updateCategories();
  updateApp();
  showPage("homePage");
});

function updateCategories() {
  categoryInput.innerHTML = "";

  const categories = typeInput.value === "income" ? incomeCategories : expenseCategories;

  categories.forEach(function (category) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryInput.appendChild(option);
  });
}

function saveTransactions() {
  localStorage.setItem("transactions", JSON.stringify(transactions));
}

function getTotals() {
  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach(function (transaction) {
    if (transaction.type === "income") {
      totalIncome += transaction.amount;
    } else {
      totalExpense += transaction.amount;
    }
  });

  return {
    income: totalIncome,
    expense: totalExpense,
    balance: initialBalance + totalIncome - totalExpense
  };
}

function updateApp() {
  const totals = getTotals();

  balanceDisplay.textContent = `RM ${totals.balance.toFixed(2)}`;
  moneyInDisplay.textContent = `RM ${totals.income.toFixed(2)}`;
  moneyOutDisplay.textContent = `RM ${totals.expense.toFixed(2)}`;

  renderRecent();
  renderHistory();
  updateInsight(totals);
  updateBudget(totals.expense);
  updateGoal();
  updateCharts(totals.income, totals.expense);
}

function createTransactionHTML(transaction, showDelete = true) {
  const sign = transaction.type === "income" ? "+" : "-";
  const amountClass = transaction.type === "income" ? "income-amount" : "expense-amount";

  return `
    <li class="transaction-item ${transaction.type}">
      <div class="transaction-top">
        <strong>${transaction.category}</strong>
        <span class="${amountClass}">${sign} RM ${transaction.amount.toFixed(2)}</span>
      </div>

      <p class="transaction-meta">
        ${transaction.wallet} • ${transaction.note || "No note"}<br>
        ${transaction.date} • ${transaction.time}
      </p>

      ${
        showDelete
          ? `<button class="delete-btn" onclick="deleteTransaction(${transaction.id})">Delete</button>`
          : ""
      }
    </li>
  `;
}

function renderRecent() {
  recentList.innerHTML = "";

  const recent = transactions.slice(0, 3);

  if (recent.length === 0) {
    recentList.innerHTML = `<p class="small-text">No transactions yet.</p>`;
    return;
  }

  recent.forEach(function (transaction) {
    recentList.innerHTML += createTransactionHTML(transaction, false);
  });
}

function renderHistory() {
  transactionList.innerHTML = "";

  const keyword = searchInput.value.toLowerCase();

  const filtered = transactions.filter(function (transaction) {
    const matchesFilter = currentFilter === "all" || transaction.type === currentFilter;

    const matchesSearch =
      transaction.category.toLowerCase().includes(keyword) ||
      transaction.wallet.toLowerCase().includes(keyword) ||
      (transaction.note || "").toLowerCase().includes(keyword);

    return matchesFilter && matchesSearch;
  });

  if (filtered.length === 0) {
    transactionList.innerHTML = `<p class="small-text">No matching transactions.</p>`;
    return;
  }

  filtered.forEach(function (transaction) {
    transactionList.innerHTML += createTransactionHTML(transaction, true);
  });
}

function deleteTransaction(id) {
  const confirmDelete = confirm("Delete this transaction?");

  if (!confirmDelete) return;

  transactions = transactions.filter(function (transaction) {
    return transaction.id !== id;
  });

  saveTransactions();
  updateApp();
}

function setFilter(filter) {
  currentFilter = filter;

  document.querySelectorAll(".filter-btn").forEach(function (button) {
    button.classList.remove("active");
  });

  const buttons = document.querySelectorAll(".filter-btn");

  if (filter === "all") buttons[0].classList.add("active");
  if (filter === "income") buttons[1].classList.add("active");
  if (filter === "expense") buttons[2].classList.add("active");

  renderHistory();
}

function updateInsight(totals) {
  if (transactions.length === 0) {
    insightText.textContent = "Start by adding your first Money In or Money Out transaction.";
    return;
  }

  if (totals.expense > totals.income) {
    insightText.textContent = "Your expenses are higher than your income. Try reducing spending this week.";
    return;
  }

  if (totals.income > totals.expense) {
    insightText.textContent = "Good progress. Your income is currently higher than your expenses.";
    return;
  }

  insightText.textContent = "Your income and expenses are balanced.";
}

function updateBudget(totalExpense) {
  budgetStatus.textContent = `RM ${totalExpense.toFixed(2)} / RM ${monthlyBudget.toFixed(2)}`;

  if (monthlyBudget <= 0) {
    budgetProgress.style.width = "0%";
    budgetWarning.textContent = "No budget set yet.";
    budgetProgress.style.background = "var(--green)";
    return;
  }

  const percentage = Math.min((totalExpense / monthlyBudget) * 100, 100);
  budgetProgress.style.width = `${percentage}%`;

  if (percentage < 70) {
    budgetWarning.textContent = "Budget status is healthy.";
    budgetProgress.style.background = "var(--green)";
  } else if (percentage < 90) {
    budgetWarning.textContent = "You are getting close to your budget limit.";
    budgetProgress.style.background = "var(--yellow)";
  } else {
    budgetWarning.textContent = "Warning: You are almost at or above your budget limit.";
    budgetProgress.style.background = "var(--red)";
  }
}

function updateGoal() {
  if (!goal) {
    goalTitle.textContent = "No goal yet";
    goalAmount.textContent = "RM 0.00 / RM 0.00";
    goalProgress.style.width = "0%";
    return;
  }

  goalTitle.textContent = goal.name;
  goalAmount.textContent = `RM ${goal.saved.toFixed(2)} / RM ${goal.target.toFixed(2)}`;

  const percentage = Math.min((goal.saved / goal.target) * 100, 100);
  goalProgress.style.width = `${percentage}%`;
}

function updateCharts(totalIncome, totalExpense) {
  const weeklyExpense = [0, 0, 0, 0, 0, 0, 0];
  const monthlyExpense = new Array(31).fill(0);
  const categoryTotals = {};

  transactions.forEach(function (transaction) {
    if (transaction.type === "expense") {
      weeklyExpense[transaction.day] += transaction.amount;
      monthlyExpense[transaction.monthDay - 1] += transaction.amount;

      if (!categoryTotals[transaction.category]) {
        categoryTotals[transaction.category] = 0;
      }

      categoryTotals[transaction.category] += transaction.amount;
    }
  });

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: "#111"
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: "#111"
        }
      },
      y: {
        ticks: {
          color: "#111"
        }
      }
    }
  };

  if (weeklyChart) weeklyChart.destroy();

  weeklyChart = new Chart(document.getElementById("weeklyChart"), {
    type: "bar",
    data: {
      labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      datasets: [
        {
          label: "Weekly Spending",
          data: weeklyExpense,
          borderWidth: 1
        }
      ]
    },
    options: chartOptions
  });

  if (incomeExpenseChart) incomeExpenseChart.destroy();

  incomeExpenseChart = new Chart(document.getElementById("incomeExpenseChart"), {
    type: "doughnut",
    data: {
      labels: ["Money In", "Money Out"],
      datasets: [
        {
          data: [totalIncome, totalExpense]
        }
      ]
    }
  });

  if (categoryChart) categoryChart.destroy();

  categoryChart = new Chart(document.getElementById("categoryChart"), {
    type: "pie",
    data: {
      labels: Object.keys(categoryTotals),
      datasets: [
        {
          data: Object.values(categoryTotals)
        }
      ]
    }
  });

  if (monthlyChart) monthlyChart.destroy();

  monthlyChart = new Chart(document.getElementById("monthlyChart"), {
    type: "line",
    data: {
      labels: Array.from({ length: 31 }, (_, i) => String(i + 1)),
      datasets: [
        {
          label: "Monthly Spending",
          data: monthlyExpense,
          tension: 0.35,
          borderWidth: 2
        }
      ]
    },
    options: chartOptions
  });
}

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(function (page) {
    page.classList.remove("active");
  });

  document.getElementById(pageId).classList.add("active");

  document.querySelectorAll(".nav-btn").forEach(function (button) {
    button.classList.remove("active");
  });

  const navButtons = document.querySelectorAll(".nav-btn");

  if (pageId === "homePage") navButtons[0].classList.add("active");
  if (pageId === "addPage") navButtons[1].classList.add("active");
  if (pageId === "analyticsPage") navButtons[2].classList.add("active");
  if (pageId === "budgetPage") navButtons[3].classList.add("active");
  if (pageId === "historyPage") navButtons[4].classList.add("active");
}

function exportCSV() {
  if (transactions.length === 0) {
    alert("No transactions to export.");
    return;
  }

  let csv = "Type,Amount,Category,Wallet,Note,Date,Time\n";

  transactions.forEach(function (transaction) {
    csv += `${transaction.type},${transaction.amount},${transaction.category},${transaction.wallet},"${transaction.note || ""}",${transaction.date},${transaction.time}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "MonXtracker-transactions.csv";
  link.click();

  URL.revokeObjectURL(url);
}

function clearAllData() {
  const confirmClear = confirm("This will delete all MonXtracker data on this device. Continue?");

  if (!confirmClear) return;

  localStorage.clear();
  transactions = [];
  initialBalance = 0;
  monthlyBudget = 0;
  goal = null;

  updateApp();
  alert("All data cleared.");
}

if (localStorage.getItem("theme") === "light") {
  document.body.classList.add("light");
  themeToggle.textContent = "☀️";
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}

updateCategories();
updateApp();
showPage("homePage");