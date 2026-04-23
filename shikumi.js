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

const GAS_URL = "https://script.google.com/macros/s/AKfycbys3jtI5KoMIxZb56RX2a8sxHRIwmRi0JNZRb8ixtIa9oMEhZdGf0--KzfmYN8i7ZgC/exec";
const NG_WORDS = ["sex", "fuck", "shit", "bitch", "kill", "die"];

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

let currentUser = null;
let currentUserName = null;

const TEXT = {
  userLabel: "ユーザー",
  noHistory: "履歴はありません",
  noNotices: "お知らせはありません",
  noticesLoadError: "お知らせの取得に失敗しました",
  noRequests: "申請はありません",
  requestsLoadError: "申請の読み込みに失敗しました",
  enterName: "名前を入力してください",
  invalidName: "その名前は使えません",
  invalidPin: "パスワードは4桁の数字にしてください",
  weakPin: "そのパスワードは使えません",
  pinMismatch: "パスワードが一致しません",
  nameTaken: "その名前はすでに使われています",
  accountLimit: "アカウント数が上限に達しています",
  accountCreated: "アカウントを作成しました。ログインしてください",
  accountCreateError: "アカウント作成に失敗しました",
  enterCredentials: "名前とパスワードを入力してください",
  loginFailed: "名前またはパスワードが違います",
  loginError: "ログインに失敗しました",
  enterRecipient: "送る相手を入力してください",
  cannotSendSelf: "自分自身には送れません",
  invalidAmount: "金額を正しく入力してください",
  maxAmount: "1回に送れるのは10しむまでです",
  insufficientBalance: "残高が足りません",
  recipientNotFound: "送金先が見つかりません",
  requestSendError: "申請の送信に失敗しました",
  senderNotFound: "送金元が見つかりません",
  senderLowBalance: "送金元の残高が不足しています",
  approveError: "承認に失敗しました",
  rejectDone: "申請を拒否しました",
  rejectError: "拒否に失敗しました",
  bonusCooldown: "登校ボーナスは24時間に1回までです",
  geoUnsupported: "この端末では位置情報が使えません",
  checkingLocation: "位置情報を確認中...",
  locationError: "位置情報の取得に失敗しました",
  locationBonusHistory: "登校ボーナス +2 しむ",
  locationBonusReceived: "ボーナスを受け取りました: +2 しむ"
};

function $(id) {
  return document.getElementById(id);
}

function setMessage(id, text = "", color = "red") {
  const el = $(id);
  if (!el) return;
  el.textContent = text;
  el.style.color = color;
}

function setLoading(show) {
  $("loading").style.display = show ? "block" : "none";
}

function showScreen(screen) {
  $("restoreLoading").style.display = "none";
  $("loginScreen").style.display = screen === "login" ? "block" : "none";
  $("bankScreen").style.display = screen === "bank" ? "block" : "none";

  if (screen === "login") {
    window.switchAuthTab("login");
  }
}

function updateBankUI() {
  if (!currentUser) return;

  $("userName").textContent = `${TEXT.userLabel}: ${currentUserName}`;
  $("balance").textContent = currentUser.balance || 0;

  const hist = currentUser.history || [];
  $("history").innerHTML = hist.length === 0
    ? `<p style="color:#aaa;font-size:0.85em;margin:0;">${TEXT.noHistory}</p>`
    : hist.slice().reverse().map((item) => `<div class="history-item">${item}</div>`).join("");
}

async function loadNotices() {
  const list = $("noticeList");

  try {
    const res = await fetch(GAS_URL);
    const notices = await res.json();

    if (!Array.isArray(notices) || notices.length === 0) {
      list.innerHTML = `<p class="notice-empty">${TEXT.noNotices}</p>`;
      return;
    }

    list.innerHTML = notices.map((notice) => {
      let dateStr = notice.date || "";
      const d = new Date(notice.date);

      if (!Number.isNaN(d.getTime())) {
        dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
      }

      return `
        <div class="notice-item">
          <div class="notice-date">${dateStr} ${notice.title || ""}</div>
          ${notice.body ? `<div class="notice-body">${notice.body}</div>` : ""}
        </div>
      `;
    }).join("");
  } catch (error) {
    list.innerHTML = `<p class="notice-empty">${TEXT.noticesLoadError}</p>`;
  }
}

function openBankScreen(userName, userData, persist = true) {
  currentUser = userData;
  currentUserName = userName;

  if (persist) {
    localStorage.setItem("shimupay_user", userName);
  }

  showScreen("bank");
  updateBankUI();
  loadPendingRequests();
  loadNotices();
}

function setDrawerOpen(isOpen) {
  $("drawer").classList.toggle("open", isOpen);
  $("drawerOverlay").classList.toggle("open", isOpen);
}

