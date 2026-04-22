import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, get, set, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAeZ6-QBxkvWLeHG-N20pjxvIHe05OK6Oc",
  authDomain: "simu-bank.firebaseapp.com",
  databaseURL: "https://simu-bank-default-rtdb.firebaseio.com",
  projectId: "simu-bank",
  storageBucket: "simu-bank.firebasestorage.app",
  messagingSenderId: "88269096434",
  appId: "1:88269096434:web:c030c1e599c9dc92af576b"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

let currentUser = null;
let currentUserName = null;

const GAS_URL = "https://script.google.com/macros/s/AKfycbys3jtI5KoMIxZb56RX2a8sxHRIwmRi0JNZRb8ixtIa9oMEhZdGf0--KzfmYN8i7ZgC/exec";

function showLoading(show) {
  document.getElementById("loading").style.display = show ? "block" : "none";
}

async function loadNotices() {
  const div = document.getElementById("noticeList");
  try {
    const res = await fetch(GAS_URL);
    const notices = await res.json();
    if (!notices || notices.length === 0) {
      div.innerHTML = '<p class="notice-empty">お知らせはありません</p>';
      return;
    }
    div.innerHTML = notices.map((n) => {
      let dateStr = n.date;
      try {
        const d = new Date(n.date);
        if (!Number.isNaN(d.getTime())) {
          dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
        }
      } catch (e) {}
      return `<div class="notice-item">
        <div class="notice-date">${dateStr} ${n.title}</div>
        ${n.body ? `<div class="notice-body">${n.body}</div>` : ""}
      </div>`;
    }).join("");
  } catch (e) {
    div.innerHTML = '<p class="notice-empty">お知らせを取得できませんでした</p>';
  }
}

function showScreen(screen) {
  document.getElementById("restoreLoading").style.display = "none";
  document.getElementById("loginScreen").style.display = screen === "login" ? "block" : "none";
  document.getElementById("bankScreen").style.display = screen === "bank" ? "block" : "none";
}

function updateBankUI() {
  document.getElementById("userName").textContent = `👤 ${currentUserName}`;
  document.getElementById("balance").textContent = currentUser.balance;
  const historyDiv = document.getElementById("history");
  const hist = currentUser.history || [];
  historyDiv.innerHTML = hist.length === 0
    ? '<p style="color:#aaa;font-size:0.85em;margin:0;">取引履歴はありません</p>'
    : hist.slice().reverse().map((h) => `<div class="history-item">${h}</div>`).join("");
}

async function loadPendingRequests() {
  const div = document.getElementById("pendingList");
  try {
    const snap = await get(ref(db, `requests/${currentUserName}`));
    if (!snap.exists()) {
      div.innerHTML = '<p style="color:#aaa;font-size:0.85em;margin:0;">申請はありません</p>';
      return;
    }
    div.innerHTML = Object.entries(snap.val()).map(([id, req]) => `
      <div style="padding:8px 0;border-bottom:1px solid #f0f0f0;">
        <b>${req.from}</b> から <b>${req.amount} しむ</b> の申請
        <div style="margin-top:6px;display:flex;gap:6px;">
          <button onclick="approveRequest('${id}','${req.from}',${req.amount})" style="width:auto;padding:5px 12px;font-size:0.85em;display:inline-block;margin:0;flex:1;">✅ 承認</button>
          <button onclick="rejectRequest('${id}')" style="width:auto;padding:5px 12px;font-size:0.85em;display:inline-block;margin:0;flex:1;background:linear-gradient(135deg,#e53935,#ef5350);box-shadow:0 3px 8px rgba(229,57,53,0.3);">❌ 拒否</button>
        </div>
      </div>`).join("");
  } catch (e) {
    div.innerHTML = '<p style="color:#aaa;font-size:0.85em;margin:0;">読み込みエラー</p>';
  }
}

async function restore() {
  try {
    await signInAnonymously(auth);
    const saved = localStorage.getItem("shimupay_user");
    if (saved) {
      const snap = await get(ref(db, `accounts/${saved}`));
      if (snap.exists()) {
        currentUser = snap.val();
        currentUserName = saved;
        showScreen("bank");
        updateBankUI();
        loadPendingRequests();
        loadNotices();
        return;
      }
      localStorage.removeItem("shimupay_user");
    }
    showScreen("login");
  } catch (e) {
    showScreen("login");
  }
}

