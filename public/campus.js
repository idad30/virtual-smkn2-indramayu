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
  const home=document.createElement("button"); home.type="button"; home.textContent="← KEMBALI KE HALAMAN UTAMA";
  home.style.cssText="width:100%;margin-top:8px;padding:10px;background:#e4bd58;color:#102b43;font-weight:bold";
  home.addEventListener("click",()=>{location.href="index.html";});
  const close=document.createElement("button"); close.type="button"; close.textContent="TUTUP";
  close.style.cssText="width:100%;margin-top:8px;padding:10px;background:#344e60;color:white";
  close.addEventListener("click",()=>modal.style.display="none");
  panel.append(heading,nameLabel,info,avatarTitle,avatarButtons,save,download,home,close);
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
const isMobileGraphics = matchMedia("(max-width: 900px), (pointer: coarse)").matches;
const renderer = new THREE.WebGLRenderer({
  antialias: !isMobileGraphics,
  powerPreference: "high-performance"
});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobileGraphics ? 1.35 : 1.85));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
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

// Kontrol layar sentuh: geser satu jari untuk memutar kamera, cubit dua jari untuk zoom.
renderer.domElement.style.touchAction="none";
const cameraTouches=new Map();
let lastTouchMidpoint=null;
let lastTouchDistance=0;
renderer.domElement.addEventListener("pointerdown",event=>{
  if(event.pointerType!=="touch" || !walkStarted) return;
  cameraTouches.set(event.pointerId,{x:event.clientX,y:event.clientY});
  renderer.domElement.setPointerCapture(event.pointerId);
  if(cameraTouches.size===2){
    const pts=[...cameraTouches.values()];
    lastTouchMidpoint={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
    lastTouchDistance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
  }
});
renderer.domElement.addEventListener("pointermove",event=>{
  if(!cameraTouches.has(event.pointerId)) return;
  const previous=cameraTouches.get(event.pointerId);
  cameraTouches.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(cameraTouches.size===1){
    cameraYaw-=(event.clientX-previous.x)*CAMERA_SENSITIVITY*1.35;
    cameraPitch=THREE.MathUtils.clamp(cameraPitch+(event.clientY-previous.y)*CAMERA_SENSITIVITY*1.35,-0.18,.78);
  }else if(cameraTouches.size===2){
    const pts=[...cameraTouches.values()];
    const midpoint={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
    const distance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
    if(lastTouchMidpoint){
      cameraYaw-=(midpoint.x-lastTouchMidpoint.x)*CAMERA_SENSITIVITY;
      cameraPitch=THREE.MathUtils.clamp(cameraPitch+(midpoint.y-lastTouchMidpoint.y)*CAMERA_SENSITIVITY,-.18,.78);
    }
    if(lastTouchDistance>0) cameraDistance=THREE.MathUtils.clamp(cameraDistance-(distance-lastTouchDistance)*.025,6,19);
    lastTouchMidpoint=midpoint;lastTouchDistance=distance;
  }
});
function releaseCameraTouch(event){
  cameraTouches.delete(event.pointerId);
  if(cameraTouches.size<2){lastTouchMidpoint=null;lastTouchDistance=0;}
}
renderer.domElement.addEventListener("pointerup",releaseCameraTouch);
renderer.domElement.addEventListener("pointercancel",releaseCameraTouch);

hemisphereLight = new THREE.HemisphereLight(0xeaf7ff, 0x61764d, 2.45);
scene.add(hemisphereLight);
const ambientFill = new THREE.AmbientLight(0xffffff, 0.42);
scene.add(ambientFill);
const sun = new THREE.DirectionalLight(0xfff0d1, 2.2);
sun.position.set(-35, 65, 35);
sun.castShadow = true;
sun.shadow.mapSize.set(isMobileGraphics ? 1024 : 2048, isMobileGraphics ? 1024 : 2048);
sun.shadow.camera.left = -72;
sun.shadow.camera.right = 72;
sun.shadow.camera.top = 62;
sun.shadow.camera.bottom = -62;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 150;
sun.shadow.normalBias = 0.035;
sun.shadow.bias = -0.00008;
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
function campusLabel(text,x,z,color="#ffffff"){
  const canvas=document.createElement("canvas");canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext("2d");ctx.fillStyle="rgba(8,25,39,.82)";ctx.fillRect(0,0,512,128);
  ctx.strokeStyle="#d4af37";ctx.lineWidth=5;ctx.strokeRect(4,4,504,120);
  ctx.fillStyle=color;ctx.font="bold 34px Arial";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(text.slice(0,28),256,64);
  const texture=new THREE.CanvasTexture(canvas);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true}));
  sprite.position.set(x,5,z);sprite.scale.set(9,2.25,1);scene.add(sprite);
}
// Tekstur prosedural ringan agar permukaan kampus tidak terlihat polos.
function makeSurfaceTexture(base, speckle, count, repeatX, repeatY){
  const canvas=document.createElement("canvas");canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext("2d");ctx.fillStyle=base;ctx.fillRect(0,0,256,256);
  let seed=92821;
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<count;i++){
    const alpha=.05+rand()*.16;
    ctx.fillStyle=speckle.replace("ALPHA",alpha.toFixed(2));
    const size=1+rand()*4;
    ctx.fillRect(rand()*256,rand()*256,size,size);
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(repeatX,repeatY);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
  return texture;
}
const grassTexture=makeSurfaceTexture("#789b70","rgba(34,75,39,ALPHA)",950,12,10);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(120,100),new THREE.MeshStandardMaterial({map:grassTexture,color:0xffffff,roughness:1}));
ground.rotation.x=-Math.PI/2;ground.position.y=-.06;ground.receiveShadow=true;scene.add(ground);
const concreteTexture=makeSurfaceTexture("#c8c1ad","rgba(78,70,57,ALPHA)",620,3,3);
const pathMat=new THREE.MeshStandardMaterial({map:concreteTexture,color:0xffffff,roughness:.96});
function path(x,z,w,d){const m=new THREE.Mesh(new THREE.BoxGeometry(w,.08,d),pathMat);m.position.set(x,.01,z);m.receiveShadow=true;scene.add(m);}
path(0,0,7,88);path(-2,0,88,6);path(26,0,5,80);path(-26,0,5,78);
const campusPlaces=[];
const animatedWater=[];
function building(name,x,z,w,d,color,info,height=3.2){
  const glass=new THREE.MeshStandardMaterial({color:0x8fc7d8,metalness:.15,roughness:.25});
  if(name==="KOLAM RENANG" || name==="KOLAM IKAN"){
    const isPool=name==="KOLAM RENANG";
    const rim= isPool ? .48 : .38;
    const depth= isPool ? .82 : .58;
    const waterY=isPool ? .34 : .22;
    const waterW=w-rim*2, waterD=d-rim*2;
    const stone=0xb8c4c8;
    const inner=0x557b86;
    // Bak kolam dengan bibir batu dan dasar yang terlihat melalui air.
    block(x,-depth,z,w,.24,d,0x87979b);
    block(x-w/2+rim/2,-.02,z,rim,.72,d,stone);
    block(x+w/2-rim/2,-.02,z,rim,.72,d,stone);
    block(x,-.02,z-d/2+rim/2,w,.72,rim,stone);
    block(x,-.02,z+d/2-rim/2,w,.72,rim,stone);
    block(x,-.17,z,waterW,.12,waterD,inner);
    const waterCanvas=document.createElement("canvas");waterCanvas.width=256;waterCanvas.height=256;
    const ctx=waterCanvas.getContext("2d");
    const grad=ctx.createLinearGradient(0,0,256,256);
    grad.addColorStop(0,isPool?"#48c4df":"#55b9b2");
    grad.addColorStop(.5,isPool?"#168eb9":"#238d83");
    grad.addColorStop(1,isPool?"#12658f":"#176c68");
    ctx.fillStyle=grad;ctx.fillRect(0,0,256,256);
    for(let i=0;i<34;i++){
      const px=(i*73)%256, py=(i*137)%256;
      ctx.beginPath();ctx.ellipse(px,py,12+(i%5)*5,2+(i%3),-.25,0,Math.PI*2);
      ctx.strokeStyle="rgba(220,250,255,.28)";ctx.lineWidth=1.6;ctx.stroke();
    }
    const waterTexture=new THREE.CanvasTexture(waterCanvas);
    waterTexture.wrapS=waterTexture.wrapT=THREE.RepeatWrapping;
    waterTexture.repeat.set(1.2,2.2);
    waterTexture.colorSpace=THREE.SRGBColorSpace;
    const waterMaterial=new THREE.MeshPhysicalMaterial({map:waterTexture,color:0xffffff,metalness:.12,roughness:.19,transparent:true,opacity:.88,clearcoat:.9,clearcoatRoughness:.12,side:THREE.DoubleSide});
    const water=new THREE.Mesh(new THREE.PlaneGeometry(waterW,waterD),waterMaterial);
    water.rotation.x=-Math.PI/2;water.position.set(x,waterY,z);scene.add(water);
    water.receiveShadow=true;
    water.userData.flowSpeed=isPool ? .012 : .008;
    animatedWater.push({texture:waterTexture,mesh:water});
    // Tangga kecil di sisi kolam renang dan batu pijakan kolam ikan.
    if(isPool){
      for(let i=0;i<3;i++) block(x+w/2-.9,-.05+i*.12,z+d/2-1.1-i*.55,.12,.12,.5,0xd9e1df);
      block(x,waterY+.025,z-d/2+.45,waterW*.72,.045,.08,0xe2f0ef);
    } else {
      for(let i=0;i<3;i++) block(x-w/2+.9+i*.45,.02,z+d/2-.75,.32,.12,.32,0xd4d0bd);
      const lily=new THREE.Mesh(new THREE.CircleGeometry(.42,20),new THREE.MeshStandardMaterial({color:0x3c9a65,roughness:.85}));
      lily.rotation.x=-Math.PI/2;lily.position.set(x+.9,waterY+.035,z-.7);scene.add(lily);
      const flower=new THREE.Mesh(new THREE.SphereGeometry(.13,10,8),new THREE.MeshStandardMaterial({color:0xf1d7e4}));
      flower.scale.set(1,.35,1);flower.position.set(x+.9,waterY+.12,z-.7);scene.add(flower);
    }
    campusPlaces.push({name,x,z,w,d,info});
    campusLabel(name,x,z,"#ffffff");
    return;
  }
  if(name==="GEDUNG UTAMA"){
    // Gedung Utama dibuat dua lantai dengan ruang dalam yang benar-benar terbuka.
    const wall=.42, floorY=3.18, totalH=6.45, doorW=2.35;
    block(x,0,z,w,.18,d,0xc8cdd0); // lantai dasar
    // Dinding luar lantai 1: sisi depan sengaja memiliki bukaan pintu.
    block(x-w/2+wall/2,0,z,wall,totalH,d,color);
    block(x+w/2-wall/2,0,z,wall,totalH,d,color);
    block(x,0,z-d/2+wall/2,w,totalH,wall,color);
    const sideW=(w-doorW)/2;
    block(x-w/2+sideW/2,0,z+d/2-wall/2,sideW,totalH,wall,color);
    block(x+w/2-sideW/2,0,z+d/2-wall/2,sideW,totalH,wall,color);
    // Lantai dua, terbelah untuk menyediakan ruang tangga.
    block(x-1.4, floorY, z, w-4.8, .28, d, 0xb8c3c9);
    block(x+w/2-1.05, floorY, z, 2.1, .28, d, 0xb8c3c9);
    // Dinding pembatas lantai dua.
    block(x, floorY+.28, z-d/2+wall/2,w,3.0,wall,color);
    block(x-w/2+wall/2, floorY+.28,z,wall,3.0,d,color);
    block(x+w/2-wall/2, floorY+.28,z,wall,3.0,d,color);
    // Tangga bertahap di sisi kanan interior, naik dari depan ke belakang.
    const stairX=x+w/2-3.25;
    for(let i=0;i<11;i++){
      const stepH=(i+1)*((floorY-.12)/11);
      const stepZ=z+d/2-1.2-i*.72;
      block(stairX,0,stepZ,2.05,stepH,.78,0x9babb4);
    }
    // Pintu masuk, kusen, jendela, dan lis atap.
    block(x-doorW/2-.12,0,z+d/2+.12,.18,2.55,.16,0x684a32);
    block(x+doorW/2+.12,0,z+d/2+.12,.18,2.55,.16,0x684a32);
    block(x,2.5,z+d/2+.12,doorW+.42,.18,.16,0x684a32);
    for(const wx of [x-7.2,x-4.3,x+4.3,x+7.2]){
      const pane=new THREE.Mesh(new THREE.BoxGeometry(1.65,1.25,.1),glass);
      pane.position.set(wx,2.05,z+d/2+.13);scene.add(pane);
      const upper=new THREE.Mesh(new THREE.BoxGeometry(1.65,1.25,.1),glass);
      upper.position.set(wx,4.95,z+d/2+.13);scene.add(upper);
    }
    block(x,totalH,z,w+.5,.3,d+.5,0x34485a);
    block(x,totalH+.35,z+d/2+.18,Math.min(w*.55,5.5),.5,.14,0x18364b);
    // Furnitur sederhana lantai 1 dan 2 sebagai penanda ruang.
    block(x-5,.15,z-1.5,3.2,.9,1.1,0x8b735b);
    block(x+2,.15,z-1.5,3.2,.9,1.1,0x8b735b);
    block(x-5,floorY+.3,z-1.5,3.2,.9,1.1,0x8b735b);
    block(x+2,floorY+.3,z-1.5,3.2,.9,1.1,0x8b735b);
    campusPlaces.push({name,x,z,w,d,info});
    campusLabel(name,x,z,"#ffffff");
    return;
  }
  // Interior terbuka: lantai, dinding bersegmen dengan pintu depan, dan isi ruang.
  const wall=.28, doorW=Math.min(1.9,w*.28), doorH=Math.min(2.5,height*.82);
  block(x,-.08,z,w,.16,d,0xc9c5b9);
  block(x-w/2+wall/2,0,z,wall,height,d,color);
  block(x+w/2-wall/2,0,z,wall,height,d,color);
  block(x,0,z-d/2+wall/2,w,height,wall,color);
  const sideW=(w-doorW)/2;
  block(x-w/2+sideW/2,0,z+d/2-wall/2,sideW,height,wall,color);
  block(x+w/2-sideW/2,0,z+d/2-wall/2,sideW,height,wall,color);
  block(x-doorW/2-.08,0,z+d/2,.16,doorH,.18,0x684a32);
  block(x+doorW/2+.08,0,z+d/2,.16,doorH,.18,0x684a32);
  block(x,height+.12,z,w+.35,.22,d+.35,0x34485a);
  const windowW=Math.min(1.5,w*.2), windowH=Math.min(1.05,height*.34);
  const count=Math.max(1,Math.floor((w-doorW-1)/(windowW+.9)));
  for(let i=0;i<count;i++){
    const wx=x-(count-1)*(windowW+.9)/2+i*(windowW+.9);
    if(Math.abs(wx-x)<doorW*.8) continue;
    const pane=new THREE.Mesh(new THREE.BoxGeometry(windowW,windowH,.08),glass);
    pane.position.set(wx,Math.min(height*.68,2.05),z+d/2+.09);scene.add(pane);
    block(wx,Math.min(height*.68,2.05)-windowH/2-.08,z+d/2+.12,windowW+.12,.12,.16,0xe8e2d5);
  }
  block(x,height+.28,z+d/2+.13,Math.min(w*.55,4.2),.42,.12,0x18364b);
  const isLab=/LAB|RPS|BRIDGE SIMULATOR|TEFA/i.test(name);
  const isCanteen=/KANTIN|OUTLET/i.test(name);
  const isHall=/AULA|MASJID|EKSKUL/i.test(name);
  const deskColor=isCanteen?0x9a6940:0x987653;
  if(isCanteen){
    block(x,.48,z-d*.22,w*.72,.96,.85,0x9b7049);
    for(let i=-1;i<=1;i++) block(x+i*w*.22,.42,z+d*.18,.72,.12,.72,0x5b6870);
    for(let i=-1;i<=1;i++) block(x+i*w*.22,.42,z+d*.18+1,.12,.8,.12,0x5b6870);
  } else if(isHall){
    for(let row=0;row<2;row++) block(x,.12,z-d*.18+row*1.35,w*.62,.18,.12,0x987653);
    if(name.includes("MASJID")) block(x,.18,z-d*.3,w*.28,.32,.2,0x2f8c78);
  } else {
    const isTKJ=name.includes("TKJ");
    const isClassroom=/RUANG TEORI|RKB/i.test(name);
    const cols=Math.max(1,Math.min(4,Math.floor((w-2)/2.5)));
    const rows=Math.max(1,Math.min(4,Math.floor((d-2)/1.8)));
    // Meja siswa disusun rapi menghadap papan di bagian depan ruangan.
    for(let row=0;row<rows;row++) for(let col=0;col<cols;col++){
      const px=x+(col-(cols-1)/2)*Math.min(2.35,(w-2)/Math.max(1,cols-1));
      const pz=z-d*.22+row*Math.min(1.65,(d-2)/Math.max(1,rows-1));
      block(px,.82,pz,.95,.12,.52,deskColor);
      block(px,.42,pz-.42,.12,.78,.12,0x59636a);
      if(isLab){
        // Monitor, layar, dudukan dan keyboard pada meja praktik.
        block(px,.98,pz,.48,.38,.24,0x263b4b);
        block(px,.99,pz-.135,.39,.27,.025,0x55b8d0);
        block(px,.77,pz-.28,.08,.06,.08,0x303a42);
        block(px,.91,pz+.19,.34,.035,.12,0x303a42);
        if(isTKJ){
          block(px-.28,.98,pz+.08,.18,.18,.2,0x87949b);
          for(let led=0;led<3;led++){
            const light=new THREE.Mesh(new THREE.SphereGeometry(.025,6,5),new THREE.MeshBasicMaterial({color:led===1?0x39d98a:0xe6c75a}));
            light.position.set(px-.28+(led-1)*.045,1.04,pz+.185);scene.add(light);
          }
        }
      } else {
        // Kursi siswa dengan sandaran.
        block(px,.43,pz+.55,.48,.1,.42,0x31566b);
        block(px,.72,pz+.74,.46,.48,.1,0x31566b);
      }
    }
    // Meja guru/instruktur dan papan tulis di dinding depan.
    block(x,.78,z-d/2+.9,Math.min(w*.48,3.4),.16,.72,0x76563b);
    block(x,.42,z-d/2+.62,.12,.72,.12,0x59636a);
    const board=new THREE.Mesh(new THREE.BoxGeometry(Math.min(w*.62,4.8),1.05,.12),new THREE.MeshStandardMaterial({color:isLab?0x263d48:0x244d45,roughness:.8}));
    board.position.set(x,2.05,z-d/2+.19);scene.add(board);
    if(isLab){
      // Rak perangkat jaringan pada laboratorium TKJ.
      if(isTKJ){
        for(let shelf=0;shelf<2;shelf++){
          const sx=x-w*.34+shelf*1.25;
          block(sx,1.05,z+d/2-.55,.9,.08,.48,0x687780);
          block(sx,.55,z+d/2-.55,.08,1,.08,0x687780);
          block(sx,1.55,z+d/2-.55,.08,1,.08,0x687780);
          block(sx,1.32,z+d/2-.55,.72,.32,.34,0x53616b);
        }
      }
    }
  }
  campusPlaces.push({name,x,z,w,d,info});
  campusLabel(name,x,z,"#ffffff");
}
// Sisi utara mengikuti panah UTARA pada denah sumber (arah kanan pada gambar).
building("LAB BIOLOGI",-30,-34,10,7,0xe6e8e5,"Laboratorium Biologi",3.2);
building("LAB RPL", -16,-34,17,7,0xe2e6eb,"Laboratorium RPL dan ruang praktik",3.2);
building("RUANG TEORI RPL",-34,-21,9,7,0xf1df8a,"Ruang teori RPL",3.2);
building("RKB RPL",-18,-21,10,7,0xe8e8e8,"Ruang kegiatan belajar RPL",3.2);
building("RUANG TEORI TAB",-1,-19,17,11,0x45b9e8,"Ruang teori TAB lantai 1 dan 2",4.4);
building("RUANG TEORI NKPI",21,-18,15,8,0xf16e70,"Ruang teori NKPI",3.4);
building("RUANG TEORI AP",-35,4,12,7,0xf2c18c,"Ruang teori APAPL",3.2);
building("RUANG TEORI KULINER",-22,4,10,13,0xe45b9d,"Ruang teori Kuliner",3.2);
building("RUANG TEORI TKJ",-7,4,10,13,0x67d69b,"Ruang teori TKJ",3.2);
building("RUANG TEORI TP",25,5,9,12,0xf2c18c,"Ruang teori TP",3.2);
building("LAB APHPI",-36,20,9,8,0xe7e8e8,"Laboratorium APHPI",3.2);
building("LAB TKJ",-17,22,15,8,0xe6e8e8,"Laboratorium TKJ",3.2);
building("LAB TAB",31,8,7,16,0xe6e8e8,"Laboratorium TAB",3.2);
building("RPS RPL",37,-19,6,13,0xe6e8e8,"Ruang praktik siswa RPL",3.2);
building("MASJID",-18,31,10,9,0xe8e3d6,"Masjid SMKN 2 Indramayu",4);
building("R AULA 2",-31,31,12,10,0xe6e8e8,"Ruang Aula 2",4);
building("GEDUNG UTAMA",-1,34,23,12,0xe5e5e5,"Gedung utama: ruang kepala sekolah, guru, tata usaha, dan layanan sekolah",5);
building("BRIDGE SIMULATOR",19,29,12,9,0xe6e8e8,"Bridge Simulator dan ruang navigasi",3.6);
building("KANTIN",-39,39,11,6,0xe8e8e8,"Kantin sekolah",3);
building("RUANG EKSKUL",-49,27,6,9,0xe8e8e8,"Ruang ekstrakurikuler",3);
building("POS SATPAM",8,47,7,4,0xd7d7d7,"Pos satpam",2.6);
building("TEFA JB",-4,47,8,4,0xd7d7d7,"TEFA JB Outlet",2.6);
building("KOLAM RENANG",28,27,7,13,0x6bb6cf,"Kolam renang",1.8);
building("KOLAM IKAN",-49,7,7,7,0x6bb6cf,"Kolam ikan",1.8);
building("AREA PARKIR",-12,46,22,5,0xb9b9b9,"Area parkir",1.2);
// Lapangan upacara diperbesar dan diberi garis lapangan yang jelas.
const fieldTexture=makeSurfaceTexture("#579653","rgba(26,76,36,ALPHA)",1100,2,5);
const field=new THREE.Mesh(new THREE.PlaneGeometry(14,32),new THREE.MeshStandardMaterial({map:fieldTexture,color:0xffffff,roughness:1}));
field.rotation.x=-Math.PI/2;field.position.set(7,.035,5);field.receiveShadow=true;scene.add(field);
const fieldLineMat=new THREE.MeshStandardMaterial({color:0xf4f4e9,roughness:1});
function fieldLine(x,z,w,d){
  const line=new THREE.Mesh(new THREE.BoxGeometry(w,.035,d),fieldLineMat);
  line.position.set(x,.065,z);scene.add(line);
}
fieldLine(7,-10.8,13.5,.12);fieldLine(7,20.8,13.5,.12);
fieldLine(.25,5,.12,31.5);fieldLine(13.75,5,.12,31.5);
fieldLine(7,5,13.5,.12);
const centerCircle=new THREE.Mesh(new THREE.TorusGeometry(2.5,.07,8,64),fieldLineMat);
centerCircle.rotation.x=Math.PI/2;centerCircle.position.set(7,.09,5);scene.add(centerCircle);
// Lampu taman di sisi lapangan untuk suasana lebih terang pada malam hari.
const lampMat=new THREE.MeshStandardMaterial({color:0xffe7a8,emissive:0xffd477,emissiveIntensity:1.8});
for(const [lx,lz] of [[-1, -8],[15,-8],[-1,18],[15,18]]){
  block(lx,0,lz,.22,7,.22,0x34485a);
  const lamp=new THREE.Mesh(new THREE.SphereGeometry(.32,12,10),lampMat);
  lamp.position.set(lx,7.15,lz);scene.add(lamp);
  const glow=new THREE.PointLight(0xffd99a,1.1,18,2);
  glow.position.set(lx,6.8,lz);scene.add(glow);
}
campusLabel("LAPANGAN UPACARA",7,5,"#fff4c7");

