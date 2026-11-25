const DEFAULT_WALLET_ADDRESS = "0xa22C526137E6597BFa11f0E807fe89823b7cFd2C";
const CONTRACT_ADDRESS = "0x665f00FA6F2b88b81b02402e6816ba92C7091b60";
const GANACHE_RPC = "http://127.0.0.1:7545";
const API_URL = "../backend/api.php";

const WASTE_RATES = {
  plastik: 100,
  kertas: 80,
  logam: 200
};

const BANK_SAMPAH_ABI = [
  {
    inputs: [],
    name: "registerUser",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "string", name: "wasteType", type: "string" },
      { internalType: "uint256", name: "weightKg", type: "uint256" }
    ],
    name: "calculateIncentive",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "string", name: "wasteType", type: "string" },
      { internalType: "uint256", name: "weightKg", type: "uint256" }
    ],
    name: "collectWaste",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "withdrawIncentive",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "getMySummary",
    outputs: [
      { internalType: "bool", name: "isRegistered", type: "bool" },
      { internalType: "uint256", name: "totalWeightKg", type: "uint256" },
      { internalType: "uint256", name: "incentiveBalance", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  }
];

const state = {
  web3: null,
  contract: null,
  account: DEFAULT_WALLET_ADDRESS,
  isDemoMode: false,
  backendAvailable: false,
  users: [],
  reports: [],
  demoUsers: [
    {
      id: 1,
      username: "warga_demo_01",
      wallet_address: DEFAULT_WALLET_ADDRESS,
      balance: 4.5,
      incentive_balance: 450
    }
  ],
demoReports: [
    {
      id: 1,
      username: "warga_demo_01",
      wallet_address: DEFAULT_WALLET_ADDRESS,
      waste_type: "plastik",
      weight: 4.5,
      incentive_earned: 450,
      tx_type: "collect",
      tx_hash: "0x5404664bcf738fef3474bd771a87ce9623e5db1f265b15cc99c494060dd85c3f",
      transaction_date: "Block #2"
    }
  ]
};

// Elemen DOM
const navLinks = document.querySelectorAll(".nav-link");
const pageSections = document.querySelectorAll(".page-section");
const connectWalletBtn = document.getElementById("connectWalletBtn");
const walletAddressText = document.getElementById("walletAddressText");
const contractAddressText = document.getElementById("contractAddressText");
const modeBadge = document.getElementById("modeBadge");
const networkStatusStat = document.getElementById("networkStatusStat");
const alertBox = document.getElementById("alertBox");

const totalWeightStat = document.getElementById("totalWeightStat");
const incentiveBalanceStat = document.getElementById("incentiveBalanceStat");
const totalTxStat = document.getElementById("totalTxStat");
const usersTableBody = document.getElementById("usersTableBody");
const reportsTableBody = document.getElementById("reportsTableBody");

const collectWasteForm = document.getElementById("collectWasteForm");
const usernameInput = document.getElementById("usernameInput");
const wasteTypeSelect = document.getElementById("wasteTypeSelect");
const weightInput = document.getElementById("weightInput");
const estimatedIncentiveBox = document.getElementById("estimatedIncentiveBox");

const registerUserForm = document.getElementById("registerUserForm");
const regUsernameInput = document.getElementById("regUsernameInput");
const regWalletInput = document.getElementById("regWalletInput");

const withdrawForm = document.getElementById("withdrawForm");
const withdrawUsernameInput = document.getElementById("withdrawUsernameInput");
const withdrawAmountInput = document.getElementById("withdrawAmountInput");
const refreshReportsBtn = document.getElementById("refreshReportsBtn");

function showAlert(message, type = "info") {
  if (!alertBox) return;
  alertBox.textContent = message;
  alertBox.className = `alert ${type}`;
}

function hideAlert() {
  if (!alertBox) return;
  alertBox.className = "alert hidden";
}

function shortenHash(hash = "") {
  if (!hash || hash.length <= 14) return hash || "-";
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function switchTab(sectionId) {
  pageSections.forEach((sec) => {
    sec.classList.toggle("active", sec.id === sectionId);
  });
  navLinks.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.section === sectionId);
  });
}

function initNavigation() {
  navLinks.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = btn.dataset.section;
      if (targetId) {
        switchTab(targetId);
      }
    });
  });
}

