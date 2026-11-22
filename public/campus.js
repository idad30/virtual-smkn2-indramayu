import * as THREE from "https://esm.sh/three@0.160.0";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Akses kampus tetap memakai akun anonim Firebase dan status approved.
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function currentUser() {
  return new Promise((resolve, reject) => {
    const stop = onAuthStateChanged(auth, user => { stop(); resolve(user); }, error => { stop(); reject(error); });
  });
}

async function checkStudentAccess() {
  let user = await currentUser();
  if (!user) user = (await signInAnonymously(auth)).user;
  const snap = await getDoc(doc(db, "players", user.uid));
  if (!snap.exists()) throw new Error("Data pendaftaran tidak ditemukan. Silakan daftar terlebih dahulu.");
  const data = snap.data();
  if (data.status !== "approved") throw new Error("Akun belum disetujui admin.");
  return data;
}

function studentCard(data) {
  const el = document.createElement("aside");
  el.className = "student-card";
  const title = document.createElement("b");
  title.textContent = "IDENTITAS TARUNA/TARUNI";
  const name = document.createElement("strong");
  name.textContent = data.fullName || "Siswa";
  const info = document.createElement("span");
  info.textContent = `${data.schoolStatus || (data.gender === "P" ? "Taruni" : "Taruna")} · ${data.position || "Anggota"} · ${data.major || "-"} · ${data.grade || "-"} · Kelas ${data.classNumber ?? data.className ?? "-"}`;
  el.append(title, name, info);
  document.body.appendChild(el);
}

const root = document.querySelector("#game");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bc8dc);
scene.fog = new THREE.Fog(0x9bc8dc, 80, 165);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 260);
camera.position.set(0, 13, 19);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
root.appendChild(renderer.domElement);

// Kamera third-person: selalu mengikuti posisi dan arah hadap karakter.
let cameraYaw = 0;
let cameraPitch = 0.22;
let cameraDistance = 10;
const cameraTarget = new THREE.Vector3();
const cameraOffset = new THREE.Vector3();
const CAMERA_SENSITIVITY = 0.0025;

// Double-click pada area permainan untuk mengunci pointer dan menggerakkan kamera
// dengan mouse. Tekan ESC untuk melepas pointer kembali.
renderer.domElement.addEventListener("dblclick", async () => {
  if (document.pointerLockElement !== renderer.domElement) {
    try { await renderer.domElement.requestPointerLock(); }
    catch (error) { console.warn("Pointer lock tidak tersedia:", error); }
  }
});
document.addEventListener("mousemove", event => {
  if (document.pointerLockElement !== renderer.domElement) return;
  cameraYaw -= event.movementX * CAMERA_SENSITIVITY;
  cameraPitch = THREE.MathUtils.clamp(
    cameraPitch + event.movementY * CAMERA_SENSITIVITY,
    -0.18,
    0.78
  );
});
renderer.domElement.addEventListener("wheel", event => {
  cameraDistance = THREE.MathUtils.clamp(cameraDistance + event.deltaY * 0.01, 6, 19);
}, { passive: true });

scene.add(new THREE.HemisphereLight(0xeaf7ff, 0x61764d, 2.1));
const sun = new THREE.DirectionalLight(0xfff0d1, 2.2);
sun.position.set(-35, 65, 35);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

const mat = color => new THREE.MeshStandardMaterial({ color, roughness: 0.82 });
function block(x,y,z,w,h,d,color) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat(color));
  mesh.position.set(x,y+h/2,z); mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
  return mesh;
}
function signLabel(text,x,z) {
  const canvas=document.createElement("canvas"); canvas.width=512; canvas.height=100;
  const c=canvas.getContext("2d"); c.fillStyle="#102b43"; c.fillRect(0,0,512,100);
  c.fillStyle="#f5d27a"; c.font="bold 36px Arial"; c.textAlign="center"; c.fillText(text,256,65);
  const texture=new THREE.CanvasTexture(canvas); texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture}));
  sprite.position.set(x,4.8,z); sprite.scale.set(9,1.8,1); scene.add(sprite);
}
function building(name,x,z,w,d,color=0xf1eee5) {
  block(x,0,z,w,.5,d,0xb9b9ad); block(x,.5,z,w,3,d,color); block(x,3.5,z,w,.35,d,0x985444);
  for(let xx=x-w/2+1;xx<x+w/2;xx+=2.5) block(xx,1.35,z-d/2-.08,1,1,.12,0x8cc5d5);
  block(x,1.0,z+d/2+.08,1.5,2,.15,0x8b6548);
  signLabel(name,x,z);
}

