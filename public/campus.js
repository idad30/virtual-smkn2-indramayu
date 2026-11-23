import * as THREE from "https://esm.sh/three@0.160.0";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { initCampusFeatures } from "./campus-features.js";

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

function watchPromotion(uid) {
  let previous = null;
  const notice = document.createElement("div");
  notice.id = "promotion-notice";
  notice.style.cssText = "display:none;position:fixed;top:22px;left:50%;transform:translateX(-50%);z-index:30;width:min(420px,calc(100vw - 28px));padding:16px 18px;border:1px solid #e4bd58;border-radius:14px;background:rgba(12,31,48,.97);color:#fff;text-align:center;font:14px/1.5 Arial,sans-serif;box-shadow:0 8px 30px #0007";
  document.body.appendChild(notice);
  onSnapshot(doc(db,"players",uid), snap => {
    if (!snap.exists()) return;
    const current = snap.data();
    if (previous) {
      const oldPosition = previous.position || "Anggota";
      const newPosition = current.position || "Anggota";
      const oldStatus = previous.schoolStatus || (previous.gender === "P" ? "Taruni" : "Taruna");
      const newStatus = current.schoolStatus || (current.gender === "P" ? "Taruni" : "Taruna");
      if (oldPosition !== newPosition || oldStatus !== newStatus) {
        notice.replaceChildren();
        const heading = document.createElement("strong");
        heading.textContent = "SELAMAT! JABATAN DIPERBARUI";
        heading.style.cssText = "display:block;color:#f2cf72;font-size:16px;margin-bottom:6px";
        const message = document.createElement("div");
        message.textContent = oldPosition !== newPosition
          ? "Jabatan kamu berubah dari " + oldPosition + " menjadi " + newPosition + "."
          : "Status kamu diperbarui menjadi " + newStatus + ".";
        const close = document.createElement("button");
        close.textContent = "Tutup";
        close.style.cssText = "margin-top:12px;padding:8px 18px;border:0;border-radius:8px;background:#e4bd58;color:#172b3a;font-weight:bold;cursor:pointer";
        close.addEventListener("click", () => { notice.style.display = "none"; });
        notice.append(heading,message,close);
        notice.style.display = "block";
      }
    }
    previous = {
      position: current.position || "Anggota",
      schoolStatus: current.schoolStatus,
      gender: current.gender
    };
  }, error => console.error("Gagal memantau perubahan jabatan:", error));
}

