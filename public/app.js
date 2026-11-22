import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";
import { firebaseConfig } from "./firebase-config.js";

const majors = ["NKPI","APHPI","TKJ","RPL","TAB","KULINER","APAPL","TP"];
const majorSelect = document.querySelector("#major");
majors.forEach(m=>majorSelect.add(new Option(m,m)));
const msg = document.querySelector("#message");
const app = initializeApp(firebaseConfig), auth = getAuth(app), db = getFirestore(app), functions = getFunctions(app);
document.querySelector("#connection").textContent = "Layanan registrasi";
let currentUser = null;
const registerCall = httpsCallable(functions,"registerPlayer");
const refreshCall = httpsCallable(functions,"getMyRegistration");

onAuthStateChanged(auth, async user=>{
  if(user){currentUser=user; await loadStatus();}
  else {try{await signInAnonymously(auth)}catch(e){showMessage("Gagal terhubung ke layanan. Periksa konfigurasi Firebase.",true)}}
});

document.querySelector("#registration").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!currentUser){showMessage("Menyiapkan sesi pemain, coba lagi sebentar.",true);return}
  const btn=document.querySelector("#submitBtn");btn.disabled=true;btn.textContent="Mengirim...";
  try{
    const data={
      fullName:document.querySelector("#fullName").value.trim(),
      instagram:document.querySelector("#instagram").value.trim().replace(/^@/,""),
      followed:document.querySelector("#followed").checked,
      grade:document.querySelector("#grade").value,
      major:document.querySelector("#major").value
    };
    const result=await registerCall(data);
    showMessage(`Registrasi dikirim. Nomor kelas sementara: ${result.data.className}. Menunggu persetujuan admin.`,false);
    await loadStatus();
  }catch(err){showMessage(err.message||"Registrasi gagal. Periksa data dan coba lagi.",true)}
  finally{btn.disabled=false;btn.textContent="Kirim registrasi"}
});
document.querySelector("#refreshBtn").addEventListener("click",loadStatus);

async function loadStatus(){
 if(!currentUser)return;
 try{
  const snap=await getDoc(doc(db,"players",currentUser.uid));
  if(!snap.exists())return;
  const p=snap.data();
  document.querySelector("#registerPanel").classList.add("hidden");
  if(p.status==="approved"){
   document.querySelector("#campusPanel").classList.remove("hidden");
   document.querySelector("#statusPanel").classList.add("hidden");
   document.querySelector("#playerSummary").textContent=`${p.fullName} · ${p.grade} ${p.major} ${p.classNumber}`;
  }else{
   document.querySelector("#statusPanel").classList.remove("hidden");
   document.querySelector("#statusContent").innerHTML=`<div class="status"><b class="${p.status}">${statusLabel(p.status)}</b><br>Nama: ${escapeHtml(p.fullName)}<br>Instagram: @${escapeHtml(p.instagram)}<br>Kelas: ${p.grade} ${p.major} ${p.classNumber}<br><small>Admin akan memeriksa username secara manual. Tidak ada unggah bukti follow.</small></div>`;
  }
 }catch(e){showMessage("Tidak dapat mengambil status akun.",true)}
}
function statusLabel(s){return s==="pending"?"Menunggu pemeriksaan admin":s==="rejected"?"Registrasi ditolak":"Status: "+s}
function showMessage(t,bad){msg.textContent=t;msg.style.color=bad?"#ff9b9b":"#8de0ad"}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