function updateEstimate() {
  const type = wasteTypeSelect ? wasteTypeSelect.value : "plastik";
  const weight = parseFloat(weightInput ? weightInput.value : "0") || 0;
  const rate = WASTE_RATES[type] || 100;
  const points = Math.round(weight * rate);
  if (estimatedIncentiveBox) {
    estimatedIncentiveBox.textContent = `${points} Poin`;
  }
  return points;
}

function renderHeaderStatus() {
  if (walletAddressText) {
    walletAddressText.textContent = state.account || "Belum terhubung";
  }
  if (regWalletInput && !regWalletInput.value.trim()) {
    regWalletInput.value = state.account || DEFAULT_WALLET_ADDRESS;
  }
  if (contractAddressText) {
    contractAddressText.textContent = CONTRACT_ADDRESS
      ? CONTRACT_ADDRESS
      : "Belum diset (jalankan truffle migrate lalu isi CONTRACT_ADDRESS)";
  }
  if (modeBadge) {
    if (state.backendAvailable) {
      modeBadge.textContent = "Mode: MySQL + Web3";
    } else if (state.isDemoMode) {
      modeBadge.textContent = "Mode: Demo Lokal";
    } else {
      modeBadge.textContent = "Mode: Auto-Detect";
    }
  }
  if (networkStatusStat) {
    if (window.ethereum) {
      networkStatusStat.textContent = `Wallet Terhubung (${shortenHash(state.account)})`;
    } else {
      networkStatusStat.textContent = state.backendAvailable ? "Backend Aktif" : "Mode Demo";
    }
  }
}

function renderSummaryAndTables() {
  const users = state.backendAvailable ? state.users : state.demoUsers;
  const reports = state.backendAvailable ? state.reports : state.demoReports;

  const totalWeight = reports
    .filter((r) => r.tx_type !== "withdraw")
    .reduce((acc, r) => acc + (parseFloat(r.weight) || 0), 0);

  const totalIncentive = users.reduce(
    (acc, u) => acc + (parseFloat(u.incentive_balance) || 0),
    0
  );

  if (totalWeightStat) {
    totalWeightStat.textContent = `${Number(totalWeight.toFixed(2))} kg`;
  }
  if (incentiveBalanceStat) {
    incentiveBalanceStat.textContent = `${Math.round(totalIncentive)} Poin`;
  }
  if (totalTxStat) {
    totalTxStat.textContent = String(reports.length);
  }

  if (usersTableBody) {
    if (!users.length) {
      usersTableBody.innerHTML = `<tr><td colspan="5" class="empty-cell">Belum ada data warga.</td></tr>`;
    } else {
      usersTableBody.innerHTML = users
        .map(
          (u) => `
          <tr>
            <td>${escapeHtml(u.id ?? "-")}</td>
            <td>${escapeHtml(u.username)}</td>
            <td class="mono-text">${escapeHtml(shortenHash(u.wallet_address))}</td>
            <td>${escapeHtml(u.balance ?? 0)} kg</td>
            <td>${escapeHtml(u.incentive_balance ?? 0)} Poin</td>
          </tr>
        `
        )
        .join("");
    }
  }

  if (reportsTableBody) {
    if (!reports.length) {
      reportsTableBody.innerHTML = `<tr><td colspan="9" class="empty-cell">Belum ada transaksi.</td></tr>`;
    } else {
      reportsTableBody.innerHTML = reports
        .map(
          (r) => `
          <tr>
            <td>${escapeHtml(r.id ?? "-")}</td>
            <td>${escapeHtml(r.username)}</td>
            <td class="mono-text">${escapeHtml(shortenHash(r.wallet_address))}</td>
            <td>${escapeHtml(r.waste_type || "-")}</td>
            <td>${escapeHtml(r.weight ?? 0)}</td>
            <td>${escapeHtml(r.incentive_earned ?? 0)}</td>
            <td>${escapeHtml(r.tx_type || "-")}</td>
            <td class="mono-text" title="${escapeHtml(r.tx_hash || "")}">${escapeHtml(shortenHash(r.tx_hash))}</td>
            <td>${escapeHtml(r.transaction_date || "-")}</td>
          </tr>
        `
        )
        .join("");
    }
  }
}