campusLabel("EMPANG UTARA",38,-42,"#fff4c7");

// UPGRADE 5: lanskap kampus — pepohonan, taman, jalur pedestrian, dan pagar.
const trunkMat=new THREE.MeshStandardMaterial({color:0x765039,roughness:1});
const leafMats=[
  new THREE.MeshStandardMaterial({color:0x28764a,roughness:.9}),
  new THREE.MeshStandardMaterial({color:0x368653,roughness:.9}),
  new THREE.MeshStandardMaterial({color:0x4b965b,roughness:.9})
];
function campusTree(x,z,s=1){
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.16*s,.23*s,1.8*s,7),trunkMat);
  trunk.position.set(x,.9*s,z);trunk.castShadow=true;scene.add(trunk);
  for(const [ox,oy,oz,r,mat] of [[0,2.05,.0,.9,0],[.48,2.35,.08,.65,1],[-.45,2.28,-.12,.68,2],[0,2.78,-.08,.62,1]]){
    const crown=new THREE.Mesh(new THREE.SphereGeometry(r*s,9,7),leafMats[mat]);
    crown.position.set(x+ox*s,oy*s,z+oz*s);crown.scale.y=.9;crown.castShadow=true;scene.add(crown);
  }
}
function campusBush(x,z,s=1){
  const bush=new THREE.Mesh(new THREE.SphereGeometry(.48*s,8,6),leafMats[1]);
  bush.position.set(x,.34*s,z);bush.scale.set(1,.72,1);bush.castShadow=true;scene.add(bush);
}
function gardenBed(x,z,w,d){
  block(x,.04,z,w,.08,d,0x796348);
  for(let i=0;i<Math.max(2,Math.floor(w/1.2));i++){
    const px=x-w/2+.55+i*(w-.9)/Math.max(1,Math.floor(w/1.2)-1);
    campusBush(px,z,.48);
    const flower=new THREE.Mesh(new THREE.SphereGeometry(.12,8,6),new THREE.MeshStandardMaterial({color:i%2?0xf0c85a:0xe9a4bd,roughness:.8}));
    flower.position.set(px,.55,z+.18);scene.add(flower);
  }
}
// Pepohonan ditempatkan di ruang terbuka tepi kampus, tidak menggeser bangunan.
[
  [-45,-37,1.15],[-45,-13,.95],[-45,15,1.05],[-43,43,.9],
  [46,-35,1.1],[46,-8,.95],[46,19,1.05],[45,43,.9],
  [-29,-42,.85],[-7,-40,.9],[18,-40,.95],[36,-40,.9],
  [-27,44,.85],[18,44,.9],[37,44,.85]
].forEach(([x,z,s])=>campusTree(x,z,s));
[
  [-39,-10],[-39,-6],[-39,-2],[40,-2],[40,2],[40,6],
  [-30,17],[-25,17],[21,17],[26,17],[-12,29],[-7,29]
].forEach(([x,z])=>campusBush(x,z,.72));
// Taman kecil di sisi lapangan dan dekat jalur pedestrian.
gardenBed(-2,-14,5,1.1);
gardenBed(16,-14,5,1.1);
gardenBed(-2,24,5,1.1);
gardenBed(16,24,5,1.1);
// Jalur pedestrian abu-abu muda yang menghubungkan area lapangan.
const pathMat=new THREE.MeshStandardMaterial({color:0xb9b9ae,roughness:1});
function campusPath(x,z,w,d){
  const path=new THREE.Mesh(new THREE.PlaneGeometry(w,d),pathMat);
  path.rotation.x=-Math.PI/2;path.position.set(x,.012,z);path.receiveShadow=true;scene.add(path);
}
campusPath(7,-13,2.8,7);
campusPath(7,23,2.8,7);
campusPath(-4,5,8,2.5);
campusPath(18,5,8,2.5);
// Pagar rendah dekoratif pada sisi luar; dibuat terputus di akses utama.
const fenceMat=new THREE.MeshStandardMaterial({color:0x34495a,metalness:.35,roughness:.65});
function fenceRail(x1,z1,x2,z2){
  const dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz),angle=Math.atan2(dz,dx);
  const rail=new THREE.Mesh(new THREE.BoxGeometry(len,.12,.12),fenceMat);
  rail.position.set((x1+x2)/2,1.05,(z1+z2)/2);rail.rotation.y=-angle;scene.add(rail);
  const rail2=rail.clone();rail2.position.y=.55;scene.add(rail2);
  const count=Math.floor(len/2);
  for(let i=0;i<=count;i++){
    const t=count?i/count:0;
    const post=new THREE.Mesh(new THREE.BoxGeometry(.13,1.25,.13),fenceMat);
    post.position.set(x1+dx*t,.62,z1+dz*t);post.castShadow=true;scene.add(post);
  }
}
fenceRail(-49,-40,-49,43);
fenceRail(49,-40,49,43);
fenceRail(-49,-40,49,-40);
fenceRail(-49,49,-15,49);
fenceRail(15,49,49,49);