function studentCard(data) {
  const el=document.createElement("aside");
  el.className="student-card";
  el.style.cssText="position:fixed;top:12px;right:12px;z-index:12;width:auto;padding:0;border:0;background:transparent;box-shadow:none";
  const open=document.createElement("button");
  open.type="button"; open.textContent="👤";
  open.title="Profil dan pengaturan karakter";
  open.setAttribute("aria-label","Buka profil");
  open.style.cssText="width:44px;height:44px;padding:0;border:1px solid #d4af37;border-radius:50%;background:#102b43ed;color:#f2cf72;font-size:22px;box-shadow:0 4px 16px #0005";
  const modal=document.createElement("section");
  modal.style.cssText="display:none;position:fixed;inset:0;z-index:25;background:#061522dc;align-items:center;justify-content:center;padding:16px";
  const panel=document.createElement("div");
  panel.style.cssText="width:min(390px,100%);max-height:88vh;overflow:auto;padding:18px;border:1px solid #d4af37;border-radius:16px;background:#102b43;color:#fff;font:13px/1.5 Arial";
  const heading=document.createElement("b"); heading.textContent="PROFIL SISWA";
  heading.style.cssText="display:block;color:#e8bd58;letter-spacing:1px;margin-bottom:12px";
  const nameLabel=document.createElement("label"); nameLabel.textContent="Nama siswa";
  nameLabel.style.cssText="display:grid;gap:6px;margin-bottom:12px";
  const nameInput=document.createElement("input"); nameInput.value=data.fullName||""; nameInput.maxLength=70;
  nameInput.style.cssText="width:100%;padding:11px;border:1px solid #557087;border-radius:8px;background:#091c2a;color:white";
  nameLabel.append(nameInput);
  const info=document.createElement("div");
  info.textContent=`${data.schoolStatus||(data.gender==="P"?"Taruni":"Taruna")} · ${data.position||"Anggota"} · ${data.major||"-"} · ${data.grade||"-"} · Kelas ${data.classNumber??data.className??"-"}`;
  info.style.cssText="color:#c5d6e2;margin-bottom:12px";
  const avatarTitle=document.createElement("b"); avatarTitle.textContent="PILIH KARAKTER";
  avatarTitle.style.cssText="display:block;color:#e8bd58;margin-bottom:8px";
  const avatarButtons=document.createElement("div");
  avatarButtons.style.cssText="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px";
  function refreshAvatarButtons(){
    [...avatarButtons.children].forEach((button,index)=>{
      const selected=Object.keys(avatarOptions)[index]===(data.avatarId||"taruna");
      button.style.background=selected?"#e4bd58":"#183b54";
      button.style.color=selected?"#102b43":"white";
    });
  }
  Object.entries(avatarOptions).forEach(([id,cfg])=>{
    const option=document.createElement("button"); option.type="button"; option.textContent=cfg.label;
    option.style.cssText="padding:10px 6px;border:1px solid #d4af37;border-radius:8px;background:#183b54;color:white;font-size:11px;font-weight:bold";
    option.addEventListener("click",async()=>{
      try {
        await updateDoc(doc(db,"players",auth.currentUser.uid),{avatarId:id});
        buildAvatar(id); data.avatarId=id; refreshAvatarButtons();
      } catch(error){console.error(error);alert("Gagal mengganti karakter. Periksa Firestore Rules.");}
    });
    avatarButtons.append(option);
  });
  const save=document.createElement("button"); save.type="button"; save.textContent="SIMPAN NAMA";
  save.style.cssText="width:100%;margin-top:14px;padding:11px";
  save.addEventListener("click",async()=>{
    const fullName=nameInput.value.trim();
    if(fullName.length<3||fullName.length>70){alert("Nama harus 3–70 karakter.");return;}
    try {
      await updateDoc(doc(db,"players",auth.currentUser.uid),{fullName});
      data.fullName=fullName;
      save.textContent="TERSIMPAN";
      setTimeout(()=>save.textContent="SIMPAN NAMA",1300);
    } catch(error){console.error(error);alert("Gagal menyimpan nama. Periksa Firestore Rules.");}
  });
  const download=document.createElement("button"); download.type="button"; download.textContent="UNDUH ID CARD";
  download.style.cssText="width:100%;margin-top:8px;padding:11px;background:#254b64;color:white";
  download.addEventListener("click",()=>{
    const card=document.createElement("canvas"); card.width=1200; card.height=760;
    const c=card.getContext("2d");
    const gradient=c.createLinearGradient(0,0,1200,760); gradient.addColorStop(0,"#102b43"); gradient.addColorStop(1,"#1d4c68");
    c.fillStyle=gradient;c.fillRect(0,0,1200,760);c.strokeStyle="#d4af37";c.lineWidth=12;c.strokeRect(24,24,1152,712);
    c.fillStyle="#f2cf72";c.font="bold 38px Arial";c.fillText("VIRTUAL SMKN 2 INDRAMAYU",70,105);
    c.fillStyle="#fff";c.font="bold 27px Arial";c.fillText("KARTU IDENTITAS SISWA",70,155);
    c.fillStyle="#dceaf2";c.fillRect(75,210,390,390);c.fillStyle="#173b5a";c.fillRect(185,390,170,210);
    c.fillStyle="#d9a47b";c.fillRect(235,280,90,100);c.fillStyle="#172333";c.fillRect(225,255,110,45);
    c.fillStyle="#fff";c.font="bold 43px Arial";const fullName=data.fullName||"Siswa";c.fillText(fullName.length>25?fullName.slice(0,24)+"…":fullName,520,285);
    c.fillStyle="#e8bd58";c.font="bold 25px Arial";c.fillText(data.schoolStatus||(data.gender==="P"?"Taruni":"Taruna"),520,345);
    const rows=[["Jabatan",data.position||"Anggota"],["Program Keahlian",data.major||"-"],["Tingkat",data.grade||"-"],["Kelas",String(data.classNumber??data.className??"-")]];
    rows.forEach((row,i)=>{const y=420+i*62;c.fillStyle="#a9c2d2";c.font="26px Arial";c.fillText(row[0],520,y);c.fillStyle="#fff";c.fillText(": "+row[1],760,y);});
    const link=document.createElement("a");link.download="ID-Card-"+(fullName.replace(/[^a-z0-9]+/gi,"-")||"siswa")+".png";link.href=card.toDataURL("image/png");link.click();
  });
  const close=document.createElement("button"); close.type="button"; close.textContent="TUTUP";
  close.style.cssText="width:100%;margin-top:8px;padding:10px;background:#344e60;color:white";
  close.addEventListener("click",()=>modal.style.display="none");
  panel.append(heading,nameLabel,info,avatarTitle,avatarButtons,save,download,close);
  modal.append(panel); modal.addEventListener("click",e=>{if(e.target===modal)modal.style.display="none";});
  open.addEventListener("click",()=>modal.style.display="flex");
  el.append(open);document.body.append(el,modal);refreshAvatarButtons();
}