// Lingkungan sekolah demo (posisi bangunan masih ilustratif).
block(0,-.5,0,120,1,100,0x76a96b);
block(0,.02,35,120,.08,10,0x555e65);
block(0,.03,12,7,.1,70,0xb9b9ad);
building("GEDUNG UTAMA",-17,-5,24,12);
building("KANTIN",18,-5,13,9,0xe8d9b7);
building("BARAK ESKUL",-30,-24,13,9);
building("UKS",-12,-25,9,7);
[
 ["LAB NKPI",-39,0],["LAB APHPI",-39,15],["LAB TKJ",-21,17],["LAB RPL",-3,17],
 ["LAB TAB",15,-25],["LAB KULINER",33,-18],["LAB APAPL",36,1],["LAB TP",17,17]
].forEach(([n,x,z])=>building(n,x,z,13,8,0xe6e9e5));
block(0,0,31,19,2.4,1.2,0x173b5a);
block(0,2.1,31,15,.25,1.35,0xe4b84f);

// Pohon sederhana agar area terasa hidup.
function tree(x,z) {
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.18,.25,1.5,7),mat(0x765033));
  trunk.position.set(x,.75,z); trunk.castShadow=true; scene.add(trunk);
  const crown=new THREE.Mesh(new THREE.SphereGeometry(1.15,8,7),mat(0x397b45));
  crown.position.set(x,2,z); crown.castShadow=true; scene.add(crown);
}
[[-48,-35],[-43,28],[47,-32],[47,25],[-5,-38],[8,-38],[48,8]].forEach(p=>tree(...p));

// ==========================================
// DETAIL LINGKUNGAN SEKOLAH - TAHAP 2
// ==========================================

// Jalur pedestrian dan marka penyeberangan di dekat gerbang.
block(0,0.045,28,13,.06,2.2,0xd8d4c8);
for(let i=0;i<7;i++) block(-5.4+i*1.8,.09,28,1,.025,.16,0xf8f3df);

// Papan nama besar di depan sekolah.
block(0,0,37,16,.35,.55,0x173b5a);
block(0,.35,37,13,2.4,.25,0x173b5a);
signLabel("SMKN 2 INDRAMAYU",0,36.7);

// Tiang bendera dan bendera merah putih.
function flagPole(x,z) {
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,7,8),mat(0xd6d9dc));
  pole.position.set(x,3.5,z); pole.castShadow=true; scene.add(pole);
  block(x+.85,6.15,z,1.7,.55,.06,0xe43b3b);
  block(x+.85,5.6,z,1.7,.55,.06,0xffffff);
}
flagPole(-3,24);

// Lampu taman.
function lamp(x,z) {
  const post=new THREE.Mesh(new THREE.CylinderGeometry(.07,.11,3.4,8),mat(0x263746));
  post.position.set(x,1.7,z); post.castShadow=true; scene.add(post);
  const head=new THREE.Mesh(new THREE.BoxGeometry(.65,.22,.45),mat(0xf5d27a));
  head.position.set(x,3.45,z); scene.add(head);
  const glow=new THREE.PointLight(0xffe5a1,.35,7);
  glow.position.set(x,3.3,z); scene.add(glow);
}
[[-8,25],[8,25],[-45,32],[45,32],[-46,-8],[46,-8],[-8,-35],[8,-35]].forEach(p=>lamp(...p));