// NPC siswa kampus: karakter sederhana yang berjalan bolak-balik di jalur terbuka.
const npcStudents=[];
const npcLooks=[
  {shirt:0x174b78,pants:0x263746,skin:0xd9a47b,hair:0x20252a},
  {shirt:0x167caa,pants:0x172b43,skin:0xc98f6b,hair:0x241c19},
  {shirt:0x245b82,pants:0x303944,skin:0xe0b18a,hair:0x30251f},
  {shirt:0x1d4568,pants:0x263746,skin:0xd9a47b,hair:0x172333}
];
function createNpcStudent(index,x,z){
  const look=npcLooks[index%npcLooks.length];
  const npc=new THREE.Group();
  const body=new THREE.Group();npc.add(body);
  const piece=(w,h,d,color,px,py,pz)=>{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));
    mesh.position.set(px,py,pz);mesh.castShadow=true;body.add(mesh);return mesh;
  };
  piece(.72,.82,.38,look.shirt,0,1.25,0);
  piece(.5,.52,.5,look.skin,0,1.92,0);
  piece(.56,.16,.56,look.hair,0,2.19,0);
  piece(.58,.12,.1,look.hair,0,2.08,-.25);
  const arms=[],legs=[];
  for(const side of [-1,1]){
    const arm=new THREE.Group();arm.position.set(side*.45,1.58,0);body.add(arm);
    const limb=new THREE.Mesh(new THREE.BoxGeometry(.22,.65,.24),mat(look.shirt));
    limb.position.y=-.31;arm.add(limb);arms.push(arm);
    const legPivot=new THREE.Group();legPivot.position.set(side*.18,.72,0);body.add(legPivot);
    const leg=new THREE.Mesh(new THREE.BoxGeometry(.27,.72,.3),mat(look.pants));
    leg.position.y=-.36;leg.castShadow=true;legPivot.add(leg);legs.push(legPivot);
  }
  npc.position.set(x,0,z);scene.add(npc);
  npcStudents.push({npc,arms,legs,name:["Adit","Raka","Dina","Salsa","Fajar","Nabila","Rizky","Putri","Bagas","Citra","Dimas","Nadya","Farhan","Alya","Reza","Intan","Yoga","Tiara","Rafi","Zahra"][index],profile:[["suka teknologi","Aku lagi belajar merakit jaringan komputer.","Kamu pernah mencoba konfigurasi router?","Aku suka praktik langsung supaya lebih paham.","Kalau ke Lab TKJ, jangan lupa ikuti aturan lab."],["suka olahraga","Aku baru selesai latihan di lapangan.","Kamu biasanya suka olahraga apa?","Seru kalau bisa olahraga bareng teman-teman.","Jangan lupa pemanasan sebelum mulai, ya."],["rajin membaca","Aku sedang mencari buku untuk dibaca.","Kamu lebih suka buku cerita atau pengetahuan?","Membaca sebentar setiap hari bisa menambah wawasan.","Perpustakaan bisa jadi tempat yang nyaman untuk belajar."],["aktif organisasi","Aku sedang menyiapkan kegiatan sekolah.","Kamu ikut ekstrakurikuler apa?","Ikut kegiatan bisa melatih kerja sama dan tanggung jawab.","Coba cari tahu kegiatan yang sesuai minatmu."],["hobi musik","Aku suka mendengarkan musik saat waktu istirahat.","Kamu bisa memainkan alat musik?","Musik bikin suasana latihan jadi lebih semangat.","Siapa tahu nanti kita bisa tampil di acara sekolah."],["suka kuliner","Aku penasaran menu apa yang ada di kantin hari ini.","Kamu suka makanan pedas?","Wah, pilihan makanan di kantin memang beragam.","Jangan lupa antre dan menjaga kebersihan."],["calon programmer","Aku sedang mencoba membuat program sederhana.","Kamu tertarik belajar coding?","Mulai dari program kecil dulu, nanti makin terbiasa.","Kalau ada error, teliti baris kodenya satu per satu."],["suka fotografi","Aku sedang mencari sudut kampus yang bagus untuk foto.","Kamu suka memotret pemandangan atau teman?","Cahaya yang bagus bisa membuat foto lebih menarik.","Tetap minta izin sebelum memotret orang lain."],["hobi otomotif","Aku senang belajar tentang mesin dan kendaraan.","Kamu tertarik dunia otomotif?","Memahami cara kerja mesin itu menarik.","Praktik harus tetap memperhatikan keselamatan."],["suka menggambar","Aku sedang membuat sketsa gedung sekolah.","Kamu suka menggambar juga?","Ide sederhana bisa jadi karya yang bagus.","Terus latihan dan jangan takut mencoba gaya baru."],["suka sains","Aku baru membaca fakta menarik tentang alam.","Pelajaran sains apa yang paling kamu suka?","Rasa ingin tahu adalah awal dari pengetahuan.","Coba amati hal-hal kecil di sekitar sekolah."],["suka bahasa","Aku sedang menghafal kosakata bahasa Inggris.","Kamu sedang belajar bahasa apa?","Belajar sedikit demi sedikit lebih mudah diingat.","Coba praktikkan dengan teman saat ada kesempatan."],["suka bahari","Aku tertarik dengan dunia kelautan.","Kamu pernah belajar tentang navigasi?","Laut menyimpan banyak hal menarik untuk dipelajari.","Pengetahuan dan kedisiplinan penting di bidang bahari."],["suka memasak","Aku sedang mencari ide resep baru.","Kamu lebih suka masakan manis atau gurih?","Memasak perlu ketelitian dan kreativitas.","Selalu jaga kebersihan alat dan bahan."],["suka desain","Aku sedang membuat desain poster kegiatan.","Kamu suka desain yang simpel atau ramai?","Warna dan tata letak bisa menyampaikan pesan.","Terus eksplorasi ide desainmu."],["suka tanaman","Aku sedang memperhatikan tanaman di taman sekolah.","Kamu suka merawat tanaman?","Lingkungan hijau membuat sekolah terasa nyaman.","Yuk, sama-sama menjaga taman sekolah."],["suka matematika","Aku sedang mengerjakan soal hitungan.","Kamu suka tantangan matematika?","Kalau bingung, pecah soal menjadi langkah kecil.","Latihan rutin bikin kita makin terbiasa."],["suka sejarah","Aku sedang mencari cerita tentang sejarah sekolah.","Kamu suka mendengar cerita masa lalu?","Sejarah membantu kita menghargai perjalanan suatu tempat.","Tanya guru atau senior untuk cerita lainnya."],["suka persahabatan","Aku senang kalau teman-teman saling membantu.","Menurutmu apa yang membuat kelas kompak?","Saling menghargai membuat suasana belajar lebih baik.","Mulai dari hal kecil seperti menyapa teman."],["suka lingkungan","Aku ingin mengajak teman menjaga kebersihan kampus.","Kamu biasanya memilah sampah?","Kebiasaan kecil bisa membuat lingkungan lebih bersih.","Ayo buang sampah pada tempatnya."]][index],baseX:x,baseZ:z,phase:index*1.7,range:2.2,speed:.45+index*.035,activity:index%5,stopPhase:(index*.83)%4.5,walkCycle:0});
}
[
  [-23,-7], [20,-12], [-22,13], [18,23], [34,18],
  [-30,42], [-42,32], [-40,12], [-34,-8], [-30,-28],
  [-18,-27], [-5,-27], [12,-27], [29,-29], [40,-8],
  [43,12], [42,34], [25,40], [8,43], [-22,40]
].forEach(([x,z],i)=>createNpcStudent(i,x,z));

