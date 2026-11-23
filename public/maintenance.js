import { getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, onSnapshot, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const ADMIN_UID = "7mQtL5NIu0RtN5UOWy8TLiWL5zP2";
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const settingsRef = doc(db, "settings", "maintenance");

const overlay = document.createElement("main");
overlay.id = "maintenance-screen";
overlay.hidden = true;
overlay.style.cssText = "position:fixed;inset:0;z-index:99999;display:none;place-items:center;padding:24px;background:radial-gradient(circle at top,#214763,#071522 68%);color:#fff;font-family:Arial,sans-serif;text-align:center";
overlay.innerHTML = `
  <section style="width:min(520px,100%);padding:36px 25px;border:1px solid #d4af37;border-radius:22px;background:#102b43;box-shadow:0 18px 60px #0008">
    <div style="font-size:54px;margin-bottom:12px">🛠️</div>
    <div style="color:#e8bd58;font-size:11px;font-weight:bold;letter-spacing:3px">VIRTUAL SMKN 2 INDRAMAYU</div>
    <h1 style="font-size:clamp(27px,6vw,40px);margin:14px 0">SEDANG MAINTENANCE</h1>
    <p id="maintenance-message" style="color:#d5e2eb;line-height:1.7">Website sedang dalam proses pembaruan.</p>
    <div id="maintenance-end" style="margin-top:18px;color:#e8bd58;font-size:13px"></div>
    <p style="margin-top:25px;color:#9fb5c5;font-size:12px">Terima kasih atas kesabaranmu.</p>
  </section>`;
document.body.append(overlay);

const adminPanel = document.createElement("aside");
adminPanel.id = "maintenance-admin";
adminPanel.style.cssText = "position:fixed;right:14px;bottom:14px;z-index:100000;font:13px Arial,sans-serif;color:#fff";
adminPanel.innerHTML = `
  <button id="maintenance-admin-toggle" style="padding:11px 15px;border:1px solid #d4af37;border-radius:10px;background:#102b43;color:#f2cf72;font-weight:bold;cursor:pointer">⚙ MAINTENANCE ADMIN</button>
  <section id="maintenance-admin-box" style="display:none;width:min(320px,calc(100vw - 28px));margin-top:8px;padding:15px;border:1px solid #d4af37;border-radius:13px;background:#102b43;box-shadow:0 8px 30px #0008">
    <b style="color:#f2cf72">PENGATURAN MAINTENANCE</b>
    <label style="display:block;margin-top:12px">Pesan untuk pengunjung
      <textarea id="maintenance-admin-message" maxlength="240" rows="3" style="box-sizing:border-box;width:100%;margin-top:6px;padding:9px;border-radius:7px"></textarea>
    </label>
    <label style="display:block;margin-top:10px">Perkiraan selesai
      <input id="maintenance-admin-end" maxlength="80" placeholder="Contoh: 20.00 WIB" style="box-sizing:border-box;width:100%;margin-top:6px;padding:9px;border-radius:7px">
    </label>
    <button id="maintenance-enable" style="width:100%;margin-top:12px;padding:11px;border:0;border-radius:8px;background:#b45309;color:white;font-weight:bold;cursor:pointer">AKTIFKAN MAINTENANCE</button>
    <button id="maintenance-disable" style="width:100%;margin-top:7px;padding:11px;border:0;border-radius:8px;background:#15803d;color:white;font-weight:bold;cursor:pointer">NONAKTIFKAN</button>
    <p id="maintenance-admin-status" style="margin:9px 0 0;color:#cbd5e1;font-size:11px"></p>
  </section>`;
document.body.append(adminPanel);
const adminBox = adminPanel.querySelector("#maintenance-admin-box");
adminPanel.querySelector("#maintenance-admin-toggle").addEventListener("click", () => {
  adminBox.style.display = adminBox.style.display === "none" ? "block" : "none";
});

let isAdmin = false;
function renderMaintenance(data = {}) {
  const enabled = data.enabled === true;
  const show = enabled && !isAdmin;
  overlay.hidden = !show;
  overlay.style.display = show ? "grid" : "none";
  document.body.style.overflow = show ? "hidden" : "";
  document.querySelector("#maintenance-message").textContent = data.message || "Website sedang dalam proses pembaruan server dan peningkatan fitur.";
  document.querySelector("#maintenance-end").textContent = data.expectedEnd ? "Perkiraan selesai: " + data.expectedEnd : "";
  if (isAdmin) {
    adminPanel.style.display = "block";
    adminPanel.querySelector("#maintenance-admin-status").textContent = enabled ? "Status: AKTIF" : "Status: NONAKTIF";
    adminPanel.querySelector("#maintenance-admin-message").value = data.message || "";
    adminPanel.querySelector("#maintenance-admin-end").value = data.expectedEnd || "";
  } else {
    adminPanel.style.display = "none";
  }
}

async function saveMaintenance(enabled) {
  const status = adminPanel.querySelector("#maintenance-admin-status");
  status.textContent = "Menyimpan...";
  try {
    await setDoc(settingsRef, {
      enabled,
      message: adminPanel.querySelector("#maintenance-admin-message").value.trim() || "Website sedang dalam proses pembaruan server dan peningkatan fitur.",
      expectedEnd: adminPanel.querySelector("#maintenance-admin-end").value.trim(),
      updatedAt: serverTimestamp()
    });
    status.textContent = enabled ? "Maintenance berhasil diaktifkan." : "Maintenance berhasil dinonaktifkan.";
  } catch (error) {
    console.error("Gagal mengubah maintenance:", error);
    status.textContent = "Gagal menyimpan. Periksa Firestore Rules dan UID admin.";
  }
}
adminPanel.querySelector("#maintenance-enable").addEventListener("click", () => saveMaintenance(true));
adminPanel.querySelector("#maintenance-disable").addEventListener("click", () => saveMaintenance(false));

async function startMaintenanceControl() {
  try {
    if (!auth.currentUser) await signInAnonymously(auth);
    isAdmin = auth.currentUser?.uid === ADMIN_UID;
    onSnapshot(settingsRef, snap => renderMaintenance(snap.exists() ? snap.data() : {}), error => {
      console.error("Gagal membaca status maintenance:", error);
    });
  } catch (error) {
    console.error("Gagal memulai kontrol maintenance:", error);
  }
}
startMaintenanceControl();