// Bangku taman di beberapa titik halaman.
function bench(x,z,rotation=0) {
  const group=new THREE.Group(); group.position.set(x,0,z); group.rotation.y=rotation; scene.add(group);
  const wood=mat(0x9a633d), metal=mat(0x34495e);
  const seat=new THREE.Mesh(new THREE.BoxGeometry(2.4,.16,.65),wood);
  seat.position.y=.65; seat.castShadow=true; group.add(seat);
  for(const dx of [-.9,.9]) {
    const leg=new THREE.Mesh(new THREE.BoxGeometry(.13,.65,.5),metal);
    leg.position.set(dx,.33,0); group.add(leg);
    const back=new THREE.Mesh(new THREE.BoxGeometry(.13,1,.12),metal);
    back.position.set(dx,1.05,.25); group.add(back);
  }
  const backrest=new THREE.Mesh(new THREE.BoxGeometry(2.4,.16,.14),wood);
  backrest.position.set(0,1.12,.25); group.add(backrest);
}
bench(-7,21,0); bench(8,21,0); bench(24,8,Math.PI/2); bench(-45,7,Math.PI/2);

// Pot tanaman dan petak bunga.
function flowerBed(x,z) {
  block(x,0,z,3.2,.38,1.5,0x98704d);
  block(x,.38,z,2.9,.12,1.2,0x493d2d);
  const colors=[0xe85d75,0xf5c84c,0xffffff,0x9c7be8];
  for(let i=0;i<8;i++) {
    const px=x-1.15+(i%4)*.76, pz=z-.32+Math.floor(i/4)*.64;
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.025,.035,.35,5),mat(0x367a43));
    stem.position.set(px,.68,pz); scene.add(stem);
    const bloom=new THREE.Mesh(new THREE.SphereGeometry(.16,7,6),mat(colors[i%colors.length]));
    bloom.position.set(px,.88,pz); scene.add(bloom);
  }
}
[[-8,27],[8,27],[-45,20],[45,20],[-8,-35],[8,-35]].forEach(p=>flowerBed(...p));

// Meja kantin luar ruangan.
function outdoorTable(x,z) {
  const top=new THREE.Mesh(new THREE.BoxGeometry(2,.16,1.25),mat(0xe0b86d));
  top.position.set(x,.9,z); top.castShadow=true; scene.add(top);
  for(const dx of [-.75,.75]) for(const dz of [-.4,.4]) {
    const leg=new THREE.Mesh(new THREE.BoxGeometry(.12,.9,.12),mat(0x52616b));
    leg.position.set(x+dx,.45,z+dz); scene.add(leg);
  }
  for(const side of [-1,1]) {
    const seat=new THREE.Mesh(new THREE.BoxGeometry(1.8,.14,.35),mat(0x9a633d));
    seat.position.set(x,.55,z+side*.95); scene.add(seat);
  }
}
outdoorTable(25,-9); outdoorTable(25,-14);

// Pembatas halaman sederhana di tepi area, dengan jarak untuk akses masuk.
for(let x=-56;x<=56;x+=4) {
  if(Math.abs(x)>10) {
    block(x,0,-46,.18,1.15,.18,0xe7e2d6);
    block(x,1.05,-46,4,.12,.12,0x173b5a);
  }
}
for(let z=-42;z<=42;z+=4) {
  if(z<25 || z>39) {
    block(-58,0,z,.18,1.15,.18,0xe7e2d6);
    block(58,0,z,.18,1.15,.18,0xe7e2d6);
  }
}

// Marka jalur kendaraan dan area parkir motor.
for(let i=0;i<8;i++) {
  block(18+i*2.2,.09,30,.12,.025,4,0xf5f0d8);
}

// Pepohonan tambahan membingkai area lapangan.
[[-52,-28],[-52,-12],[-52,8],[-52,25],[52,-28],[52,-12],[52,8],[52,25],[-35,42],[35,42]].forEach(p=>tree(...p));

