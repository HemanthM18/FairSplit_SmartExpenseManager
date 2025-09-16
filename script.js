let currentUser = null;
let groups = JSON.parse(localStorage.getItem("groups")) || {};

function login() {
  const name = document.getElementById("username").value.trim();
  if (!name) return alert("Enter a valid name");
  currentUser = name;
  document.getElementById("loginCard").style.display = "none";
  document.getElementById("app").style.display = "block";
  loadGroups();
}

function createGroup() {
  const groupName = document.getElementById("groupName").value.trim();
  if (!groupName) return alert("Enter group name");
  if (!groups[groupName]) groups[groupName] = [];
  saveGroups();
  loadGroups();
}

function loadGroups() {
  const select = document.getElementById("groupSelect");
  select.innerHTML = "";
  Object.keys(groups).forEach(g => {
    const option = document.createElement("option");
    option.value = g;
    option.innerText = g;
    select.appendChild(option);
  });
  if (Object.keys(groups).length > 0) {
    select.value = Object.keys(groups)[0];
    renderExpenses();
  }
}

function addExpense() {
  const payer = document.getElementById("payer").value.trim();
  const amount = parseFloat(document.getElementById("amount").value);
  const participants = document.getElementById("participants").value.split(",").map(p => p.trim()).filter(p => p);
  const description = document.getElementById("description").value.trim();
  const group = document.getElementById("groupSelect").value;

  if (!payer || !amount || participants.length === 0) {
    return alert("Fill all fields properly!");
  }

  const expense = { payer, amount, participants, description };
  groups[group].push(expense);
  saveGroups();
  renderExpenses();
}

function renderExpenses() {
  const group = document.getElementById("groupSelect").value;
  const tbody = document.querySelector("#expenseTable tbody");
  tbody.innerHTML = "";
  groups[group].forEach(exp => {
    const row = `<tr>
      <td>${exp.payer}</td>
      <td>${exp.amount}</td>
      <td>${exp.participants.join(", ")}</td>
      <td>${exp.description}</td>
    </tr>`;
    tbody.innerHTML += row;
  });
  calculateSettlement();
}

function calculateSettlement() {
  const group = document.getElementById("groupSelect").value;
  const balances = {};

  // Calculate net balances
  groups[group].forEach(exp => {
    const share = exp.amount / exp.participants.length;

    // Payer gets credited for amount minus their share
    balances[exp.payer] = (balances[exp.payer] || 0) + (exp.amount - share);

    // Other participants owe their share
    exp.participants.forEach(p => {
      if (p !== exp.payer) {
        balances[p] = (balances[p] || 0) - share;
      }
    });
  });

  const summary = document.getElementById("summary");
  summary.innerHTML = "";

  // Identify main creditor(s)
  const creditors = Object.entries(balances).filter(([_, bal]) => bal > 0);
  const debtors = Object.entries(balances).filter(([_, bal]) => bal < 0);

  if (creditors.length === 0) {
    summary.innerHTML = "<li>No settlements required.</li>";
    return;
  }

  // For simplicity, settle debts to first main creditor
  const [mainCreditor, creditAmount] = creditors[0];
  summary.innerHTML += `<li>${mainCreditor} should receive ${creditAmount.toFixed(2)}</li>`;

  debtors.forEach(([debtor, bal]) => {
    summary.innerHTML += `<li>${debtor} owes ${(-bal).toFixed(2)} to ${mainCreditor}</li>`;
  });

  renderChart(balances);
}

function renderChart(balances) {
  const ctx = document.getElementById("expenseChart").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(balances),
      datasets: [{
        label: "Balance",
        data: Object.values(balances),
        backgroundColor: Object.values(balances).map(v => v >= 0 ? "green" : "red")
      }]
    }
  });
}

function exportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text("FairSplit – Settlement Summary", 20, 20);
  let y = 30;
  document.querySelectorAll("#summary li").forEach(li => {
    doc.text(li.innerText, 20, y);
    y += 10;
  });
  doc.save("settlement.pdf");
}

function exportCSV() {
  let csv = "Payer,Amount,Participants,Description\n";
  const group = document.getElementById("groupSelect").value;
  groups[group].forEach(exp => {
    csv += `${exp.payer},${exp.amount},"${exp.participants.join(";")}",${exp.description}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "expenses.csv";
  link.click();
}

function clearData() {
  if (confirm("Are you sure you want to clear all data?")) {
    groups = {};
    saveGroups();
    loadGroups();
  }
}

function saveGroups() {
  localStorage.setItem("groups", JSON.stringify(groups));
}
