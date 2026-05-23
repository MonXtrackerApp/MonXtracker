import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  addDoc,
  deleteDoc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD-ALiJ0cRxB7ITnXBpc6xoK66ley6AawM",
  authDomain: "monxtracker.firebaseapp.com",
  projectId: "monxtracker",
  storageBucket: "monxtracker.firebasestorage.app",
  messagingSenderId: "870919372970",
  appId: "1:870919372970:web:487e80da7c6679715750d3",
  measurementId: "G-4TR9CQHH10"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

let currentUser = null;
let transactions = [];
let initialBalance = 0;
let monthlyBudget = 0;
let goal = null;
let currentFilter = "all";
let unsubscribeTransactions = null;

const incomeCategories = [
  "Allowance",
  "Salary",
  "Business",
  "Refund",
  "Gift",
  "Other Income"
];

const expenseCategories = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Entertainment",
  "Education",
  "Health",
  "Emergency",
  "Other Expense"
];

const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginEmailBtn = document.getElementById("loginEmailBtn");
const signupEmailBtn = document.getElementById("signupEmailBtn");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const logoutBtn = document.getElementById("logoutBtn");

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

function parseMoney(value) {
  return Number(String(value).replace(",", "."));
}

signupEmailBtn.addEventListener("click", async function () {
  try {
    await createUserWithEmailAndPassword(
      auth,
      emailInput.value,
      passwordInput.value
    );
  } catch (error) {
    alert(error.message);
  }
});

loginEmailBtn.addEventListener("click", async function () {
  try {
    await signInWithEmailAndPassword(
      auth,
      emailInput.value,
      passwordInput.value
    );
  } catch (error) {
    alert(error.message);
  }
});

googleLoginBtn.addEventListener("click", async function () {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    alert(error.message);
  }
});

logoutBtn.addEventListener("click", async function () {
  await signOut(auth);
});

onAuthStateChanged(auth, async function (user) {
  currentUser = user;

  if (user) {
    logoutBtn.style.display = "block";

    await loadUserData();
    listenToTransactions();
    showPage("homePage");
  } else {
    logoutBtn.style.display = "none";

    if (unsubscribeTransactions) {
      unsubscribeTransactions();
    }

    transactions = [];
    initialBalance = 0;
    monthlyBudget = 0;
    goal = null;

    updateApp();
    showPage("authPage");
  }
});

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

setBalanceBtn.addEventListener("click", async function () {
  if (!currentUser) return alert("Please login first.");
  if (initialBalanceInput.value === "") return alert("Please enter a balance amount.");

  initialBalance = parseMoney(initialBalanceInput.value);

  if (isNaN(initialBalance)) return alert("Please enter a valid balance.");

  await setDoc(
    doc(db, "users", currentUser.uid, "settings", "main"),
    { initialBalance: initialBalance },
    { merge: true }
  );

  initialBalanceInput.value = "";
  updateApp();
});

setBudgetBtn.addEventListener("click", async function () {
  if (!currentUser) return alert("Please login first.");
  if (budgetInput.value === "") return alert("Please enter a monthly budget.");

  monthlyBudget = parseMoney(budgetInput.value);

  if (isNaN(monthlyBudget)) return alert("Please enter a valid budget.");

  await setDoc(
    doc(db, "users", currentUser.uid, "settings", "main"),
    { monthlyBudget: monthlyBudget },
    { merge: true }
  );

  budgetInput.value = "";
  updateApp();
});

saveGoalBtn.addEventListener("click", async function () {
  if (!currentUser) return alert("Please login first.");

  if (!goalName.value || !goalTarget.value || !goalSaved.value) {
    return alert("Please fill in all goal details.");
  }

  goal = {
    name: goalName.value,
    target: parseMoney(goalTarget.value),
    saved: parseMoney(goalSaved.value)
  };

  if (isNaN(goal.target) || isNaN(goal.saved)) {
    return alert("Please enter valid goal amounts.");
  }

  await setDoc(doc(db, "users", currentUser.uid, "settings", "goal"), goal);

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

form.addEventListener("submit", async function (event) {
  event.preventDefault();

  if (!currentUser) return alert("Please login first.");

  const amount = parseMoney(amountInput.value);

  if (isNaN(amount) || amount <= 0) {
    return alert("Please enter an amount greater than 0.");
  }

  const now = new Date();

  const transaction = {
    type: typeInput.value,
    amount: amount,
    category: categoryInput.value,
    wallet: walletInput.value,
    note: noteInput.value,
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    }),
    day: now.getDay(),
    monthDay: now.getDate(),
    month: now.getMonth(),
    year: now.getFullYear(),
    createdAt: serverTimestamp()
  };

  await addDoc(
    collection(db, "users", currentUser.uid, "transactions"),
    transaction
  );

  form.reset();
  typeInput.value = "income";

  document.querySelectorAll(".type-btn").forEach(function (btn) {
    btn.classList.remove("active");
  });

  document.querySelector('[data-type="income"]').classList.add("active");

  updateCategories();
  showPage("homePage");
});

async function loadUserData() {
  const settingsSnap = await getDoc(
    doc(db, "users", currentUser.uid, "settings", "main")
  );

  const goalSnap = await getDoc(
    doc(db, "users", currentUser.uid, "settings", "goal")
  );

  if (settingsSnap.exists()) {
    const data = settingsSnap.data();
    initialBalance = Number(data.initialBalance) || 0;
    monthlyBudget = Number(data.monthlyBudget) || 0;
  } else {
    initialBalance = 0;
    monthlyBudget = 0;
  }

  if (goalSnap.exists()) {
    goal = goalSnap.data();
  } else {
    goal = null;
  }
}