// Area interaksi dan penghalang gedung (ukuran mengikuti denah ilustratif).
const campusPlaces = [
  {name:"Gedung Utama",x:-17,z:-5,w:24,d:12,info:"Gedung utama sekolah. Area administrasi dan kegiatan belajar."},
  {name:"Kantin",x:18,z:-5,w:13,d:9,info:"Tempat siswa beristirahat dan membeli makanan."},
  {name:"Barak Eskul",x:-30,z:-24,w:13,d:9,info:"Area kegiatan dan pembinaan ekstrakurikuler."},
  {name:"UKS",x:-12,z:-25,w:9,d:7,info:"Unit Kesehatan Sekolah."},
  {name:"Lab NKPI",x:-39,z:0,w:13,d:8,info:"Laboratorium program keahlian NKPI."},
  {name:"Lab APHPI",x:-39,z:15,w:13,d:8,info:"Laboratorium program keahlian APHPI."},
  {name:"Lab TKJ",x:-21,z:17,w:13,d:8,info:"Laboratorium Teknik Komputer dan Jaringan."},
  {name:"Lab RPL",x:-3,z:17,w:13,d:8,info:"Laboratorium Rekayasa Perangkat Lunak."},
  {name:"Lab TAB",x:15,z:-25,w:13,d:8,info:"Laboratorium program keahlian TAB."},
  {name:"Lab Kuliner",x:33,z:-18,w:13,d:8,info:"Laboratorium praktik Kuliner."},
  {name:"Lab APAPL",x:36,z:1,w:13,d:8,info:"Laboratorium program keahlian APAPL."},
  {name:"Lab TP",x:17,z:17,w:13,d:8,info:"Laboratorium program keahlian TP."}
];
const interactionPanel=document.createElement("div");
interactionPanel.id="interaction-panel";
interactionPanel.style.cssText="display:none;position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9;width:min(360px,calc(100vw - 32px));padding:14px 16px;border:1px solid #d4af37;border-radius:14px;background:rgba(9,27,42,.95);color:#fff;font:13px/1.5 Arial,sans-serif;box-shadow:0 6px 24px #0005;text-align:center;pointer-events:none";
document.body.appendChild(interactionPanel);
let nearbyPlace=null;
let infoOpen=false;
function updateNearbyPlace(){
  nearbyPlace=null;
  let best=5.2;
  for(const place of campusPlaces){
    const dx=player.position.x-place.x, dz=player.position.z-place.z;
    const edgeX=Math.max(0,Math.abs(dx)-place.w/2);
    const edgeZ=Math.max(0,Math.abs(dz)-place.d/2);
    const distance=Math.hypot(edgeX,edgeZ);
    if(distance<best){best=distance;nearbyPlace=place;}
  }
  if(nearbyPlace){
    interactionPanel.style.display="block";
    if(infoOpen) showPlaceInfo(nearbyPlace);
    else {
      interactionPanel.innerHTML="";
      const heading=document.createElement("strong");
      heading.textContent=nearbyPlace.name;
      heading.style.color="#e8bd58";
      const detail=document.createElement("div");
      detail.textContent="Tekan E untuk melihat informasi";
      interactionPanel.append(heading,detail);
    }
  } else {
    infoOpen=false;
    interactionPanel.style.display="none";
  }
}
function blockedAt(x,z){
  const radius=.75;
  return campusPlaces.some(place =>
    Math.abs(x-place.x)<place.w/2+radius &&
    Math.abs(z-place.z)<place.d/2+radius
  );
}
function moveWithCollision(dx,dz){
  const nextX=THREE.MathUtils.clamp(player.position.x+dx,-50,50);
  const nextZ=THREE.MathUtils.clamp(player.position.z+dz,-42,43);
  if(!blockedAt(nextX,player.position.z)) player.position.x=nextX;
  if(!blockedAt(player.position.x,nextZ)) player.position.z=nextZ;
}
function showPlaceInfo(place){
  infoOpen=true;
  interactionPanel.style.display="block";
  interactionPanel.style.pointerEvents="none";
  interactionPanel.innerHTML="";
  const heading=document.createElement("strong");
  heading.textContent=place.name;
  heading.style.cssText="display:block;color:#e8bd58;font-size:15px;margin-bottom:5px";
  const detail=document.createElement("div");
  detail.textContent=place.info;
  const hint=document.createElement("small");
  hint.textContent="Tekan E lagi untuk menutup";
  hint.style.cssText="display:block;margin-top:8px;color:#9edcf5";
  interactionPanel.append(heading,detail,hint);
}
// Karakter blocky bergaya game voxel/Roblox, seluruh bagian dianimasikan.
const player = new THREE.Group(); scene.add(player);
const avatar = new THREE.Group(); player.add(avatar);
function part(parent,w,h,d,color,x,y,z) {
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));
  m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; parent.add(m); return m;
}
const skin=0xd9a47b, shirt=0x1c4c78, pants=0x263746, shoe=0x20252a;
part(avatar,.82,.92,.42,shirt,0,1.35,0); // torso
part(avatar,.58,.58,.58,skin,0,2.12,0); // head
// rambut
part(avatar,.62,.16,.62,0x20252a,0,2.47,0);
part(avatar,.12,.1,.04,0xffffff,-.14,2.17,-.3);
part(avatar,.12,.1,.04,0xffffff,.14,2.17,-.3);
part(avatar,.045,.07,.025,0x202020,-.14,2.17,-.325);
part(avatar,.045,.07,.025,0x202020,.14,2.17,-.325);
part(avatar,.14,.035,.035,0x9b5b48,0,2.00,-.31);
const leftArm=new THREE.Group(); leftArm.position.set(-.52,1.75,0); avatar.add(leftArm);
part(leftArm,.28,.78,.3,shirt,0,-.35,0); part(leftArm,.25,.22,.26,skin,0,-.82,0);
const rightArm=new THREE.Group(); rightArm.position.set(.52,1.75,0); avatar.add(rightArm);
part(rightArm,.28,.78,.3,shirt,0,-.35,0); part(rightArm,.25,.22,.26,skin,0,-.82,0);
const leftLeg=new THREE.Group(); leftLeg.position.set(-.22,.9,0); avatar.add(leftLeg);
part(leftLeg,.32,.78,.34,pants,0,-.36,0); part(leftLeg,.34,.2,.5,shoe,0,-.82,-.07);
const rightLeg=new THREE.Group(); rightLeg.position.set(.22,.9,0); avatar.add(rightLeg);
part(rightLeg,.32,.78,.34,pants,0,-.36,0); part(rightLeg,.34,.2,.5,shoe,0,-.82,-.07);
player.position.set(0,0,25);

