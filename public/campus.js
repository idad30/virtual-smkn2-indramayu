
import * as THREE from "https://esm.sh/three@0.160.0";
import { OrbitControls } from "https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

// ==========================================
// 1. FIREBASE DAN DATA SISWA
// ==========================================

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

let playerData = null;

function getCurrentUser() {
  return new Promise((resolve, reject) => {
    let unsubscribe = () => {};

    unsubscribe = onAuthStateChanged(
      auth,
      user => {
        unsubscribe();
        resolve(user);
      },
      error => {
        unsubscribe();
        reject(error);
      }
    );
  });
}

async function checkStudentAccess() {
  let user = await getCurrentUser();

  if (!user) {
    const result = await signInAnonymously(auth);
    user = result.user;
  }

  const playerRef = doc(db, "players", user.uid);
  const playerSnap = await getDoc(playerRef);

  if (!playerSnap.exists()) {
    throw new Error("Data pendaftaran tidak ditemukan.");
  }

  playerData = playerSnap.data();

  if (playerData.status !== "approved") {
    throw new Error("Akun belum disetujui admin.");
  }

  return playerData;
}

// ==========================================
// 2. IDENTITAS SISWA - KANAN ATAS
// ==========================================

function createStudentCard(data) {
  const card = document.createElement("div");

  card.style.cssText = `
    position: fixed;
    top: 85px;
    right: 18px;
    left: auto;
    z-index: 1000;
    width: 220px;
    max-width: calc(100vw - 36px);
    box-sizing: border-box;
    padding: 13px;
    border: 1px solid #d4af37;
    border-radius: 13px;
    background: rgba(12, 35, 55, 0.94);
    color: #ffffff;
    font-family: Arial, sans-serif;
    box-shadow: 0 5px 22px rgba(0,0,0,.3);
    backdrop-filter: blur(8px);
  `;

  const heading = document.createElement("div");
  heading.textContent = "IDENTITAS SISWA";
  heading.style.cssText = `
    color: #e4b84f;
    font-size: 12px;
    font-weight: bold;
    letter-spacing: 1px;
    margin-bottom: 9px;
  `;

  const name = document.createElement("div");
  name.textContent = data.fullName || "Nama siswa";
  name.style.cssText = `
    font-size: 15px;
    font-weight: bold;
    margin-bottom: 9px;
    overflow-wrap: anywhere;
  `;

  const details = document.createElement("div");
  details.style.cssText = `
    font-size: 12px;
    line-height: 1.8;
    color: #e4edf5;
  `;

  const rows = [
    ["Jurusan", data.major],
    ["Tingkat", data.grade],
    ["Kelas", data.classNumber ?? data.className]
  ];

  rows.forEach(([label, value]) => {
    const row = document.createElement("div");
    const strong = document.createElement("strong");

    strong.textContent = label + ": ";
    row.append(strong, document.createTextNode(value ?? "-"));
    details.appendChild(row);
  });

  card.append(heading, name, details);
  document.body.appendChild(card);
}

// ==========================================
// 3. PENGATURAN THREE.JS
// ==========================================

const gameContainer = document.querySelector("#game");

if (!gameContainer) {
  throw new Error("Elemen #game tidak ditemukan di campus.html.");
}

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x9bc8dc);
scene.fog = new THREE.Fog(0x9bc8dc, 75, 150);

const camera = new THREE.PerspectiveCamera(
  52,
  window.innerWidth / window.innerHeight,
  0.1,
  250
);

camera.position.set(38, 42, 55);

const renderer = new THREE.WebGLRenderer({
  antialias: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

gameContainer.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.48;

// ==========================================
// 4. PENCAHAYAAN
// ==========================================

scene.add(
  new THREE.HemisphereLight(
    0xeaf7ff,
    0x61764d,
    2
  )
);

const sun = new THREE.DirectionalLight(0xfff0d1, 2);

sun.position.set(-30, 60, 30);
sun.castShadow = true;

scene.add(sun);

// ==========================================
// 5. MATERIAL DAN PEMBUAT GEDUNG
// ==========================================

function material(color) {
  return new THREE.MeshStandardMaterial({ color });
}

function block(x, y, z, width, height, depth, color) {
  const object = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    material(color)
  );

  object.position.set(x, y + height / 2, z);
  object.castShadow = true;
  object.receiveShadow = true;

  scene.add(object);
  return object;
}

function building(name, x, z, width, depth, color = 0xf1eee5) {
  block(x, 0, z, width, 0.5, depth, 0xb9b9ad);
  block(x, 0.5, z, width, 3, depth, color);
  block(x, 3.5, z, width, 0.35, depth, 0x985444);

  // Jendela gedung
  for (
    let xx = x - width / 2 + 1;
    xx < x + width / 2;
    xx += 2.5
  ) {
    block(
      xx, 1.4, z - depth / 2 - 0.08,
      1, 1, 0.12, 0x8cc5d5
    );
  }

  // Papan nama gedung
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 100;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#102b43";
  ctx.font = "bold 36px Arial";
  ctx.textAlign = "center";
  ctx.fillText(name, 256, 65);

  const texture = new THREE.CanvasTexture(canvas);

  const sign = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture })
  );

  sign.position.set(x, 5, z);
  sign.scale.set(10, 2, 1);

  scene.add(sign);
}