window.switchAuthTab = function switchAuthTab(tab) {
  const wrapper = document.getElementById("authFormsWrapper");
  const indicator = document.getElementById("tabIndicator");
  const loginBtn = document.getElementById("tabLoginBtn");
  const registerBtn = document.getElementById("tabRegisterBtn");
  document.getElementById("message").textContent = "";

  if (tab === "register") {
    wrapper.classList.add("show-register");
    indicator.classList.add("register");
    loginBtn.classList.remove("active");
    registerBtn.classList.add("active");
    return;
  }

  wrapper.classList.remove("show-register");
  indicator.classList.remove("register");
  loginBtn.classList.add("active");
  registerBtn.classList.remove("active");
};

window.createAccount = async function createAccount() {
  const name = document.getElementById("regName").value.trim();
  const pass = document.getElementById("regPass").value.trim();
  const passConfirm = document.getElementById("regPassConfirm").value.trim();
  const msg = document.getElementById("message");
  msg.style.color = "red";

  const ngWords = ["まんこ", "ちんこ", "おまんこ", "おちんこ", "おちんぽ", "シコシコ", "しこしこ", "おっぱい", "セックス", "せっくす", "おしっこ", "アナル", "あなる", "死ね", "しね", "殺す", "ころす", "クズ", "くず", "バカ", "ばか", "アHO", "あほ", "キモい", "きもい", "うんこ", "ウンコ", "うんち", "ウンチ", "ちんぽ", "チンポ", "さとうはるおみはばかであほでまぬけでむのうです"];
  if (!name) {
    msg.textContent = "名前を入力してください";
    return;
  }
  if (ngWords.some((w) => name.includes(w))) {
    msg.textContent = "その名前は使用できません";
    return;
  }
  if (!pass || pass.length !== 4 || !/^\d{4}$/.test(pass)) {
    msg.textContent = "パスワードは数字4桁にしてください";
    return;
  }
  if (["4545", "0721"].includes(pass)) {
    msg.textContent = "そのパスワードは使用できません";
    return;
  }
  if (pass !== passConfirm) {
    msg.textContent = "パスワードが一致しません";
    return;
  }

  showLoading(true);
  try {
    await signInAnonymously(auth);
    const snapshot = await get(ref(db, `accounts/${name}`));
    if (snapshot.exists()) {
      msg.textContent = "その名前はすでに使われています";
      return;
    }
    const allSnap = await get(ref(db, "accounts"));
    if (allSnap.exists() && Object.keys(allSnap.val()).length >= 50) {
      msg.textContent = "アカウント上限に達しました";
      return;
    }
    await set(ref(db, `accounts/${name}`), { pass, balance: 0, history: [], lastBonus: 0, createdAt: Date.now() });
    msg.style.color = "green";
    msg.textContent = "アカウント作成成功！ログインしてください";
    document.getElementById("regName").value = "";
    document.getElementById("regPass").value = "";
    document.getElementById("regPassConfirm").value = "";
    setTimeout(() => window.switchAuthTab("login"), 1200);
  } catch (e) {
    msg.textContent = "エラーが発生しました。もう一度お試しください";
  } finally {
    showLoading(false);
  }
};

window.login = async function login() {
  const name = document.getElementById("loginName").value.trim();
  const pass = document.getElementById("loginPass").value.trim();
  const msg = document.getElementById("message");
  msg.style.color = "red";

  if (!name || !pass) {
    msg.textContent = "名前とパスワードを入力してください";
    return;
  }

  showLoading(true);
  try {
    await signInAnonymously(auth);
    const snapshot = await get(ref(db, `accounts/${name}`));
    if (!snapshot.exists() || snapshot.val().pass !== pass) {
      msg.textContent = "名前またはパスワードが違います";
      return;
    }
    currentUser = snapshot.val();
    currentUserName = name;
    localStorage.setItem("shimupay_user", name);
    showScreen("bank");
    updateBankUI();
    loadPendingRequests();
    loadNotices();
    document.getElementById("loginName").value = "";
    document.getElementById("loginPass").value = "";
    msg.textContent = "";
  } catch (e) {
    msg.textContent = "接続エラーが発生しました";
  } finally {
    showLoading(false);
  }
};

window.sendMoney = async function sendMoney() {
  const toName = document.getElementById("sendTo").value.trim();
  const amount = Number(document.getElementById("sendAmount").value);
  const msg = document.getElementById("bankMessage");
  msg.style.color = "red";

  if (!toName) {
    msg.textContent = "送金先を入力してください";
    return;
  }
  if (toName === currentUserName) {
    msg.textContent = "自分自身には送金できません";
    return;
  }
  if (!amount || amount <= 0) {
    msg.textContent = "金額を入力してください";
    return;
  }
  if (amount > 10) {
    msg.textContent = "1回の送金は10しむまでです";
    return;
  }
  if (currentUser.balance < amount) {
    msg.textContent = "残高が足りません";
    return;
  }

  showLoading(true);
  try {
    const snap = await get(ref(db, `accounts/${toName}`));
    if (!snap.exists()) {
      msg.textContent = "送金先が見つかりません";
      return;
    }
    const rid = Date.now().toString();
    await set(ref(db, `requests/${toName}/${rid}`), { from: currentUserName, amount, timestamp: rid });
    msg.style.color = "green";
    msg.textContent = `${toName}に申請を送りました！承認を待ってください`;
    document.getElementById("sendTo").value = "";
    document.getElementById("sendAmount").value = "";
  } catch (e) {
    msg.textContent = "申請に失敗しました";
  } finally {
    showLoading(false);
  }
};