// Input keyboard + tombol layar sentuh.
const keys = Object.create(null);
addEventListener("keydown",e=>{keys[e.key.toLowerCase()]=true; if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(e.key.toLowerCase())) e.preventDefault();},{passive:false});
addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
addEventListener("keydown",e=>{
  if(e.key.toLowerCase()==="e" && nearbyPlace && !e.repeat){
    if(infoOpen){infoOpen=false;updateNearbyPlace();}
    else showPlaceInfo(nearbyPlace);
  }
});
const joystick=document.querySelector("#joystick");
const stick=document.querySelector("#stick");
const mobile={x:0,z:0};
let joyPointer=null;
function setStick(e) {
  const r=joystick.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
  const dx=e.clientX-cx, dy=e.clientY-cy, max=r.width*.34, len=Math.hypot(dx,dy)||1, scale=Math.min(1,max/len);
  const x=dx*scale,y=dy*scale;
  stick.style.transform=`translate(${x}px,${y}px)`;
  mobile.x=x/max; mobile.z=y/max;
}
joystick.addEventListener("pointerdown",e=>{joyPointer=e.pointerId;joystick.setPointerCapture(joyPointer);setStick(e);});
joystick.addEventListener("pointermove",e=>{if(e.pointerId===joyPointer)setStick(e);});
function releaseJoy(){joyPointer=null;mobile.x=0;mobile.z=0;stick.style.transform="translate(0,0)";}
joystick.addEventListener("pointerup",releaseJoy); joystick.addEventListener("pointercancel",releaseJoy);
let running=false, jumpUntil=0;
document.querySelector("#run").addEventListener("click",()=>{running=!running;document.querySelector("#run").textContent=running?"LARI: ON":"LARI";document.querySelector("#run").classList.toggle("active",running);});
document.querySelector("#jump").addEventListener("click",()=>{jumpUntil=performance.now()+420;});