async function loadPendingRequests() {
  const list = $("pendingList");

  try {
    const snap = await get(ref(db, `requests/${currentUserName}`));
    if (!snap.exists()) {
      list.innerHTML = `<p style="color:#aaa;font-size:0.85em;margin:0;">${TEXT.noRequests}</p>`;
      return;
    }

    list.innerHTML = Object.entries(snap.val()).map(([id, req]) => `
      <div style="padding:8px 0;border-bottom:1px solid #f0f0f0;">
        <b>${req.from}</b> さんから <b>${req.amount} しむ</b> の申請
        <div style="margin-top:6px;display:flex;gap:6px;">
          <button onclick="approveRequest('${id}','${req.from}',${req.amount})" style="width:auto;padding:5px 12px;font-size:0.85em;display:inline-block;margin:0;flex:1;">承認</button>
          <button onclick="rejectRequest('${id}')" style="width:auto;padding:5px 12px;font-size:0.85em;display:inline-block;margin:0;flex:1;background:linear-gradient(135deg,#e53935,#ef5350);box-shadow:0 3px 8px rgba(229,57,53,0.3);">拒否</button>
        </div>
      </div>
    `).join("");
  } catch (error) {
    list.innerHTML = `<p style="color:#aaa;font-size:0.85em;margin:0;">${TEXT.requestsLoadError}</p>`;
  }
}

async function restore() {
  try {
    await signInAnonymously(auth);
    const saved = localStorage.getItem("shimupay_user");

    if (saved) {
      const snap = await get(ref(db, `accounts/${saved}`));
      if (snap.exists()) {
        openBankScreen(saved, snap.val(), false);
        return;
      }
      localStorage.removeItem("shimupay_user");
    }
  } catch (error) {
  }

  showScreen("login");
}

window.switchAuthTab = function switchAuthTab(tab) {
  const wrapper = $("authFormsWrapper");
  const indicator = $("tabIndicator");
  const loginBtn = $("tabLoginBtn");
  const registerBtn = $("tabRegisterBtn");

  setMessage("message", "");

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
  const name = $("regName").value.trim();
  const pass = $("regPass").value.trim();
  const passConfirm = $("regPassConfirm").value.trim();

  setMessage("message", "");

  if (!name) {
    setMessage("message", TEXT.enterName);
    return;
  }
  if (NG_WORDS.some((word) => name.toLowerCase().includes(word))) {
    setMessage("message", TEXT.invalidName);
    return;
  }
  if (!/^\d{4}$/.test(pass)) {
    setMessage("message", TEXT.invalidPin);
    return;
  }
  if (["4545", "0721"].includes(pass)) {
    setMessage("message", TEXT.weakPin);
    return;
  }
  if (pass !== passConfirm) {
    setMessage("message", TEXT.pinMismatch);
    return;
  }

  setLoading(true);
  try {
    await signInAnonymously(auth);

    const existing = await get(ref(db, `accounts/${name}`));
    if (existing.exists()) {
      setMessage("message", TEXT.nameTaken);
      return;
    }

    const allSnap = await get(ref(db, "accounts"));
    if (allSnap.exists() && Object.keys(allSnap.val()).length >= 50) {
      setMessage("message", TEXT.accountLimit);
      return;
    }

    await set(ref(db, `accounts/${name}`), {
      pass,
      balance: 0,
      history: [],
      lastBonus: 0,
      createdAt: Date.now()
    });

    setMessage("message", TEXT.accountCreated, "green");
    $("regName").value = "";
    $("regPass").value = "";
    $("regPassConfirm").value = "";
    setTimeout(() => window.switchAuthTab("login"), 1200);
  } catch (error) {
    setMessage("message", TEXT.accountCreateError);
  } finally {
    setLoading(false);
  }
};

window.login = async function login() {
  const name = $("loginName").value.trim();
  const pass = $("loginPass").value.trim();

  setMessage("message", "");

  if (!name || !pass) {
    setMessage("message", TEXT.enterCredentials);
    return;
  }

  setLoading(true);
  try {
    await signInAnonymously(auth);
    const snapshot = await get(ref(db, `accounts/${name}`));

    if (!snapshot.exists() || snapshot.val().pass !== pass) {
      setMessage("message", TEXT.loginFailed);
      return;
    }

    openBankScreen(name, snapshot.val(), true);
    $("loginName").value = "";
    $("loginPass").value = "";
  } catch (error) {
    setMessage("message", TEXT.loginError);
  } finally {
    setLoading(false);
  }
};