const root = document.querySelector("#game");
const scene = new THREE.Scene();
// Langit dan suasana otomatis mengikuti waktu Indonesia (WIB).
const skyColors = {
  morning: new THREE.Color(0xf3b77e),
  day: new THREE.Color(0x87c8ed),
  night: new THREE.Color(0x101a36)
};
const fogColors = {
  morning: new THREE.Color(0xd9ad91),
  day: new THREE.Color(0x9bc8dc),
  night: new THREE.Color(0x202b46)
};
scene.background = skyColors.day.clone();
scene.fog = new THREE.Fog(fogColors.day.clone(), 80, 165);
let hemisphereLight;
let currentSkyPeriod = "";
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
let walkMode = false;
let droneStartedAt = performance.now();
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

hemisphereLight = new THREE.HemisphereLight(0xeaf7ff, 0x61764d, 2.1);
scene.add(hemisphereLight);
const sun = new THREE.DirectionalLight(0xfff0d1, 2.2);
sun.position.set(-35, 65, 35);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

function updateSkyByTime() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date());
  const hour = Number(parts.find(part => part.type === "hour")?.value ?? 12);
  const period = hour >= 5 && hour < 10 ? "morning" : hour >= 10 && hour < 17 ? "day" : "night";
  if (period === currentSkyPeriod) return;
  currentSkyPeriod = period;

  scene.background.copy(skyColors[period]);
  scene.fog.color.copy(fogColors[period]);
  if (period === "morning") {
    hemisphereLight.intensity = 1.35;
    sun.intensity = 1.25;
    sun.color.set(0xffd2a1);
    sun.position.set(-45, 30, 25);
  } else if (period === "day") {
    hemisphereLight.intensity = 2.1;
    sun.intensity = 2.2;
    sun.color.set(0xfff0d1);
    sun.position.set(-35, 65, 35);
  } else {
    hemisphereLight.intensity = 0.48;
    sun.intensity = 0.12;
    sun.color.set(0x8ca9e8);
    sun.position.set(20, 18, -25);
  }
}

const mat = color => new THREE.MeshStandardMaterial({ color, roughness: 0.82 });
function block(x,y,z,w,h,d,color) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat(color));
  mesh.position.set(x,y+h/2,z); mesh.castShadow=true; mesh.receiveShadow=true; scene.add(mesh);
  return mesh;
}

