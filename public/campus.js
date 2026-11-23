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
const ground = new THREE.Mesh(new THREE.PlaneGeometry(120,100),new THREE.MeshStandardMaterial({color:0x789b70,roughness:1}));
ground.rotation.x=-Math.PI/2;ground.position.y=-.06;ground.receiveShadow=true;scene.add(ground);
const pathMat=new THREE.MeshStandardMaterial({color:0xc8c1ad,roughness:1});
function path(x,z,w,d){const m=new THREE.Mesh(new THREE.BoxGeometry(w,.08,d),pathMat);m.position.set(x,.01,z);m.receiveShadow=true;scene.add(m);}
path(0,0,7,88);path(-2,0,88,6);path(26,0,5,80);path(-26,0,5,78);
const campusPlaces=[];
function building(name,x,z,w,d,color,info,height=3.2){
  const glass=new THREE.MeshStandardMaterial({color:0x8fc7d8,metalness:.15,roughness:.25});
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
  // Bangunan lain tetap memakai bentuk sederhana seperti sebelumnya.
  block(x,0,z,w,height,d,color);
  block(x,height,z,w+.45,.28,d+.45,0x34485a);
  block(x,0.12,z+d/2+.035,Math.min(w*.42,3.2),.16,.12,0xe8e2d5);
  const doorW=Math.min(1.8,w*.22), doorH=Math.min(2.45,height*.78);
  block(x,0,z+d/2+.085,doorW,doorH,.12,0x684a32);
  const windowW=Math.min(1.45,w*.18), windowH=Math.min(1.15,height*.34);
  const count=Math.max(1,Math.floor((w-doorW-1)/(windowW+.9)));
  for(let i=0;i<count;i++){
    const wx=x-(count-1)*(windowW+.9)/2+i*(windowW+.9);
    if(Math.abs(wx-x)<doorW*.8) continue;
    const pane=new THREE.Mesh(new THREE.BoxGeometry(windowW,windowH,.09),glass);
    pane.position.set(wx,Math.min(height*.62,2.15),z+d/2+.09);scene.add(pane);
    block(wx,Math.min(height*.62,2.15)-windowH/2-.08,z+d/2+.12,windowW+.12,.12,.18,0xe8e2d5);
  }
  block(x,height+.34,z+d/2+.13,Math.min(w*.55,4.2),.48,.12,0x18364b);
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
const field=new THREE.Mesh(new THREE.PlaneGeometry(14,32),new THREE.MeshStandardMaterial({color:0x579653,roughness:1}));
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
  const arms=[];
  for(const side of [-1,1]){
    const arm=new THREE.Group();arm.position.set(side*.45,1.58,0);body.add(arm);
    const limb=new THREE.Mesh(new THREE.BoxGeometry(.22,.65,.24),mat(look.shirt));
    limb.position.y=-.31;arm.add(limb);arms.push(arm);
    const leg=new THREE.Mesh(new THREE.BoxGeometry(.27,.72,.3),mat(look.pants));
    leg.position.set(side*.18,.38,0);body.add(leg);
  }
  npc.position.set(x,0,z);scene.add(npc);
  npcStudents.push({npc,arms,baseX:x,baseZ:z,phase:index*1.7,range:2.2,speed:.45+index*.07});
}
[
  [-23,-7], [20,-12], [-22,13], [18,23], [34,18],
  [-30,42], [-42,32], [-40,12], [-34,-8], [-30,-28],
  [-18,-27], [-5,-27], [12,-27], [29,-29], [40,-8],
  [43,12], [42,34], [25,40], [8,43], [-22,40]
].forEach(([x,z],i)=>createNpcStudent(i,x,z));
function updateNpcStudents(now){
  for(const student of npcStudents){
    const t=now*.001*student.speed+student.phase;
    student.npc.position.x=student.baseX+Math.sin(t)*student.range;
    student.npc.position.z=student.baseZ+Math.cos(t*.7)*.8;
    student.npc.rotation.y=Math.atan2(Math.cos(t)*student.range,-Math.sin(t*.7)*.56)+Math.PI;
    const swing=Math.sin(t*3)*.28;
    student.arms[0].rotation.x=swing;
    student.arms[1].rotation.x=-swing;
  }
}

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
  return campusPlaces.some(place => {
    const withinX=Math.abs(x-place.x)<place.w/2+radius;
    const withinZ=Math.abs(z-place.z)<place.d/2+radius;
    // Area dalam Gedung Utama boleh dilalui; dinding fisiknya membatasi sisi luar.
    if(place.name==="GEDUNG UTAMA"){
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
// Spawn di jalur utama yang kosong, bukan di dalam LAB TKJ.
player.position.set(0,0,0);
player.visible=false;

// Input keyboard + tombol layar sentuh.
const keys = Object.create(null);
addEventListener("keydown",e=>{const key=e.key.toLowerCase();keys[key]=true;if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(key))e.preventDefault();if(key===" "&&!e.repeat)jumpUntil=performance.now()+420;},{passive:false});
addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
addEventListener("keydown",e=>{
  if(e.key.toLowerCase()==="e" && !e.repeat && nearbyPlace){
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
  updateSkyByTime();
  updateNpcStudents(now);
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
