import * as THREE from "https://esm.sh/three@0.160.0";
import { OrbitControls } from "https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js";
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
  title.textContent = "IDENTITAS SISWA";
  const name = document.createElement("strong");
  name.textContent = data.fullName || "Siswa";
  const info = document.createElement("span");
  info.textContent = `${data.major || "-"} · ${data.grade || "-"} · Kelas ${data.classNumber ?? data.className ?? "-"}`;
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

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.dampingFactor = 0.07;
orbit.minDistance = 7;
orbit.maxDistance = 36;
orbit.maxPolarAngle = Math.PI * 0.48;
orbit.target.set(0, 1, 22);

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

// Follow-camera smoothing without removing mouse orbit.
let last=0, walkPhase=0;
function animate(now) {
  requestAnimationFrame(animate);
  const dt=Math.min((now-last)/1000,.05); last=now;
  let x=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0)+mobile.x;
  let z=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0)+mobile.z;
  const mag=Math.hypot(x,z);
  const moving=mag>.08;
  if(moving){
    x/=Math.max(1,mag); z/=Math.max(1,mag);
    const speed=running?13:7.5;
    player.position.x+=x*speed*dt; player.position.z+=z*speed*dt;
    player.rotation.y=Math.atan2(x,z);
    walkPhase+=dt*(running?13:9);
    const swing=Math.sin(walkPhase)*.62;
    leftArm.rotation.x=swing; rightArm.rotation.x=-swing;
    leftLeg.rotation.x=-swing; rightLeg.rotation.x=swing;
  } else {
    leftArm.rotation.x=THREE.MathUtils.damp(leftArm.rotation.x,0,9,dt);
    rightArm.rotation.x=THREE.MathUtils.damp(rightArm.rotation.x,0,9,dt);
    leftLeg.rotation.x=THREE.MathUtils.damp(leftLeg.rotation.x,0,9,dt);
    rightLeg.rotation.x=THREE.MathUtils.damp(rightLeg.rotation.x,0,9,dt);
  }
  player.position.x=THREE.MathUtils.clamp(player.position.x,-50,50);
  player.position.z=THREE.MathUtils.clamp(player.position.z,-42,43);
  avatar.position.y=now<jumpUntil?Math.sin((jumpUntil-now)/420*Math.PI)*1.15:(moving?Math.abs(Math.sin(walkPhase*2))*.06:0);
  const target=new THREE.Vector3(player.position.x,1.2,player.position.z);
  orbit.target.lerp(target,.075);
  orbit.update();
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
