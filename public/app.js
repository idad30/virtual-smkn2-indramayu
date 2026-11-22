import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const majors = { NKPI:2, APHPI:2, TKJ:3, RPL:2, TAB:3, KULINER:3, APAPL:1, TP:2 };
const msg = document.querySelector("#message");
const majorSelect = document.querySelector("#major");
const connection = document.querySelector("#connection");
let currentUser = null;
let signingIn = false;

if (majorSelect && majorSelect.options.length <= 1) {
  Object.keys(majors).forEach(major => majorSelect.add(new Option(major, major)));
}

function chooseClass(uid, major) {
  let hash = 0;
  for (let i=0;i<uid.length;i++) hash=(hash*31+uid.charCodeAt(i))>>>0;
  return (hash % majors[major]) + 1;
}

onAuthStateChanged(auth, async user => {
  if (user) {
    currentUser = user;
    connection.textContent = "Terhubung";
    await loadStatus();
  } else {
    currentUser = null;
    connection.textContent = "Menghubungkan...";
    if (!signingIn) {
      signingIn = true;
      try { await signInAnonymously(auth); }
      catch (error) {
        console.error(error);
        connection.textContent = "Tidak terhubung";
        showMessage("Gagal terhubung ke Firebase. Periksa konfigurasi dan Anonymous Authentication.", true);
      } finally { signingIn = false; }
    }
  }
});

document.querySelector("#registration").addEventListener("submit", async e => {
  e.preventDefault();
  if (!currentUser) {
    showMessage("Menyiapkan sesi pemain. Coba lagi sebentar.", true);
    return;
  }
  const btn=document.querySelector("#submitBtn");
  btn.disabled=true; btn.textContent="Membuat akun...";
  try {
    const data={
      fullName:document.querySelector("#fullName").value.trim(),
      instagram:document.querySelector("#instagram").value.trim().replace(/^@/,""),
      gender:document.querySelector("#gender").value,
      followed:document.querySelector("#followed").checked,
      grade:document.querySelector("#grade").value,
      major:document.querySelector("#major").value
    };
    if(data.fullName.length<3||data.fullName.length>70) throw new Error("Nama harus terdiri dari 3 sampai 70 karakter.");
    if(!/^[A-Za-z0-9._]{2,30}$/.test(data.instagram)) throw new Error("Username Instagram tidak valid.");
    if(!["L","P"].includes(data.gender)) throw new Error("Silakan pilih jenis kelamin.");
    if(!["X","XI","XII"].includes(data.grade)) throw new Error("Silakan pilih tingkat kelas.");
    if(!Object.hasOwn(majors,data.major)) throw new Error("Silakan pilih jurusan.");
    if(!data.followed) throw new Error("Centang pernyataan mengikuti akun Instagram sekolah.");

    const playerRef=doc(db,"players",currentUser.uid);
    const existing=await getDoc(playerRef);
    if(existing.exists()) {
      await loadStatus();
      throw new Error("Akun ini sudah pernah melakukan registrasi.");
    }

    const classNumber=chooseClass(currentUser.uid,data.major);
    const schoolStatus=data.gender==="L"?"Taruna":"Taruni";
    await setDoc(playerRef,{
      uid:currentUser.uid,
      fullName:data.fullName,
      instagram:data.instagram,
      gender:data.gender,
      grade:data.grade,
      major:data.major,
      classNumber,
      status:"approved",
      schoolStatus,
      position:"Anggota",
      followDeclaration:true,
      createdAt:serverTimestamp()
    });

    showMessage("Registrasi berhasil! Akun langsung aktif sebagai "+schoolStatus+".",false);
    await loadStatus();
  } catch(error) {
    console.error("Registrasi gagal:",error);
    if(error.code==="permission-denied") showMessage("Akses ditolak oleh Firestore Rules. Perbarui aturan Firestore sesuai petunjuk pembaruan.",true);
    else showMessage(error.message||"Registrasi gagal. Silakan coba lagi.",true);
  } finally {
    btn.disabled=false;
    btn.textContent="Daftar & masuk";
  }
});

document.querySelector("#refreshBtn").addEventListener("click",loadStatus);

async function loadStatus() {
  if(!currentUser) return;
  try {
    const snap=await getDoc(doc(db,"players",currentUser.uid));
    if(!snap.exists()) return;
    const p=snap.data();
    document.querySelector("#registerPanel").classList.add("hidden");
    if(p.status==="approved") {
      document.querySelector("#campusPanel").classList.remove("hidden");
      document.querySelector("#statusPanel").classList.add("hidden");
      document.querySelector("#playerSummary").textContent=
        `${p.fullName} · ${p.schoolStatus|| (p.gender==="P"?"Taruni":"Taruna")} · ${p.grade} ${p.major} ${p.classNumber}`;
    } else {
      document.querySelector("#campusPanel").classList.add("hidden");
      document.querySelector("#statusPanel").classList.remove("hidden");
      document.querySelector("#statusContent").textContent="Akun belum aktif. Hubungi pengelola sekolah virtual.";
    }
  } catch(error) {
    console.error("Gagal membaca status:",error);
    showMessage("Tidak dapat mengambil status akun.",true);
  }
}
function showMessage(text,bad) {
  msg.textContent=text;
  msg.style.color=bad?"#ff9b9b":"#8de0ad";
}