async function fetchBackendData() {
  try {
    const res = await fetch(`${API_URL}?action=dashboard_data`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data && data.status === "success") {
      state.backendAvailable = true;
      state.isDemoMode = false;
      state.users = Array.isArray(data.users) ? data.users : [];
      state.reports = Array.isArray(data.reports) ? data.reports : [];
      renderSummaryAndTables();
      renderHeaderStatus();
      return true;
    }
    throw new Error(data.message || "Respons API tidak valid");
  } catch (err) {
    state.backendAvailable = false;
    state.isDemoMode = true;
    renderSummaryAndTables();
    renderHeaderStatus();
    return false;
  }
}

async function postToBackend(payload) {
  if (!state.backendAvailable) {
    return null;
  }
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok || data.status !== "success") {
    throw new Error(data.message || "Gagal menyimpan ke backend");
  }
  return data;
}

async function initWeb3AndContract() {
  if (typeof window.Web3 === "undefined") return;

  if (window.ethereum) {
    state.web3 = new window.Web3(window.ethereum);
  } else {
    state.web3 = new window.Web3(new window.Web3.providers.HttpProvider(GANACHE_RPC));
  }

  if (CONTRACT_ADDRESS && state.web3.utils.isAddress(CONTRACT_ADDRESS)) {
    state.contract = new state.web3.eth.Contract(BANK_SAMPAH_ABI, CONTRACT_ADDRESS);
  }
}

async function connectWallet() {
  try {
    await initWeb3AndContract();

    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (accounts && accounts.length > 0) {
        state.account = accounts[0];
        if (regWalletInput) {
          regWalletInput.value = state.account;
        }
        renderHeaderStatus();
        showAlert(`Wallet terhubung: ${state.account}`, "success");
        return;
      }
    }

    state.account = DEFAULT_WALLET_ADDRESS;
    renderHeaderStatus();
    showAlert(`MetaMask tidak terdeteksi; menggunakan akun default ${DEFAULT_WALLET_ADDRESS}`, "info");
  } catch (err) {
    showAlert(`Koneksi wallet dibatalkan atau gagal: ${err.message}`, "error");
  }
}

async function sendContractTxIfAvailable(methodBuilder) {
  if (!state.contract || !state.account) return null;
  const code = await state.web3.eth.getCode(CONTRACT_ADDRESS);
  if (!code || code === "0x") return null;
  const receipt = await methodBuilder.send({ from: state.account });
  return receipt && receipt.transactionHash ? receipt.transactionHash : null;
}