// ==========================================
// 6. AREA KAMPUS
// ==========================================

block(0, -0.5, 0, 120, 1, 100, 0x76a96b);
block(0, 0.02, 35, 120, 0.08, 10, 0x555e65);
block(0, 0.03, 12, 7, 0.1, 70, 0xb9b9ad);

// ==========================================
// 7. GEDUNG SEKOLAH
// ==========================================

building("GEDUNG UTAMA", -17, -5, 24, 12);
building("KANTIN", 18, -5, 13, 9, 0xe8d9b7);
building("BARAK ESKUL", -30, -24, 13, 9);
building("UKS", -12, -25, 9, 7);

// ==========================================
// 8. LABORATORIUM 8 JURUSAN
// ==========================================

const laboratories = [
  ["LAB NKPI", -39, 0],
  ["LAB APHPI", -39, 15],
  ["LAB TKJ", -21, 17],
  ["LAB RPL", -3, 17],
  ["LAB TAB", 15, -25],
  ["LAB KULINER", 33, -18],
  ["LAB APAPL", 36, 1],
  ["LAB TP", 17, 17]
];

laboratories.forEach(([name, x, z]) => {
  building(name, x, z, 13, 8, 0xe6e9e5);
});

// ==========================================
// 9. GERBANG SEKOLAH
// ==========================================

block(0, 0, 31, 19, 2.4, 1.2, 0x173b5a);
block(0, 2.1, 31, 15, 0.25, 1.35, 0xe4b84f);

// ==========================================
// 10. KARAKTER PEMAIN
// ==========================================

const player = new THREE.Group();

scene.add(player);

const body = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.42, 0.9, 4, 8),
  material(0x1c4c78)
);

body.position.y = 1.1;
player.add(body);

const head = new THREE.Mesh(
  new THREE.SphereGeometry(0.32, 12, 10),
  material(0xd9a47b)
);

head.position.y = 1.95;
player.add(head);

player.position.set(0, 0, 25);

// ==========================================
// 11. KONTROL PEMAIN
// ==========================================

const keys = {};

window.addEventListener("keydown", event => {
  keys[event.key.toLowerCase()] = true;
});

window.addEventListener("keyup", event => {
  keys[event.key.toLowerCase()] = false;
});

// ==========================================
// 12. ANIMASI DAN PERGERAKAN
// ==========================================

let lastTime = 0;

function animate(time) {
  requestAnimationFrame(animate);

  const delta = Math.min((time - lastTime) / 1000, 0.04);
  lastTime = time;

  let moveX = 0;
  let moveZ = 0;

  if (keys.w || keys.arrowup) moveZ--;
  if (keys.s || keys.arrowdown) moveZ++;
  if (keys.a || keys.arrowleft) moveX--;
  if (keys.d || keys.arrowright) moveX++;

  const length = Math.hypot(moveX, moveZ) || 1;

  player.position.x += (moveX / length) * 9 * delta;
  player.position.z += (moveZ / length) * 9 * delta;

  player.position.x = THREE.MathUtils.clamp(
    player.position.x, -48, 48
  );

  player.position.z = THREE.MathUtils.clamp(
    player.position.z, -40, 42
  );

  if (moveX !== 0 || moveZ !== 0) {
    player.rotation.y = Math.atan2(moveX, moveZ);
  }

  controls.target.lerp(player.position, 0.025);

  controls.update();
  renderer.render(scene, camera);
}

// ==========================================
// 13. RESPONSIVE LAYAR
// ==========================================

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );
});

// ==========================================
// 14. MULAI KAMPUS
// ==========================================

async function startCampus() {
  try {
    const student = await checkStudentAccess();

    createStudentCard(student);

    requestAnimationFrame(animate);

  } catch (error) {
    console.error("Campus error:", error);

    alert(error.message || "Tidak dapat membuka kampus.");

    window.location.href = "index.html";
  }
}

startCampus();