// Regu marching band Gita Bahari yang berlatih rutin di lapangan upacara.
const marchingBand=[];
const bandUniform=0x174b78, bandGold=0xd4af37, bandWhite=0xf2f2ed;
function bandPart(parent,geometry,color,x,y,z){
  const mesh=new THREE.Mesh(geometry,mat(color));
  mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function createBandMember(index,x,z,instrument){
  const group=new THREE.Group();
  const body=new THREE.Group();group.add(body);
  bandPart(body,new THREE.BoxGeometry(.7,.82,.38),bandUniform,0,1.25,0);
  bandPart(body,new THREE.BoxGeometry(.5,.52,.5),0xd9a47b,0,1.92,0);
  bandPart(body,new THREE.BoxGeometry(.56,.16,.56),0x20252a,0,2.19,0);
  bandPart(body,new THREE.BoxGeometry(.3,.08,.08),bandGold,0,1.68,-.22);
  const legs=[];
  for(const side of [-1,1]){
    const leg=new THREE.Group();leg.position.set(side*.22,.82,0);body.add(leg);
    bandPart(leg,new THREE.BoxGeometry(.28,.68,.3),bandUniform,0,-.28,0);
    bandPart(leg,new THREE.BoxGeometry(.34,.18,.48),0x20252a,0,-.66,-.04);
    legs.push(leg);
  }
  const arms=[];
  for(const side of [-1,1]){
    const arm=new THREE.Group();arm.position.set(side*.43,1.58,0);body.add(arm);
    bandPart(arm,new THREE.BoxGeometry(.22,.68,.24),bandUniform,0,-.3,0);
    bandPart(arm,new THREE.BoxGeometry(.2,.18,.22),0xd9a47b,0,-.68,0);
    arms.push(arm);
  }
  let prop;
  if(instrument==="snare"||instrument==="bass"){
    const radius=instrument==="bass"?.58:.38;
    prop=new THREE.Group();body.add(prop);
    const drum=bandPart(prop,new THREE.CylinderGeometry(radius,radius,.22,20),bandWhite,0,0,0);
    drum.rotation.x=Math.PI/2;
    const rim=bandPart(prop,new THREE.TorusGeometry(radius,.045,8,24),bandGold,0,0,-.13);
    rim.rotation.x=Math.PI/2;
    prop.position.set(0,1.25,-.48);
    if(instrument==="bass") prop.scale.set(1.12,1.12,1.12);
  }else if(instrument==="trumpet"){
    prop=new THREE.Group();body.add(prop);
    const tube=bandPart(prop,new THREE.CylinderGeometry(.055,.055,.9,10),bandGold,0,0,0);
    tube.rotation.x=Math.PI/2;
    const bell=bandPart(prop,new THREE.CylinderGeometry(.07,.27,.34,16),bandGold,0,0,-.57);
    bell.rotation.x=Math.PI/2;
    for(let n=0;n<3;n++) bandPart(prop,new THREE.CylinderGeometry(.035,.035,.16,8),bandWhite,-.13+n*.13,.1,-.03);
    prop.position.set(0,1.55,-.48);
  }else if(instrument==="bellyra"){
    prop=new THREE.Group();body.add(prop);
    bandPart(prop,new THREE.BoxGeometry(1.02,.12,.52),0x263746,0,0,0);
    bandPart(prop,new THREE.BoxGeometry(1.08,.07,.58),bandGold,0,-.08,0);
    const notes=[0xf2cf72,0xdceaf2,0x8fc7d8,0xe58b78,0xa6cf9b,0xc5a6d8,0xf2cf72,0xdceaf2];
    for(let n=0;n<8;n++) bandPart(prop,new THREE.BoxGeometry(.09,.055,.42),notes[n],-.39+n*.112,.1,0);
    prop.position.set(0,1.18,-.5);
  }else if(instrument==="quarto"){
    prop=new THREE.Group();body.add(prop);
    for(let n=0;n<4;n++){
      const x=-.42+(n%2)*.84, z=-.18+Math.floor(n/2)*.36;
      const drum=bandPart(prop,new THREE.CylinderGeometry(.2,.2,.18,16),bandWhite,x,0,z);
      drum.rotation.x=Math.PI/2;
      const rim=bandPart(prop,new THREE.TorusGeometry(.2,.025,6,18),bandGold,x,0,z-.1);
      rim.rotation.x=Math.PI/2;
    }
    prop.position.set(0,1.2,-.52);
  }else if(instrument==="cymbal"){
    prop=new THREE.Group();body.add(prop);
    for(const side of [-1,1]){
      const cymbal=bandPart(prop,new THREE.CylinderGeometry(.035,.3,.055,24),bandGold,side*.3,0,0);
      cymbal.rotation.x=Math.PI/2;
      bandPart(prop,new THREE.SphereGeometry(.07,10,8),0x263746,side*.3,0,-.06);
    }
    prop.position.set(0,1.42,-.5);
  }else if(instrument==="conductor"){
    prop=new THREE.Group();body.add(prop);
    bandPart(prop,new THREE.CylinderGeometry(.025,.025,.82,8),bandWhite,0,0,0);
    prop.rotation.z=-.45;
    prop.position.set(.48,1.58,-.35);
  }else if(instrument==="mayoret"){
    prop=new THREE.Group();body.add(prop);
    bandPart(prop,new THREE.CylinderGeometry(.025,.035,.92,10),bandGold,0,0,0);
    bandPart(prop,new THREE.SphereGeometry(.09,12,10),0xf5d36b,0,.49,0);
    bandPart(prop,new THREE.SphereGeometry(.07,12,10),0xf5d36b,0,-.49,0);
    prop.position.set(.48,1.55,-.32);
  }else if(instrument==="colourguard"){
    prop=new THREE.Group();body.add(prop);
    bandPart(prop,new THREE.CylinderGeometry(.025,.025,1.85,8),bandGold,0,0,0);
    const fabric=bandPart(prop,new THREE.PlaneGeometry(.95,.62),0xc52e54,.48,.48,0);
    fabric.material.side=THREE.DoubleSide;
    bandPart(prop,new THREE.PlaneGeometry(.48,.62),0xf0c75e,.72,.48,.006).material.side=THREE.DoubleSide;
    prop.position.set(.5,1.65,-.35);
  }else if(instrument==="fieldcommander"){
    prop=new THREE.Group();body.add(prop);
    bandPart(prop,new THREE.CylinderGeometry(.09,.16,.34,12),0xd8e3e9,0,0,0);
    bandPart(prop,new THREE.CylinderGeometry(.16,.09,.12,12),bandGold,0,-.2,0);
    prop.rotation.x=Math.PI/2;
    prop.position.set(.45,1.55,-.42);
    bandPart(body,new THREE.BoxGeometry(.13,.78,.035),0xc52e54,.28,1.35,-.22).rotation.z=-.22;
  }else{
    prop=new THREE.Group();body.add(prop);
    bandPart(prop,new THREE.BoxGeometry(.12,.72,.12),bandGold,0,0,0);
    bandPart(prop,new THREE.SphereGeometry(.12,10,8),bandWhite,0,.42,0);
    prop.position.set(0,1.72,-.42);
  }
  group.position.set(x,0,z);
  // Semua anggota menghadap ke arah depan lapangan.
  group.rotation.y=0;
  scene.add(group);
  marchingBand.push({group,body,arms,legs,prop,instrument,phase:index*.72,index});
}
[
  // Formasi 9 barisan, sesuai urutan pasukan Gita Bahari.
  ...[[2,"fieldcommander"],[2,"mayoret"],[6,"trumpet"],[3,"bellyra"],[3,"snare"],[1,"quarto"],[2,"cymbal"],[5,"bass"],[8,"colourguard"]]
    .flatMap(([count,role],row)=>Array.from({length:count},(_,index)=>[
      7+(index-(count-1)/2)*1.45,
      -8+row*3.2,
      role
    ]))
].forEach(([x,z,instrument],i)=>createBandMember(i,x,z,instrument));
// Audio interaktif marching band: melodi demo orisinal dan bunyi tiap seksi.
let bandAudio=null, bandSongTimer=null, bandSongStep=0;
function getBandAudio(){
  if(!bandAudio) bandAudio=new (window.AudioContext||window.webkitAudioContext)();
  if(bandAudio.state==="suspended") bandAudio.resume();
  return bandAudio;
}
function bandTone(freq,duration=.18,wave="triangle",volume=.12,delay=0){
  const ctx=getBandAudio(), osc=ctx.createOscillator(), gain=ctx.createGain(), start=ctx.currentTime+delay;
  osc.type=wave;osc.frequency.setValueAtTime(freq,start);
  gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(volume,start+.012);
  gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  osc.connect(gain);gain.connect(ctx.destination);osc.start(start);osc.stop(start+duration+.025);
}
function bandDrum(kind,delay=0){
  const ctx=getBandAudio(), start=ctx.currentTime+delay;
  if(kind==="cymbal"){
    const length=Math.floor(ctx.sampleRate*.55), buffer=ctx.createBuffer(1,length,ctx.sampleRate), data=buffer.getChannelData(0);
    for(let i=0;i<length;i++) data[i]=(Math.random()*2-1)*(1-i/length);
    const src=ctx.createBufferSource(), filter=ctx.createBiquadFilter(), gain=ctx.createGain();
    src.buffer=buffer;filter.type="highpass";filter.frequency.value=4500;
    gain.gain.setValueAtTime(.18,start);gain.gain.exponentialRampToValueAtTime(.001,start+.5);
    src.connect(filter);filter.connect(gain);gain.connect(ctx.destination);src.start(start);return;
  }
  const osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.type="sine";osc.frequency.setValueAtTime(kind==="bass"?95:kind==="quarto"?145:kind==="snare"?190:240,start);
  osc.frequency.exponentialRampToValueAtTime(45,start+.13);
  gain.gain.setValueAtTime(kind==="bass"?.32:.18,start);gain.gain.exponentialRampToValueAtTime(.001,start+.18);
  osc.connect(gain);gain.connect(ctx.destination);osc.start(start);osc.stop(start+.2);
  if(kind==="snare"){
    const length=Math.floor(ctx.sampleRate*.12),buffer=ctx.createBuffer(1,length,ctx.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);
    const src=ctx.createBufferSource(),g=ctx.createGain();src.buffer=buffer;g.gain.setValueAtTime(.12,start);g.gain.exponentialRampToValueAtTime(.001,start+.12);src.connect(g);g.connect(ctx.destination);src.start(start);
  }
}
function playBandPart(kind){
  if(kind==="trumpet"){[523.25,659.25,783.99].forEach((n,i)=>bandTone(n,.22,"sawtooth",.08,i*.09));}
  else if(kind==="bellyra"){[659.25,783.99,987.77].forEach((n,i)=>bandTone(n,.32,"sine",.12,i*.1));}
  else if(["snare","bass","quarto","cymbal"].includes(kind))bandDrum(kind);
  else if(kind==="mayoret")bandTone(1500,.16,"sine",.08);
  else if(kind==="fieldcommander"){bandTone(440,.18,"square",.06);bandTone(660,.22,"square",.06,.2);}
  else if(kind==="colourguard")bandTone(880,.12,"sine",.045);
}
const songNotes=[659,659,784,880,784,659,523,587,659,784,659,587,523,587,659,523];
const songDrums=["bass","snare","bass","snare","bass","snare","quarto","snare"];
function stopBandSong(){
  if(bandSongTimer){clearInterval(bandSongTimer);bandSongTimer=null;}
  bandSongStep=0;
  if(bandSongStatus)bandSongStatus.textContent="Siap memainkan lagu latihan";
}
function startBandSong(){
  stopBandSong();getBandAudio();
  bandSongStatus.textContent="♫ Memainkan Lagu Latihan Gita Bahari";
  const beatMs=360;
  bandSongTimer=setInterval(()=>{
    const step=bandSongStep++;
    if(step>=songNotes.length*2){stopBandSong();return;}
    const note=songNotes[Math.floor(step/2)];
    if(step%2===0){
      bandTone(note,.29,"sawtooth",.075);
      bandTone(note/2,.31,"triangle",.07);
      if(step%4===0)bandTone(note*1.5,.18,"sine",.035);
    }
    bandDrum(songDrums[step%songDrums.length]);
    if(step%4===0)bandDrum("cymbal");
  },beatMs);
}
const bandControl=document.createElement("section");
bandControl.style.cssText="display:none;position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:30;width:min(430px,calc(100vw - 28px));padding:12px;border:1px solid #d4af37;border-radius:15px;background:rgba(9,27,42,.96);color:#fff;text-align:center;font:13px Arial,sans-serif;box-shadow:0 8px 28px #0007";
const bandControlTitle=document.createElement("strong");bandControlTitle.textContent="🎺 GITA BAHARI · AUDIO INTERAKTIF";
bandControlTitle.style.cssText="display:block;color:#f2cf72;margin-bottom:8px";
const bandSongStatus=document.createElement("div");bandSongStatus.textContent="Dekati lapangan untuk berinteraksi";
bandSongStatus.style.cssText="font-size:12px;margin-bottom:9px;color:#dceaf2";
const bandButtons=document.createElement("div");bandButtons.style.cssText="display:flex;gap:8px;justify-content:center;flex-wrap:wrap";
function bandButton(label,action){
 const button=document.createElement("button");button.type="button";button.textContent=label;
 button.style.cssText="border:0;border-radius:9px;padding:9px 13px;background:#d4af37;color:#102b43;font-weight:bold;cursor:pointer";
 button.addEventListener("click",action);bandButtons.append(button);
}
bandButton("▶ MAIN LAGU",startBandSong);
bandButton("■ BERHENTI",stopBandSong);
bandControl.append(bandControlTitle,bandSongStatus,bandButtons);document.body.append(bandControl);
function updateMarchingBand(now){
  const t=now*.001;
  for(const member of marchingBand){
    const beat=Math.sin(t*4.2+member.phase);
    member.body.position.y=Math.abs(beat)*.035;
    member.body.rotation.z=Math.sin(t*2.1+member.phase)*.025;
    // Gerakan kaki bergantian agar seluruh barisan tampak sedang berbaris di tempat.
    if(member.legs){
      member.legs[0].rotation.x=Math.sin(t*4.2+member.phase)*.42;
      member.legs[1].rotation.x=-Math.sin(t*4.2+member.phase)*.42;
    }
    if(member.instrument==="mayoret"){
      member.arms[0].rotation.x=-.85+Math.sin(t*5.2+member.phase)*.65;
      member.arms[1].rotation.x=-.65+Math.cos(t*5.2+member.phase)*.42;
      member.prop.rotation.z=-.35+Math.sin(t*5.2+member.phase)*.62;
    }else if(member.instrument==="colourguard"){
      member.arms[0].rotation.x=-.55+Math.sin(t*2.8+member.phase)*.48;
      member.arms[1].rotation.x=-.55+Math.cos(t*2.8+member.phase)*.48;
      member.prop.rotation.z=Math.sin(t*2.8+member.phase)*.58;
      member.prop.rotation.x=Math.cos(t*1.4+member.phase)*.22;
    }else if(member.instrument==="fieldcommander"){
      member.arms[0].rotation.x=-.75+Math.sin(t*3.2)*.28;
      member.arms[1].rotation.x=-.75+Math.cos(t*3.2)*.28;
      member.prop.rotation.y=Math.sin(t*1.6)*.08;
    }else if(member.instrument==="conductor"){
      member.arms[0].rotation.x=-.9+Math.sin(t*4.2)*.48;
      member.arms[1].rotation.x=-.9+Math.cos(t*4.2)*.48;
      member.arms[0].rotation.z=.25+Math.sin(t*4.2)*.16;
      member.arms[1].rotation.z=-.25-Math.sin(t*4.2)*.16;
      member.prop.rotation.z=-.45+Math.sin(t*4.2)*.32;
    }else if(member.instrument==="snare"||member.instrument==="bass"){
      member.arms[0].rotation.x=-.35+Math.max(0,beat)*.42;
      member.arms[1].rotation.x=-.35+Math.max(0,-beat)*.42;
    }else if(member.instrument==="trumpet"){
      member.arms[0].rotation.x=-.85+beat*.08;
      member.arms[1].rotation.x=-.85-beat*.08;
      member.prop.rotation.y=Math.sin(t*1.2+member.phase)*.035;
    }else if(member.instrument==="glockenspiel"){
      member.arms[0].rotation.x=-.72+Math.max(0,beat)*.58;
      member.arms[1].rotation.x=-.72+Math.max(0,-beat)*.58;
      member.arms[0].rotation.z=.12+Math.sin(t*4+member.phase)*.08;
      member.arms[1].rotation.z=-.12-Math.sin(t*4+member.phase)*.08;
    }else{
      member.arms[0].rotation.x=beat*.55;
      member.arms[1].rotation.x=-beat*.55;
    }
  }
}
function updateNpcStudents(now){
  for(const student of npcStudents){
    const t=now*.001*student.speed+student.phase;
    // Siklus aktivitas: berjalan, berhenti sejenak, lalu melanjutkan patroli.
    const cycle=(t+student.stopPhase)%8;
    const isResting=cycle>5.8;
    const activityOffset=student.activity===0?Math.sin(t*.55)*.45:student.activity===1?Math.cos(t*.42)*.35:0;
    const pace=isResting?0:1;
    const targetX=student.baseX+Math.sin(t)*student.range+activityOffset;
    const targetZ=student.baseZ+Math.cos(t*.7)*.8;
    const previousX=student.npc.position.x,previousZ=student.npc.position.z;
    if(pace){
      student.npc.position.x=targetX;
      student.npc.position.z=targetZ;
    }
    const dx=student.npc.position.x-previousX,dz=student.npc.position.z-previousZ;
    if(Math.hypot(dx,dz)>.001) student.npc.rotation.y=Math.atan2(dx,dz);
    const gait=pace?Math.sin(t*7):0;
    student.arms[0].rotation.x=gait*.42;
    student.arms[1].rotation.x=-gait*.42;
    if(student.legs){
      student.legs[0].rotation.x=gait*.48;
      student.legs[1].rotation.x=-gait*.48;
    }
    student.npc.position.y=isResting?Math.sin(now*.002+student.phase)*.025:Math.abs(gait)*.035;
    // Beberapa siswa sesekali menoleh dan melambaikan tangan saat berhenti.
    if(isResting && student.activity===2){
      student.arms[0].rotation.z=Math.sin(now*.003+student.phase)*.35;
      student.arms[1].rotation.z=0;
    }else{
      student.arms[0].rotation.z=0;
      student.arms[1].rotation.z=0;
    }
  }
}

const interactionPanel=document.createElement("div");
interactionPanel.id="interaction-panel";
interactionPanel.style.cssText="display:none;position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9;width:min(360px,calc(100vw - 32px));padding:14px 16px;border:1px solid #d4af37;border-radius:14px;background:rgba(9,27,42,.95);color:#fff;font:13px/1.5 Arial,sans-serif;box-shadow:0 6px 24px #0005;text-align:center;pointer-events:none";
document.body.appendChild(interactionPanel);
let nearbyPlace=null;
let nearbyNpc=null;
let nearbyBandMember=null;
let infoOpen=false;
function updateNearbyPlace(){
  nearbyPlace=null; nearbyNpc=null; nearbyBandMember=null;
  let bestNpc=3.8;
  for(const student of npcStudents){
    const distance=Math.hypot(player.position.x-student.npc.position.x,player.position.z-student.npc.position.z);
    if(distance<bestNpc){bestNpc=distance;nearbyNpc=student;}
  }
  let bestBand=4.2;
  for(const member of marchingBand){
    const distance=Math.hypot(player.position.x-member.group.position.x,player.position.z-member.group.position.z);
    if(distance<bestBand){bestBand=distance;nearbyBandMember=member;}
  }
  let bestPlace=5.2;
  for(const place of campusPlaces){
    const dx=player.position.x-place.x, dz=player.position.z-place.z;
    const edgeX=Math.max(0,Math.abs(dx)-place.w/2);
    const edgeZ=Math.max(0,Math.abs(dz)-place.d/2);
    const distance=Math.hypot(edgeX,edgeZ);
    if(distance<bestPlace){bestPlace=distance;nearbyPlace=place;}
  }
  if(nearbyNpc){
    interactionPanel.style.display="block";
    interactionPanel.style.pointerEvents="auto";
    if(infoOpen) showNpcDialogue(nearbyNpc);
    else {
      interactionPanel.replaceChildren();
      const heading=document.createElement("strong");
      heading.textContent=nearbyNpc.name+" · SISWA";
      heading.style.color="#e8bd58";
      const detail=document.createElement("div");detail.textContent="Dekati lalu tekan E atau tombol BICARA";
      const talk=document.createElement("button");talk.type="button";talk.textContent="BICARA";
      talk.style.cssText="margin-top:9px;padding:8px 18px;border:0;border-radius:8px;background:#e4bd58;color:#102b43;font-weight:bold";
      talk.addEventListener("click",()=>showNpcDialogue(nearbyNpc));
      interactionPanel.append(heading,detail,talk);
    }
  } else if(nearbyPlace){
    interactionPanel.style.pointerEvents="none";
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
  } else if(nearbyBandMember){
    interactionPanel.style.display="block";
    interactionPanel.style.pointerEvents="auto";
    interactionPanel.replaceChildren();
    const labels={fieldcommander:"FIELD COMMANDER",mayoret:"MAYORET",trumpet:"TRUMPET",bellyra:"BELLYRA",snare:"SNARE",quarto:"QUARTO / QUINTOM",cymbal:"CYMBAL",bass:"BASS DRUM",colourguard:"COLOUR GUARD"};
    const heading=document.createElement("strong");
    heading.textContent=labels[nearbyBandMember.instrument]||"MARCHING BAND";
    heading.style.color="#e8bd58";
    const detail=document.createElement("div");detail.textContent="Tekan tombol untuk mendengarkan instrumen";
    const play=document.createElement("button");play.type="button";play.textContent="▶ DENGARKAN";
    play.style.cssText="margin:8px 5px 0;padding:8px 14px;border:0;border-radius:8px;background:#e4bd58;color:#102b43;font-weight:bold";
    play.addEventListener("click",()=>playBandPart(nearbyBandMember.instrument));
    const song=document.createElement("button");song.type="button";song.textContent="♫ MAIN LAGU";
    song.style.cssText=play.style.cssText;
    song.addEventListener("click",startBandSong);
    interactionPanel.append(heading,detail,play,song);
  } else {
    infoOpen=false;
    interactionPanel.style.pointerEvents="none";
    interactionPanel.style.display="none";
  }
}
function showNpcDialogue(student){
  infoOpen=true;
  interactionPanel.style.display="block";
  interactionPanel.style.pointerEvents="auto";
  const profile=student.profile;
  let npcLine="Halo! Aku "+student.name+". Aku "+profile[0]+". "+profile[1];
  let replyLine="";
  let stage="choose";
  function render(){
    interactionPanel.replaceChildren();
    const heading=document.createElement("strong");
    heading.textContent=student.name+" · SISWA";
    heading.style.cssText="display:block;color:#e8bd58;font-size:15px;margin-bottom:8px";
    const detail=document.createElement("div");
    detail.textContent=npcLine;
    detail.style.cssText="margin-bottom:10px;line-height:1.55";
    interactionPanel.append(heading,detail);
    if(stage==="choose"){
      const choices=[
        {label:"Wah, menarik! Ceritakan lagi.",reply:profile[2]},
        {label:"Aku juga tertarik dengan itu.",reply:profile[3]},
        {label:"Ada saran untuk siswa baru?",reply:profile[4]}
      ];
      choices.forEach(choice=>{
        const button=document.createElement("button");
        button.type="button";button.textContent=choice.label;
        button.style.cssText="display:block;position:relative;z-index:2;pointer-events:auto;width:100%;margin:7px 0;padding:11px 12px;border:1px solid #d4af37;border-radius:9px;background:#24516b;color:#fff;font-weight:bold;cursor:pointer;touch-action:manipulation";
        button.addEventListener("click",()=>{
          replyLine=choice.reply;
          npcLine=student.name+": "+replyLine;
          stage="reply";
          render();
        });
        interactionPanel.append(button);
      });
    }else{
      const follow=document.createElement("div");
      follow.textContent="Kamu: Senang bisa ngobrol denganmu!";
      follow.style.cssText="margin:8px 0;padding:9px;border-radius:8px;background:#183b54;color:#dceaf2";
      interactionPanel.append(follow);
      const answer=document.createElement("div");
      answer.textContent=student.name+": "+(profile[0]==="suka persahabatan"?"Sama-sama! Semoga kita bisa berteman.":"Terima kasih sudah ngobrol! Semangat menjalani hari di sekolah, ya.");
      answer.style.cssText="margin:8px 0;padding:9px;border-radius:8px;background:#284b3b;color:#fff";
      interactionPanel.append(answer);
      const again=document.createElement("button");
      again.type="button";again.textContent="TANYA LAGI";
      again.style.cssText="display:block;width:100%;margin-top:8px;padding:10px;border:1px solid #d4af37;border-radius:8px;background:#24516b;color:white;font-weight:bold;cursor:pointer;pointer-events:auto";
      again.addEventListener("click",()=>{npcLine="Oh, ada lagi yang ingin kamu tanyakan?";stage="choose";render();});
      interactionPanel.append(again);
    }
    const close=document.createElement("button");
    close.type="button";close.textContent="SELESAI";
    close.style.cssText="margin-top:8px;padding:9px 20px;border:0;border-radius:8px;background:#e4bd58;color:#102b43;font-weight:bold;cursor:pointer;pointer-events:auto";
    close.addEventListener("click",()=>{infoOpen=false;updateNearbyPlace();});
    interactionPanel.append(close);
  }
  render();
}
function blockedAt(x,z){
  const radius=.75;
  return campusPlaces.some(place => {
    const withinX=Math.abs(x-place.x)<place.w/2+radius;
    const withinZ=Math.abs(z-place.z)<place.d/2+radius;
    // Interior semua gedung dapat dimasuki; dinding fisik dan bukaan pintu mengatur akses.
    if(place.name!=="KOLAM RENANG" && place.name!=="KOLAM IKAN"){
      const insideX=Math.abs(x-place.x)<place.w/2-radius;
      const insideZ=Math.abs(z-place.z)<place.d/2-radius;
      if(insideX && insideZ) return false;
    }
    const atDoor=Math.abs(x-place.x)<(place.name==="GEDUNG UTAMA"?1.45:Math.min(1.05,place.w*.16))
      && z>=place.z+place.d/2-radius
      && z<=place.z+place.d/2+1.25;
    return withinX && withinZ && !atDoor;
  });
}
function moveWithCollision(dx,dz){
  const nextX=THREE.MathUtils.clamp(player.position.x+dx,-50,50);
  const nextZ=THREE.MathUtils.clamp(player.position.z+dz,-42,43);
  if(!blockedAt(nextX,player.position.z)) player.position.x=nextX;
  if(!blockedAt(player.position.x,nextZ)) player.position.z=nextZ;
}
// Ketinggian karakter mengikuti tangga Gedung Utama, sehingga pemain dapat
// berjalan naik dan turun secara alami tanpa tombol teleport lantai.
function updateBuildingElevation(){
  const x=-1, z=34, stairX=7.25;
  const localX=Math.abs(player.position.x-stairX);
  const stairStart=z+4.8, stairEnd=z-3.0;
  if(localX<1.18 && player.position.z<=stairStart && player.position.z>=stairEnd){
    const progress=THREE.MathUtils.clamp((stairStart-player.position.z)/(stairStart-stairEnd),0,1);
    player.position.y=progress*3.18;
    return;
  }
  const insideMain=Math.abs(player.position.x-x)<10.7
    && Math.abs(player.position.z-z)<5.7;
  if(insideMain && player.position.y>1.5) player.position.y=3.18;
  else if(insideMain) player.position.y=0;
  else player.position.y=0;
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
  // Seragam utama dengan detail saku, kancing, kerah, lis bahu, dan ikat pinggang.
  part(avatar,.82,.92,.42,cfg.shirt,0,1.35,0);
  part(avatar,.18,.12,.035,0xe4bd58,0,1.78,-.225);
  part(avatar,.13,.13,.035,0xe4bd58,-.25,1.48,-.225);
  const trim=0xe4bd58, dark=0x102b43;
  part(avatar,.22,.09,.035,trim,-.25,1.77,-.235);
  part(avatar,.22,.09,.035,trim,.25,1.77,-.235);
  part(avatar,.23,.2,.045,0x245b82,-.24,1.48,-.235);
  part(avatar,.23,.2,.045,0x245b82,.24,1.48,-.235);
  part(avatar,.25,.055,.025,trim,-.24,1.59,-.265);
  part(avatar,.25,.055,.025,trim,.24,1.59,-.265);
  for(let n=0;n<4;n++) part(avatar,.045,.045,.035,trim,.035,1.63-n*.17,-.24);
  part(avatar,.78,.11,.46,dark,0,.91,0);
  part(avatar,.18,.12,.045,trim,0,.91,-.245);
  // Kerah simetris dan panel depan seragam.
  part(avatar,.2,.16,.08,0xf0f1e9,-.13,1.78,-.22);
  part(avatar,.2,.16,.08,0xf0f1e9,.13,1.78,-.22);
  part(avatar,.035,.68,.025,0x315b79,0,1.34,-.222);
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
  part(avatar,.22,.035,.025,cfg.hair,-.14,2.25,-.33);
  part(avatar,.22,.035,.025,cfg.hair,.14,2.25,-.33);
  part(avatar,.12,.025,.025,0x754b3a,0,2.02,-.32);
  if(cfg.style==="hijab"){
    part(avatar,.7,.18,.68,0x243b52,0,1.88,.015);
    part(avatar,.12,.38,.16,0x243b52,-.25,1.95,-.22);
    part(avatar,.12,.38,.16,0x243b52,.25,1.95,-.22);
  } else {
    part(avatar,.66,.12,.66,cfg.hair,0,2.52,.02);
    part(avatar,.12,.28,.62,cfg.hair,-.28,2.38,0);
    part(avatar,.12,.28,.62,cfg.hair,.28,2.38,0);
  }
  leftArm=new THREE.Group(); leftArm.position.set(-.52,1.75,0); avatar.add(leftArm);
  part(leftArm,.28,.78,.3,cfg.shirt,0,-.35,0); part(leftArm,.25,.22,.26,cfg.skin,0,-.82,0);
  rightArm=new THREE.Group(); rightArm.position.set(.52,1.75,0); avatar.add(rightArm);
  part(rightArm,.28,.78,.3,cfg.shirt,0,-.35,0); part(rightArm,.25,.22,.26,cfg.skin,0,-.82,0);
  leftLeg=new THREE.Group(); leftLeg.position.set(-.22,.9,0); avatar.add(leftLeg);
  part(leftLeg,.32,.78,.34,cfg.pants,0,-.36,0);
  part(leftLeg,.34,.2,.5,0x20252a,0,-.82,-.07);
  part(leftLeg,.34,.06,.36,trim,0,-.73,-.025);
  rightLeg=new THREE.Group(); rightLeg.position.set(.22,.9,0); avatar.add(rightLeg);
  part(rightLeg,.32,.78,.34,cfg.pants,0,-.36,0);
  part(rightLeg,.34,.2,.5,0x20252a,0,-.82,-.07);
  part(rightLeg,.34,.06,.36,trim,0,-.73,-.025);
}
buildAvatar(selectedAvatarId);
// Spawn di jalur utama yang kosong, bukan di dalam LAB TKJ.
player.position.set(0,0,0);
player.visible=false;

// Input keyboard + tombol layar sentuh.
const keys = Object.create(null);
addEventListener("keydown",e=>{const key=e.key.toLowerCase();keys[key]=true;if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(key))e.preventDefault();if(key===" "&&!e.repeat)jumpUntil=performance.now()+420;},{passive:false});
addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
addEventListener("keydown",e=>{
  if(e.key.toLowerCase()!=="e" || e.repeat) return;
  if(nearbyNpc){
    if(infoOpen){infoOpen=false;updateNearbyPlace();}
    else showNpcDialogue(nearbyNpc);
  } else if(nearbyPlace){
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
// Tombol sentuh hanya ditampilkan pada perangkat HP/tablet; laptop memakai Shift dan Space.
const mobileControls=document.querySelector(".mobile-controls");
const touchDevice=window.matchMedia("(max-width: 900px) and (pointer: coarse)").matches;
if(!touchDevice) mobileControls.style.display="none";
document.querySelector("#jump").addEventListener("click",()=>{jumpUntil=performance.now()+420;});

// Gerakan karakter lebih halus: akselerasi, pengereman, dan putaran bertahap.
let last=0, walkPhase=0;
let walkStarted=false;
let campusFeatures = null;
const moveVelocity=new THREE.Vector3();
const desiredVelocity=new THREE.Vector3();
function animate(now) {
  requestAnimationFrame(animate);
  const waterTime=now*.001;
  for(const item of animatedWater){item.texture.offset.x=(waterTime*item.mesh.userData.flowSpeed)%1;item.texture.offset.y=(waterTime*item.mesh.userData.flowSpeed*.65)%1;}
  updateSkyByTime();
  updateNpcStudents(now);
  updateMarchingBand(now);
  const dt=Math.min((now-last)/1000,.05); last=now;
  if(!walkStarted){const t=now*0.00012;const aerial=new THREE.Vector3(Math.sin(t)*72,44,Math.cos(t)*72);camera.position.lerp(aerial,1-Math.exp(-1.3*dt));camera.lookAt(0,0,0);renderer.render(scene,camera);return;}

  const inputX=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0)+mobile.x;
  const inputZ=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0)+mobile.z;
  const mag=walkMode?Math.hypot(inputX,inputZ):0;
  const moving=mag>.08;

  if(moving){
    const nx=inputX/Math.max(1,mag), nz=inputZ/Math.max(1,mag);
    const worldX=nx*Math.cos(cameraYaw)-nz*Math.sin(cameraYaw);
    const worldZ=nx*Math.sin(cameraYaw)+nz*Math.cos(cameraYaw);
    const speed=(running||keys.shift)?10:6;
    desiredVelocity.set(worldX*speed,0,worldZ*speed);
  } else {
    desiredVelocity.set(0,0,0);
  }

  const response=moving?9:12;
  moveVelocity.lerp(desiredVelocity,1-Math.exp(-response*dt));
  moveWithCollision(moveVelocity.x*dt,moveVelocity.z*dt);
  updateBuildingElevation();

  const actualSpeed=Math.hypot(moveVelocity.x,moveVelocity.z);
  if(actualSpeed>.18){
    // Model menghadap sisi -Z, jadi arah hadap perlu dibalik 180 derajat.
    const targetYaw=Math.atan2(moveVelocity.x,moveVelocity.z)+Math.PI;
    const angleDelta=Math.atan2(Math.sin(targetYaw-player.rotation.y),Math.cos(targetYaw-player.rotation.y));
    player.rotation.y+=angleDelta*(1-Math.exp(-13*dt));
    walkPhase+=dt*((running||keys.shift)?11:8)*Math.min(1,actualSpeed/6);
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
    cameraTarget.set(player.position.x,player.position.y+1.25,player.position.z);
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
      bandControl.style.display="block";
      walkMode=true;moveVelocity.set(0,0,0);player.position.set(0,0,0);player.visible=true;intro.style.display="none";
      cameraYaw=0;cameraPitch=.22;cameraDistance=10;
      try { if(innerWidth<900 && screen.orientation?.lock) await screen.orientation.lock("landscape"); } catch(error) { console.info("Orientasi landscape dapat diaktifkan dari pengaturan HP."); }
    });
    campusFeatures = initCampusFeatures({ app, uid: auth.currentUser.uid, profile: data, player, scene, THREE, places: campusPlaces });
    document.querySelector('#start-walk').addEventListener('click',async()=>{try{if(innerWidth<=900&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();if(screen.orientation?.lock)await screen.orientation.lock('landscape');}catch(e){console.info('Landscape tidak didukung browser ini',e);}walkStarted=true;moveVelocity.set(0,0,0);player.position.set(0,0,0);player.visible=true;document.querySelector('#drone-intro').style.display='none';document.querySelector('.mobile-controls').style.display=touchDevice?'flex':'none';});
    requestAnimationFrame(animate);
  } catch(error) {
    console.error("Campus error:",error);
    alert(error.message || "Tidak dapat membuka kampus.");
    location.href="index.html";
  }
}
start();