window.sendMoney = async function sendMoney() {
  const toName = $("sendTo").value.trim();
  const amount = Number($("sendAmount").value);

  setMessage("bankMessage", "");

  if (!toName) {
    setMessage("bankMessage", TEXT.enterRecipient);
    return;
  }
  if (toName === currentUserName) {
    setMessage("bankMessage", TEXT.cannotSendSelf);
    return;
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    setMessage("bankMessage", TEXT.invalidAmount);
    return;
  }
  if (amount > 10) {
    setMessage("bankMessage", TEXT.maxAmount);
    return;
  }
  if ((currentUser.balance || 0) < amount) {
    setMessage("bankMessage", TEXT.insufficientBalance);
    return;
  }

  setLoading(true);
  try {
    const snap = await get(ref(db, `accounts/${toName}`));
    if (!snap.exists()) {
      setMessage("bankMessage", TEXT.recipientNotFound);
      return;
    }

    const requestId = Date.now().toString();
    await set(ref(db, `requests/${toName}/${requestId}`), {
      from: currentUserName,
      amount,
      timestamp: requestId
    });

    $("sendTo").value = "";
    $("sendAmount").value = "";
    setMessage("bankMessage", `${toName} さんに申請を送りました`, "green");
  } catch (error) {
    setMessage("bankMessage", TEXT.requestSendError);
  } finally {
    setLoading(false);
  }
};

window.approveRequest = async function approveRequest(requestId, fromName, amount) {
  try {
    const senderSnap = await get(ref(db, `accounts/${fromName}`));
    if (!senderSnap.exists()) {
      setMessage("bankMessage", TEXT.senderNotFound);
      return;
    }

    const sender = senderSnap.val();
    if ((sender.balance || 0) < amount) {
      setMessage("bankMessage", TEXT.senderLowBalance);
      return;
    }

    const senderHistory = sender.history || [];
    const receiverHistory = currentUser.history || [];
    const updates = {};

    updates[`accounts/${fromName}/balance`] = sender.balance - amount;
    updates[`accounts/${fromName}/history`] = [...senderHistory, `${currentUserName} さんへ ${amount} しむ送金`].slice(-10);
    updates[`accounts/${currentUserName}/balance`] = (currentUser.balance || 0) + amount;
    updates[`accounts/${currentUserName}/history`] = [...receiverHistory, `${fromName} さんから ${amount} しむ受け取り`].slice(-10);
    updates[`requests/${currentUserName}/${requestId}`] = null;

    await update(ref(db), updates);

    currentUser.balance = (currentUser.balance || 0) + amount;
    currentUser.history = [...receiverHistory, `${fromName} さんから ${amount} しむ受け取り`].slice(-10);
    updateBankUI();
    loadPendingRequests();
    setMessage("bankMessage", `${fromName} さんから ${amount} しむ受け取りました`, "green");
  } catch (error) {
    setMessage("bankMessage", TEXT.approveError);
  }
};

window.rejectRequest = async function rejectRequest(requestId) {
  try {
    await set(ref(db, `requests/${currentUserName}/${requestId}`), null);
    loadPendingRequests();
    setMessage("bankMessage", TEXT.rejectDone, "#888");
  } catch (error) {
    setMessage("bankMessage", TEXT.rejectError);
  }
};

window.getLocationBonus = async function getLocationBonus() {
  const btn = document.querySelector(".bonus-btn");
  const now = Date.now();

  if (now - (currentUser.lastLocationBonus || 0) < 24 * 60 * 60 * 1000) {
    setMessage("bankMessage", TEXT.bonusCooldown);
    return;
  }
  if (!navigator.geolocation) {
    setMessage("bankMessage", TEXT.geoUnsupported);
    return;
  }

  btn.disabled = true;
  setMessage("bankMessage", TEXT.checkingLocation, "#888");

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
      currentUser.balance = (currentUser.balance || 0) + 2;
      currentUser.history = currentUser.history || [];
      currentUser.history.push(TEXT.locationBonusHistory);
      currentUser.lastLocationBonus = now;

      await set(ref(db, `accounts/${currentUserName}`), currentUser);
      updateBankUI();
      setMessage("bankMessage", TEXT.locationBonusReceived, "green");
    } else {
      setMessage("bankMessage", `対象地点から離れています（約${Math.round(distance)}m）`);
    }

    btn.disabled = false;
  }, () => {
    setMessage("bankMessage", TEXT.locationError);
    btn.disabled = false;
  }, { timeout: 10000 });
};

window.logout = function logout() {
  currentUser = null;
  currentUserName = null;
  localStorage.removeItem("shimupay_user");
  setMessage("message", "");
  setDrawerOpen(false);
  showScreen("login");
};

window.toggleDrawer = function toggleDrawer() {
  setDrawerOpen(!$("drawer").classList.contains("open"));
};

window.closeDrawer = function closeDrawer() {
  setDrawerOpen(false);
};

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}

restore();
