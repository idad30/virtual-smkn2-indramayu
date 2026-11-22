import { getDatabase, ref, onValue, onDisconnect, set, remove, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

export function initCampusFeatures({ app, uid, profile, player, scene, THREE, places }) {
  let rtdb = null;
  try { rtdb = getDatabase(app, firebaseConfig.databaseURL); }
  catch (error) { console.warn("Realtime Database belum dikonfigurasi:", error); }
  const presenceRoot = ref(rtdb, "campusPlayers");
  const myPresence = ref(rtdb, "campusPlayers/" + uid);
  const otherAvatars = new Map();
  const completed = new Set();

  const style = document.createElement("style");
  style.textContent = `
    #campus-menu{position:fixed;right:14px;top:150px;z-index:20;display:flex;flex-direction:column;gap:7px}
    #campus-menu button{border:1px solid #d4af37;border-radius:10px;padding:10px 13px;background:#102b43ed;color:#fff;font-weight:700;cursor:pointer;box-shadow:0 4px 14px #0004}
    #campus-menu button.active{background:#d4af37;color:#102b43}
    #campus-window{display:none;position:fixed;right:14px;top:300px;z-index:20;width:min(330px,calc(100vw - 28px));max-height:42vh;overflow:auto;padding:16px;border:1px solid #d4af37;border-radius:14px;background:#0b2030f2;color:#fff;font:13px/1.55 Arial,sans-serif;box-shadow:0 8px 28px #0006}
    #campus-window h3{margin:0 0 10px;color:#f0c96b;font-size:16px}
    #campus-window .mission{padding:9px;margin:8px 0;border:1px solid #ffffff24;border-radius:9px;background:#ffffff09}
    #campus-window .done{color:#8ce0a8}
    #campus-window .muted{color:#b7c8d4}
    @media(max-width:700px){#campus-menu{top:auto;bottom:165px;right:10px}#campus-menu button{padding:9px;font-size:11px}#campus-window{top:auto;bottom:305px;right:10px;max-height:35vh}}
  `;
  document.head.appendChild(style);

  const menu = document.createElement("nav");
  menu.id = "campus-menu";
  const windowPanel = document.createElement("section");
  windowPanel.id = "campus-window";
  document.body.append(menu, windowPanel);

  let activeTab = "";
  const tabs = [
    ["info", "INFO"],
    ["missions", "MISI"],
    ["multiplayer", "MULTIPLAYER"]
  ];
  const buttons = new Map();
  function openTab(tab) {
    activeTab = activeTab === tab ? "" : tab;
    windowPanel.style.display = activeTab ? "block" : "none";
    buttons.forEach((button, key) => button.classList.toggle("active", key === activeTab));
    renderPanel();
  }
  tabs.forEach(([key, label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => openTab(key));
    buttons.set(key, button);
    menu.appendChild(button);
  });

  const missions = [
    { id: "main", place: "Gedung Utama", title: "Kunjungi Gedung Utama", detail: "Temukan gedung utama sekolah." },
    { id: "canteen", place: "Kantin", title: "Kunjungi Kantin", detail: "Datangi area kantin sekolah." },
    { id: "tkj", place: "Lab TKJ", title: "Kunjungi Lab TKJ", detail: "Temukan laboratorium TKJ." }
  ];

  function renderPanel() {
    if (!activeTab) return;
    windowPanel.replaceChildren();
    const heading = document.createElement("h3");
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "Tutup";
    close.style.cssText = "float:right;padding:5px 9px;border:0;border-radius:7px;background:#d4af37;color:#102b43;font-weight:bold";
    close.addEventListener("click", () => openTab(activeTab));
    windowPanel.append(close, heading);

    if (activeTab === "info") {
      heading.textContent = "Informasi Kampus";
      const p = document.createElement("p");
      p.textContent = "Jelajahi area Virtual SMKN 2 Indramayu. Dekati gedung lalu tekan E untuk membaca keterangan lokasi.";
      const list = document.createElement("p");
      list.className = "muted";
      list.textContent = "Area: Gedung Utama, Kantin, Barak Eskul, UKS, serta laboratorium NKPI, APHPI, TKJ, RPL, TAB, Kuliner, APAPL, dan TP.";
      windowPanel.append(p, list);
    } else if (activeTab === "missions") {
      heading.textContent = "Misi Kampus";
      const summary = document.createElement("p");
      summary.className = "muted";
      summary.textContent = completed.size + " dari " + missions.length + " misi selesai · progres sesi ini";
      windowPanel.appendChild(summary);
      missions.forEach(mission => {
        const item = document.createElement("div");
        item.className = "mission";
        const title = document.createElement("strong");
        title.className = completed.has(mission.id) ? "done" : "";
        title.textContent = (completed.has(mission.id) ? "✓ " : "○ ") + mission.title;
        const detail = document.createElement("div");
        detail.className = "muted";
        detail.textContent = completed.has(mission.id) ? "Selesai!" : mission.detail;
        item.append(title, detail);
        windowPanel.appendChild(item);
      });
    } else {
      heading.textContent = "Pemain Online";
      const hint = document.createElement("p");
      hint.className = "muted";
      hint.textContent = rtdb ? "Pemain lain yang sedang berada di kampus akan muncul di sini dan di area 3D." : "Multiplayer belum aktif. Admin perlu membuat Realtime Database dan mengisi databaseURL di firebase-config.js.";
      windowPanel.appendChild(hint);
      const list = document.createElement("div");
      const entries = [...otherAvatars.values()];
      if (!entries.length) list.textContent = "Belum ada pemain lain yang online.";
      entries.forEach(entry => {
        const row = document.createElement("div");
        row.className = "mission";
        row.textContent = entry.name + " · " + (entry.major || "Siswa");
        list.appendChild(row);
      });
      windowPanel.appendChild(list);
    }
  }

  function updateMissionProgress() {
    const x = player.position.x, z = player.position.z;
    for (const mission of missions) {
      if (completed.has(mission.id)) continue;
      const place = places.find(item => item.name === mission.place);
      if (!place) continue;
      const edgeX = Math.max(0, Math.abs(x - place.x) - place.w / 2);
      const edgeZ = Math.max(0, Math.abs(z - place.z) - place.d / 2);
      if (Math.hypot(edgeX, edgeZ) < 5.2) {
        completed.add(mission.id);
        if (activeTab === "missions") renderPanel();
        showToast("MISI SELESAI", mission.title);
      }
    }
  }

  function showToast(title, message) {
    let toast = document.querySelector("#campus-feature-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "campus-feature-toast";
      toast.style.cssText = "position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:25;padding:12px 18px;border:1px solid #d4af37;border-radius:12px;background:#102b43f2;color:white;text-align:center;font:13px/1.5 Arial;box-shadow:0 5px 20px #0005";
      document.body.appendChild(toast);
    }
    toast.replaceChildren();
    const b = document.createElement("b"); b.textContent = title; b.style.color = "#f0c96b";
    const d = document.createElement("div"); d.textContent = message;
    toast.append(b, d); toast.style.display = "block";
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.display = "none"; }, 2800);
  }

  function makeRemoteAvatar(name) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(.8,.95,.42), new THREE.MeshStandardMaterial({color:0x2785ad}));
    body.position.y = 1.35; group.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(.58,.58,.58), new THREE.MeshStandardMaterial({color:0xd9a47b}));
    head.position.y = 2.12; group.add(head);
    const canvas = document.createElement("canvas"); canvas.width=512; canvas.height=96;
    const ctx = canvas.getContext("2d"); ctx.fillStyle="#102b43"; ctx.fillRect(0,0,512,96);
    ctx.fillStyle="#fff"; ctx.font="bold 34px Arial"; ctx.textAlign="center"; ctx.fillText(String(name || "Pemain").slice(0,22),256,62);
    const texture = new THREE.CanvasTexture(canvas);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true}));
    label.position.y=3.1; label.scale.set(4.5,.85,1); group.add(label);
    scene.add(group);
    return group;
  }

  if (!rtdb) {
    return { update: updateMissionProgress, destroy() {} };
  }

  onValue(presenceRoot, snapshot => {
    const live = snapshot.val() || {};
    for (const [otherUid, value] of Object.entries(live)) {
      if (otherUid === uid || !value || value.online !== true) continue;
      let entry = otherAvatars.get(otherUid);
      if (!entry) {
        entry = { name: value.name || "Pemain", major: value.major || "", avatar: makeRemoteAvatar(value.name) };
        otherAvatars.set(otherUid, entry);
      }
      entry.name = value.name || "Pemain";
      entry.major = value.major || "";
      if (value.x != null && value.z != null) entry.avatar.position.set(value.x,0,value.z);
    }
    for (const [otherUid, entry] of otherAvatars) {
      if (!live[otherUid] || live[otherUid].online !== true) {
        scene.remove(entry.avatar);
        entry.avatar.traverse(object => { if (object.geometry) object.geometry.dispose(); if (object.material) object.material.dispose(); });
        otherAvatars.delete(otherUid);
      }
    }
    if (activeTab === "multiplayer") renderPanel();
  }, error => {
    console.error("Multiplayer gagal dimuat:", error);
    showToast("MULTIPLAYER BELUM SIAP", "Periksa URL dan Rules Realtime Database.");
  });

  const connectedRef = ref(rtdb, ".info/connected");
  onValue(connectedRef, async snap => {
    if (snap.val() !== true) return;
    try {
      await onDisconnect(myPresence).remove();
      await set(myPresence, {
        name: profile.fullName || "Pemain",
        major: profile.major || "",
        x: Number(player.position.x.toFixed(2)),
        z: Number(player.position.z.toFixed(2)),
        online: true,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Presence tidak dapat diaktifkan:", error);
    }
  });

  let lastSent = 0;
  const sendPosition = () => {
    const now = performance.now();
    if (now - lastSent < 500) return;
    lastSent = now;
    set(myPresence, {
      name: profile.fullName || "Pemain",
      major: profile.major || "",
      x: Number(player.position.x.toFixed(2)),
      z: Number(player.position.z.toFixed(2)),
      online: true,
      updatedAt: serverTimestamp()
    }).catch(error => console.error("Gagal mengirim posisi:", error));
  };

  return {
    update() {
      updateMissionProgress();
      sendPosition();
    },
    destroy() {
      remove(myPresence).catch(() => {});
      otherAvatars.forEach(entry => scene.remove(entry.avatar));
    }
  };
}