// Denah 3D lama sengaja dikosongkan sebelum pemetaan ulang dari denah resmi.
// Untuk sementara hanya ada area dasar netral; tidak ada gedung/ruang dengan
// posisi ilustratif yang dapat menyesatkan pemain.
const temporaryGround = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 100),
  new THREE.MeshStandardMaterial({ color: 0x789b70, roughness: 1 })
);
temporaryGround.rotation.x = -Math.PI / 2;
temporaryGround.position.y = -0.06;
temporaryGround.receiveShadow = true;
scene.add(temporaryGround);

// Data lokasi dikosongkan sementara sampai denah resmi selesai dipetakan.
const campusPlaces = [];
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
// Avatar 3D yang dapat dipilih dan disimpan di profil siswa.
const player = new THREE.Group(); scene.add(player); player.visible=false;
const avatar = new THREE.Group(); player.add(avatar);
let leftArm, rightArm, leftLeg, rightLeg;
const avatarOptions = {
  taruna: { label:"Taruna Klasik", shirt:0x174b78, pants:0x263746, hair:0x20252a, skin:0xd9a47b, style:"male" },
  taruni: { label:"Taruni Hijab", shirt:0x174b78, pants:0x263746, hair:0x172333, skin:0xd9a47b, style:"hijab" },
  sporty: { label:"Sporty Biru", shirt:0x167caa, pants:0x172b43, hair:0x30251f, skin:0xd9a47b, style:"male" },
  formal: { label:"Formal Navy", shirt:0x102b43, pants:0x172333, hair:0x241c19, skin:0xc98f6b, style:"male" }
};
let selectedAvatarId = "taruna";
function part(parent,w,h,d,color,x,y,z) {
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));
  m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; parent.add(m); return m;
}
function buildAvatar(id) {
  selectedAvatarId = avatarOptions[id] ? id : "taruna";
  const cfg=avatarOptions[selectedAvatarId];
  while(avatar.children.length) {
    const child=avatar.children.pop();
    child.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});
  }
  part(avatar,.82,.92,.42,cfg.shirt,0,1.35,0);
  part(avatar,.18,.12,.035,0xe4bd58,0,1.78,-.225);
  part(avatar,.13,.13,.035,0xe4bd58,-.25,1.48,-.225);
  part(avatar,.58,.58,.58,cfg.skin,0,2.12,0);
  if(cfg.style==="hijab") {
    part(avatar,.68,.68,.65,0x172333,0,2.18,0);
    part(avatar,.58,.48,.08,cfg.skin,0,2.12,-.34);
    part(avatar,.64,.55,.12,0x172333,0,1.83,-.29);
  } else {
    part(avatar,.62,.16,.62,cfg.hair,0,2.47,0);
    part(avatar,.62,.22,.12,cfg.hair,0,2.34,-.29);
  }
  part(avatar,.12,.1,.04,0xffffff,-.14,2.17,-.3);
  part(avatar,.12,.1,.04,0xffffff,.14,2.17,-.3);
  part(avatar,.045,.07,.025,0x202020,-.14,2.17,-.325);
  part(avatar,.045,.07,.025,0x202020,.14,2.17,-.325);
  leftArm=new THREE.Group(); leftArm.position.set(-.52,1.75,0); avatar.add(leftArm);
  part(leftArm,.28,.78,.3,cfg.shirt,0,-.35,0); part(leftArm,.25,.22,.26,cfg.skin,0,-.82,0);
  rightArm=new THREE.Group(); rightArm.position.set(.52,1.75,0); avatar.add(rightArm);
  part(rightArm,.28,.78,.3,cfg.shirt,0,-.35,0); part(rightArm,.25,.22,.26,cfg.skin,0,-.82,0);
  leftLeg=new THREE.Group(); leftLeg.position.set(-.22,.9,0); avatar.add(leftLeg);
  part(leftLeg,.32,.78,.34,cfg.pants,0,-.36,0); part(leftLeg,.34,.2,.5,0x20252a,0,-.82,-.07);
  rightLeg=new THREE.Group(); rightLeg.position.set(.22,.9,0); avatar.add(rightLeg);
  part(rightLeg,.32,.78,.34,cfg.pants,0,-.36,0); part(rightLeg,.34,.2,.5,0x20252a,0,-.82,-.07);
}
buildAvatar(selectedAvatarId);
player.position.set(0,0,25);
player.visible=false;

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
let walkStarted=false;
let campusFeatures = null;
const moveVelocity=new THREE.Vector3();
const desiredVelocity=new THREE.Vector3();
function animate(now) {
  requestAnimationFrame(animate);
  updateSkyByTime();
  const dt=Math.min((now-last)/1000,.05); last=now;
  if(!walkStarted){const t=now*0.00012;const aerial=new THREE.Vector3(Math.sin(t)*72,44,Math.cos(t)*72);camera.position.lerp(aerial,1-Math.exp(-1.3*dt));camera.lookAt(0,0,0);renderer.render(scene,camera);return;}

  const inputX=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0)+mobile.x;
  const inputZ=(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0)-mobile.z;
  const mag=walkMode?Math.hypot(inputX,inputZ):0;
  const moving=mag>.08;

  if(moving){
    const nx=inputX/Math.max(1,mag), nz=inputZ/Math.max(1,mag);
    const worldX=nx*Math.cos(cameraYaw)-nz*Math.sin(cameraYaw);
    const worldZ=nx*Math.sin(cameraYaw)+nz*Math.cos(cameraYaw);
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
  campusFeatures?.update();
  avatar.position.y=now<jumpUntil?Math.sin((jumpUntil-now)/420*Math.PI)*1.15:(actualSpeed>.18?Math.abs(Math.sin(walkPhase*2))*.045:0);

  if(walkMode){
    cameraTarget.set(player.position.x,1.25,player.position.z);
    const horizontal=Math.cos(cameraPitch)*cameraDistance;
    cameraOffset.set(-Math.sin(cameraYaw)*horizontal,Math.sin(cameraPitch)*cameraDistance+2.1,-Math.cos(cameraYaw)*horizontal);
    const desiredCamera=cameraTarget.clone().add(cameraOffset);
    camera.position.lerp(desiredCamera,1-Math.exp(-5.5*dt));
    camera.lookAt(cameraTarget);
  } else {
    const t=(now-droneStartedAt)/1000;
    camera.position.set(Math.sin(t*.12)*48,30+Math.sin(t*.18)*5,Math.cos(t*.12)*48);
    camera.lookAt(0,0,0);
  }
  renderer.render(scene,camera);
}
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