function generateLocalTxHash() {
  const chars = "0123456789abcdef";
  let hash = "0x";
  for (let i = 0; i < 64; i += 1) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

async function handleCollectWaste(e) {
  e.preventDefault();
  hideAlert();

  const username = (usernameInput ? usernameInput.value : "").trim();
  const wasteType = wasteTypeSelect ? wasteTypeSelect.value : "plastik";
  const weight = parseFloat(weightInput ? weightInput.value : "0");

  if (!username || Number.isNaN(weight) || weight <= 0) {
    showAlert("Lengkapi username dan berat sampah (> 0 kg).", "error");
    return;
  }

  const incentive = updateEstimate();
  let txHash = generateLocalTxHash();

  try {
    await initWeb3AndContract();
    const chainHash = await sendContractTxIfAvailable(
      state.contract ? state.contract.methods.collectWaste(wasteType, Math.max(1, Math.round(weight))) : null
    );
    if (chainHash) txHash = chainHash;
  } catch (_) {
    // Tetap lanjutkan pencatatan ke backend / mode demo jika kontrak belum di-deploy
  }

  try {
    if (state.backendAvailable) {
      await postToBackend({
        action: "collect_waste",
        username,
        wallet_address: state.account || DEFAULT_WALLET_ADDRESS,
        waste_type: wasteType,
        weight,
        incentive_earned: incentive,
        tx_hash: txHash
      });
      await fetchBackendData();
    } else {
      state.demoReports.unshift({
        id: state.demoReports.length + 1,
        username,
        wallet_address: state.account || DEFAULT_WALLET_ADDRESS,
        waste_type: wasteType,
        weight,
        incentive_earned: incentive,
        tx_type: "collect",
        tx_hash: txHash,
        transaction_date: new Date().toLocaleString("id-ID")
      });
      renderSummaryAndTables();
    }

    collectWasteForm.reset();
    updateEstimate();
    showAlert(`Setoran ${weight} kg (${wasteType}) tercatat. Insentif: ${incentive} Poin.`, "success");
    switchTab("laporanSection");
  } catch (err) {
    showAlert(`Gagal menyimpan setoran: ${err.message}`, "error");
  }
}

async function handleRegisterUser(e) {
  e.preventDefault();
  hideAlert();

  const username = (regUsernameInput ? regUsernameInput.value : "").trim();
  const wallet = (regWalletInput ? regWalletInput.value : "").trim() || state.account || DEFAULT_WALLET_ADDRESS;

  if (!username) {
    showAlert("Masukkan username warga.", "error");
    return;
  }

  try {
    if (state.backendAvailable) {
      await postToBackend({
        action: "register_user",
        username,
        wallet_address: wallet
      });
      await fetchBackendData();
    } else {
      state.demoUsers.push({
        id: state.demoUsers.length + 1,
        username,
        wallet_address: wallet,
        balance: 0,
        incentive_balance: 0
      });
      renderSummaryAndTables();
    }

    registerUserForm.reset();
    if (regWalletInput) regWalletInput.value = wallet;
    showAlert(`Warga "${username}" berhasil didaftarkan.`, "success");
  } catch (err) {
    showAlert(`Gagal mendaftarkan warga: ${err.message}`, "error");
  }
}

async function handleWithdraw(e) {
  e.preventDefault();
  hideAlert();

  const username = (withdrawUsernameInput ? withdrawUsernameInput.value : "").trim();
  const amount = parseInt(withdrawAmountInput ? withdrawAmountInput.value : "0", 10);

  if (!username || Number.isNaN(amount) || amount <= 0) {
    showAlert("Masukkan username dan jumlah insentif yang valid.", "error");
    return;
  }

  const txHash = generateLocalTxHash();

  try {
    if (state.backendAvailable) {
      await postToBackend({
        action: "withdraw_incentive",
        username,
        wallet_address: state.account || DEFAULT_WALLET_ADDRESS,
        amount,
        tx_hash: txHash
      });
      await fetchBackendData();
    } else {
      const targetUser = state.demoUsers.find(
        (u) => u.username.toLowerCase() === username.toLowerCase()
      );
      if (targetUser) {
        targetUser.incentive_balance = Math.max(0, (targetUser.incentive_balance || 0) - amount);
      }
      state.demoReports.unshift({
        id: state.demoReports.length + 1,
        username,
        wallet_address: state.account || DEFAULT_WALLET_ADDRESS,
        waste_type: "-",
        weight: 0,
        incentive_earned: amount,
        tx_type: "withdraw",
        tx_hash: txHash,
        transaction_date: new Date().toLocaleString("id-ID")
      });
      renderSummaryAndTables();
    }

    withdrawForm.reset();
    showAlert(`Penarikan insentif sebesar ${amount} Poin untuk "${username}" berhasil dicatat.`, "success");
    switchTab("laporanSection");
  } catch (err) {
    showAlert(`Gagal memproses penarikan: ${err.message}`, "error");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  initNavigation();
  updateEstimate();
  renderHeaderStatus();
  renderSummaryAndTables();

  if (connectWalletBtn) {
    connectWalletBtn.addEventListener("click", connectWallet);
  }
  if (wasteTypeSelect) {
    wasteTypeSelect.addEventListener("change", updateEstimate);
  }
  if (weightInput) {
    weightInput.addEventListener("input", updateEstimate);
  }
  if (collectWasteForm) {
    collectWasteForm.addEventListener("submit", handleCollectWaste);
  }
  if (registerUserForm) {
    registerUserForm.addEventListener("submit", handleRegisterUser);
  }
  if (withdrawForm) {
    withdrawForm.addEventListener("submit", handleWithdraw);
  }
  if (refreshReportsBtn) {
    refreshReportsBtn.addEventListener("click", fetchBackendData);
  }

  if (window.ethereum && window.ethereum.on) {
    window.ethereum.on("accountsChanged", (accounts) => {
      state.account = accounts && accounts.length ? accounts[0] : DEFAULT_WALLET_ADDRESS;
      if (regWalletInput) regWalletInput.value = state.account;
      renderHeaderStatus();
    });
  }

  await initWeb3AndContract();
  await fetchBackendData();
});