window.approveRequest = async function approveRequest(requestId, fromName, amount) {
  const msg = document.getElementById("bankMessage");
  try {
    const senderSnap = await get(ref(db, `accounts/${fromName}`));
    if (!senderSnap.exists()) {
      msg.style.color = "red";
      msg.textContent = "送金者が見つかりません";
      return;
    }
    const sender = senderSnap.val();
    if (sender.balance < amount) {
      msg.style.color = "red";
      msg.textContent = "送金者の残高が不足しています";
      return;
    }

    const updates = {};
    updates[`accounts/${fromName}/balance`] = sender.balance - amount;
    updates[`accounts/${fromName}/history`] = [...(sender.history || []), `${currentUserName} に ${amount} しむ送金（承認済み）`].slice(-10);
    updates[`accounts/${currentUserName}/balance`] = currentUser.balance + amount;
    updates[`accounts/${currentUserName}/history`] = [...(currentUser.history || []), `${fromName} から ${amount} しむ受取（承認）`].slice(-10);
    updates[`requests/${currentUserName}/${requestId}`] = null;

    await update(ref(db), updates);
    currentUser.balance += amount;
    currentUser.history = [...(currentUser.history || []), `${fromName} から ${amount} しむ受取（承認）`].slice(-10);
    updateBankUI();
    loadPendingRequests();
    msg.style.color = "green";
    msg.textContent = `${fromName}からの${amount}しむを承認しました！`;
  } catch (e) {
    msg.style.color = "red";
    msg.textContent = "承認に失敗しました";
  }
};

window.rejectRequest = async function rejectRequest(requestId) {
  const msg = document.getElementById("bankMessage");
  try {
    await set(ref(db, `requests/${currentUserName}/${requestId}`), null);
    loadPendingRequests();
    msg.style.color = "#888";
    msg.textContent = "申請を拒否しました";
  } catch (e) {
    msg.style.color = "red";
    msg.textContent = "拒否に失敗しました";
  }
};

window.getLocationBonus = async function getLocationBonus() {
  const msg = document.getElementById("bankMessage");
  const btn = document.querySelector(".bonus-btn");
  const now = Date.now();

  if (now - (currentUser.lastLocationBonus || 0) < 24 * 60 * 60 * 1000) {
    msg.style.color = "red";
    msg.textContent = "位置情報ボーナスは24時間に1回です";
    return;
  }
  if (!navigator.geolocation) {
    msg.textContent = "このブラウザは位置情報に対応していません";
    return;
  }

  btn.disabled = true;
  msg.style.color = "#888";
  msg.textContent = "位置情報を取得中...";

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    const targetLat = 35.5627;
    const targetLon = 139.7163;
    const limit = 500;
    const R = 6371000;
    const dLat = (lat - targetLat) * Math.PI / 180;
    const dLon = (lon - targetLon) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(targetLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    if (distance <= limit) {
      currentUser.balance += 2;
      currentUser.history = currentUser.history || [];
      currentUser.history.push("📍 ログインボーナス +2 しむ");
      currentUser.lastLocationBonus = now;
      await set(ref(db, `accounts/${currentUserName}`), currentUser);
      updateBankUI();
      msg.style.color = "green";
      msg.textContent = "📍 ボーナス +2 しむ獲得！";
    } else {
      msg.style.color = "red";
      msg.textContent = `対象の場所から離れています（約${Math.round(distance)}m）`;
    }
    btn.disabled = false;
  }, () => {
    msg.style.color = "red";
    msg.textContent = "位置情報の取得に失敗しました";
    btn.disabled = false;
  }, { timeout: 10000 });
};

window.logout = function logout() {
  currentUser = null;
  currentUserName = null;
  localStorage.removeItem("shimupay_user");
  showScreen("login");
};

window.toggleDrawer = function toggleDrawer() {
  document.getElementById("drawer").classList.toggle("open");
  document.getElementById("drawerOverlay").classList.toggle("open");
};

window.closeDrawer = function closeDrawer() {
  document.getElementById("drawer").classList.remove("open");
  document.getElementById("drawerOverlay").classList.remove("open");
};

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}

restore();