async function start() {
  try {
    const data=await checkStudentAccess();
    studentCard(data);
    watchPromotion(auth.currentUser.uid);
    const intro=document.getElementById("drone-intro");
    document.getElementById("start-walk").addEventListener("click",async()=>{
      walkMode=true;player.visible=true;intro.style.display="none";
      cameraYaw=0;cameraPitch=.22;cameraDistance=10;
      try { if(innerWidth<900 && screen.orientation?.lock) await screen.orientation.lock("landscape"); } catch(error) { console.info("Orientasi landscape dapat diaktifkan dari pengaturan HP."); }
    });
    campusFeatures = initCampusFeatures({ app, uid: auth.currentUser.uid, profile: data, player, scene, THREE, places: campusPlaces });
    document.querySelector('#start-walk').addEventListener('click',async()=>{try{if(innerWidth<=900&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();if(screen.orientation?.lock)await screen.orientation.lock('landscape');}catch(e){console.info('Landscape tidak didukung browser ini',e);}walkStarted=true;player.visible=true;document.querySelector('#drone-intro').style.display='none';document.querySelector('.mobile-controls').style.display='flex';});
    requestAnimationFrame(animate);
  } catch(error) {
    console.error("Campus error:",error);
    alert(error.message || "Tidak dapat membuka kampus.");
    location.href="index.html";
  }
}
start();