function listenToTransactions() {
  if (unsubscribeTransactions) {
    unsubscribeTransactions();
  }

  const q = query(
    collection(db, "users", currentUser.uid, "transactions"),
    orderBy("createdAt", "desc")
  );

  unsubscribeTransactions = onSnapshot(q, function (snapshot) {
    transactions = [];

    snapshot.forEach(function (docSnap) {
      transactions.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    updateApp();
  });
}

function updateCategories() {
  categoryInput.innerHTML = "";

  const categories =
    typeInput.value === "income" ? incomeCategories : expenseCategories;

  categories.forEach(function (category) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryInput.appendChild(option);
  });
}

function getTotals() {
  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach(function (transaction) {
    if (transaction.type === "income") {
      totalIncome += Number(transaction.amount);
    } else {
      totalExpense += Number(transaction.amount);
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

  return `
    <li class="transaction-item ${transaction.type}">
      <div class="transaction-top">
        <strong>${transaction.category}</strong>
        <span>${sign} RM ${Number(transaction.amount).toFixed(2)}</span>
      </div>

      <p class="transaction-meta">
        ${transaction.wallet} • ${transaction.note || "No note"}<br>
        ${transaction.date} • ${transaction.time}
      </p>

      ${
        showDelete
          ? `<button class="delete-btn" onclick="deleteTransaction('${transaction.id}')">Delete</button>`
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
    const matchesFilter =
      currentFilter === "all" || transaction.type === currentFilter;

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

async function deleteTransaction(id) {
  if (!currentUser) return;

  const confirmDelete = confirm("Delete this transaction?");

  if (!confirmDelete) return;

  await deleteDoc(
    doc(db, "users", currentUser.uid, "transactions", id)
  );
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
  if (!currentUser) {
    insightText.textContent = "Login to sync your money tracker across devices.";
    return;
  }

  if (transactions.length === 0) {
    insightText.textContent =
      "Start by adding your first Money In or Money Out transaction.";
    return;
  }

  if (totals.expense > totals.income) {
    insightText.textContent =
      "Your expenses are higher than your income. Try reducing spending this week.";
    return;
  }

  if (totals.income > totals.expense) {
    insightText.textContent =
      "Good progress. Your income is currently higher than your expenses.";
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
    budgetWarning.textContent =
      "Warning: You are almost at or above your budget limit.";
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
  goalAmount.textContent = `RM ${Number(goal.saved).toFixed(2)} / RM ${Number(goal.target).toFixed(2)}`;

  const percentage = Math.min((goal.saved / goal.target) * 100, 100);
  goalProgress.style.width = `${percentage}%`;
}

function updateCharts(totalIncome, totalExpense) {
  const weeklyExpense = [0, 0, 0, 0, 0, 0, 0];
  const monthlyExpense = new Array(31).fill(0);
  const categoryTotals = {};

  transactions.forEach(function (transaction) {
    if (transaction.type === "expense") {
      weeklyExpense[transaction.day] += Number(transaction.amount);
      monthlyExpense[transaction.monthDay - 1] += Number(transaction.amount);

      if (!categoryTotals[transaction.category]) {
        categoryTotals[transaction.category] = 0;
      }

      categoryTotals[transaction.category] += Number(transaction.amount);
    }
  });

  if (weeklyChart) weeklyChart.destroy();

  weeklyChart = new Chart(document.getElementById("weeklyChart"), {
    type: "bar",
    data: {
      labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      datasets: [{ label: "Weekly Spending", data: weeklyExpense }]
    }
  });

  if (incomeExpenseChart) incomeExpenseChart.destroy();

  incomeExpenseChart = new Chart(
    document.getElementById("incomeExpenseChart"),
    {
      type: "doughnut",
      data: {
        labels: ["Money In", "Money Out"],
        datasets: [{ data: [totalIncome, totalExpense] }]
      }
    }
  );

  if (categoryChart) categoryChart.destroy();

  categoryChart = new Chart(document.getElementById("categoryChart"), {
    type: "pie",
    data: {
      labels: Object.keys(categoryTotals),
      datasets: [{ data: Object.values(categoryTotals) }]
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
          tension: 0.35
        }
      ]
    }
  });
}

function showPage(pageId) {
  if (!currentUser && pageId !== "authPage") {
    pageId = "authPage";
  }

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

async function clearAllData() {
  if (!currentUser) return alert("Please login first.");

  const confirmClear = confirm(
    "This will delete all your cloud transactions and settings. Continue?"
  );

  if (!confirmClear) return;

  const transactionSnap = await getDocs(
    collection(db, "users", currentUser.uid, "transactions")
  );

  const deletePromises = [];

  transactionSnap.forEach(function (docSnap) {
    deletePromises.push(
      deleteDoc(doc(db, "users", currentUser.uid, "transactions", docSnap.id))
    );
  });

  deletePromises.push(
    setDoc(doc(db, "users", currentUser.uid, "settings", "main"), {
      initialBalance: 0,
      monthlyBudget: 0
    })
  );

  deletePromises.push(
    setDoc(doc(db, "users", currentUser.uid, "settings", "goal"), {
      name: "",
      target: 0,
      saved: 0
    })
  );

  await Promise.all(deletePromises);

  initialBalance = 0;
  monthlyBudget = 0;
  goal = null;

  updateApp();

  alert("All cloud data cleared.");
}

window.showPage = showPage;
window.deleteTransaction = deleteTransaction;
window.setFilter = setFilter;
window.exportCSV = exportCSV;
window.clearAllData = clearAllData;

if (localStorage.getItem("theme") === "light") {
  document.body.classList.add("light");
  themeToggle.textContent = "☀️";
}

updateCategories();
updateApp();
showPage("authPage");