// Gerakan karakter lebih halus: akselerasi, pengereman, dan putaran bertahap.
let last=0, walkPhase=0;
const moveVelocity=new THREE.Vector3();
const desiredVelocity=new THREE.Vector3();
function animate(now) {
  requestAnimationFrame(animate);
  const dt=Math.min((now-last)/1000,.05); last=now;

  const inputX=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0)+mobile.x;
  const inputZ=(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0)-mobile.z;
  const mag=Math.hypot(inputX,inputZ);
  const moving=mag>.08;

  if(moving){
    const nx=inputX/Math.max(1,mag), nz=inputZ/Math.max(1,mag);
    const worldX=nx*Math.cos(cameraYaw)+nz*Math.sin(cameraYaw);
    const worldZ=-nx*Math.sin(cameraYaw)+nz*Math.cos(cameraYaw);
    const speed=running?10:6;
    desiredVelocity.set(worldX*speed,0,worldZ*speed);
  } else {
    desiredVelocity.set(0,0,0);
  }

  const response=moving?9:12;
  moveVelocity.lerp(desiredVelocity,1-Math.exp(-response*dt));
  moveWithCollision(moveVelocity.x*dt,moveVelocity.z*dt);

  const actualSpeed=Math.hypot(moveVelocity.x,moveVelocity.z);
  if(actualSpeed>.18){
    // Model menghadap sisi -Z, jadi arah hadap perlu dibalik 180 derajat.
    const targetYaw=Math.atan2(moveVelocity.x,moveVelocity.z)+Math.PI;
    const angleDelta=Math.atan2(Math.sin(targetYaw-player.rotation.y),Math.cos(targetYaw-player.rotation.y));
    player.rotation.y+=angleDelta*(1-Math.exp(-13*dt));
    walkPhase+=dt*(running?11:8)*Math.min(1,actualSpeed/6);
    const swing=Math.sin(walkPhase)*Math.min(.55,actualSpeed*.09);
    leftArm.rotation.x=swing; rightArm.rotation.x=-swing;
    leftLeg.rotation.x=-swing; rightLeg.rotation.x=swing;
  } else {
    leftArm.rotation.x=THREE.MathUtils.damp(leftArm.rotation.x,0,10,dt);
    rightArm.rotation.x=THREE.MathUtils.damp(rightArm.rotation.x,0,10,dt);
    leftLeg.rotation.x=THREE.MathUtils.damp(leftLeg.rotation.x,0,10,dt);
    rightLeg.rotation.x=THREE.MathUtils.damp(rightLeg.rotation.x,0,10,dt);
  }

  player.position.x=THREE.MathUtils.clamp(player.position.x,-50,50);
  player.position.z=THREE.MathUtils.clamp(player.position.z,-42,43);
  updateNearbyPlace();
  avatar.position.y=now<jumpUntil?Math.sin((jumpUntil-now)/420*Math.PI)*1.15:(actualSpeed>.18?Math.abs(Math.sin(walkPhase*2))*.045:0);

  cameraTarget.set(player.position.x,1.25,player.position.z);
  const horizontal=Math.cos(cameraPitch)*cameraDistance;
  cameraOffset.set(
    -Math.sin(cameraYaw)*horizontal,
    Math.sin(cameraPitch)*cameraDistance+2.1,
    -Math.cos(cameraYaw)*horizontal
  );
  const desiredCamera=cameraTarget.clone().add(cameraOffset);
  camera.position.lerp(desiredCamera,1-Math.exp(-5.5*dt));
  camera.lookAt(cameraTarget);
  renderer.render(scene,camera);
}
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

async function start() {
  try {
    const data=await checkStudentAccess();
    studentCard(data);
    requestAnimationFrame(animate);
  } catch(error) {
    console.error("Campus error:",error);
    alert(error.message || "Tidak dapat membuka kampus.");
    location.href="index.html";
  }
}
start();
