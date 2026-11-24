import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const ADMIN_UID="7mQtL5NIu0RtN5UOWy8TLiWL5zP2";
const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getFirestore(app);
const $=selector=>document.querySelector(selector);
const notice=$("#notice");
let players=[];
let ready=false;

onAuthStateChanged(auth,async user=>{
  try{
    if(!user) user=(await signInAnonymously(auth)).user;
    if(user.uid!==ADMIN_UID){
      $("#adminIdentity").textContent="Akses ditolak";
      notice.textContent="Halaman ini khusus admin. Akun yang sedang digunakan bukan UID admin terdaftar.";
      $("#dashboard").classList.add("hidden");
      return;
    }
    $("#adminIdentity").textContent="ADMIN TEROTORISASI";
    ready=true;
    await loadPlayers();
  }catch(error){
    console.error(error);
    notice.textContent="Gagal memeriksa akses Firebase: "+(error.message||"kesalahan tidak diketahui");
  }
});

async function loadPlayers(){
  if(!ready)return;
  notice.textContent="Memuat data pemain...";
  try{
    const snap=await getDocs(collection(db,"players"));
    players=snap.docs.map(item=>({uid:item.id,...item.data()}));
    $("#dashboard").classList.remove("hidden");
    notice.textContent="Data berhasil dimuat. Total "+players.length+" pemain.";
    renderStats();renderRows();
  }catch(error){
    console.error(error);
    notice.textContent=error.code==="permission-denied"
      ?"Akses daftar pemain ditolak. Firebase Console perlu diperbarui dengan Firestore Rules Upgrade 12 dari repository."
      :"Gagal memuat data: "+(error.message||"kesalahan tidak diketahui");
  }
}
function renderStats(){
  $("#totalCount").textContent=players.length;
  $("#xCount").textContent=players.filter(p=>p.grade==="X").length;
  $("#xiCount").textContent=players.filter(p=>p.grade==="XI").length;
  $("#xiiCount").textContent=players.filter(p=>p.grade==="XII").length;
}
function cellInput(value,type="text",options=[]){
  const el=document.createElement(type==="select"?"select":"input");
  if(type==="select"){
    options.forEach(([label,val])=>el.add(new Option(label,val)));
    el.value=value??"";
  }else{el.value=value??"";el.maxLength=50;}
  return el;
}
function renderRows(){
  const body=$("#playerRows");body.replaceChildren();
  const q=$("#searchInput").value.trim().toLowerCase();
  const grade=$("#gradeFilter").value,status=$("#statusFilter").value;
  const filtered=players.filter(p=>(!grade||p.grade===grade)&&(!status||p.status===status)&&
    [p.fullName,p.instagram,p.major,p.position,p.grade].some(v=>String(v||"").toLowerCase().includes(q)));
  if(!filtered.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=7;td.textContent="Tidak ada data yang cocok.";tr.append(td);body.append(tr);return;}
  filtered.forEach(p=>{
    const tr=document.createElement("tr");
    const name=document.createElement("td"),strong=document.createElement("div"),sub=document.createElement("small");
    strong.className="name";strong.textContent=p.fullName||"Tanpa nama";sub.className="muted-small";sub.textContent="@"+(p.instagram||"-");name.append(strong,sub);
    const grade=cellInput(p.grade,"select",[["X","X"],["XI","XI"],["XII","XII"]]);
    const major=cellInput(p.major,"select",["NKPI","APHPI","TKJ","RPL","TAB","KULINER","APAPL","TP"].map(v=>[v,v]));
    const classNo=cellInput(p.classNumber,"select",Array.from({length:3},(_,i)=>[String(i+1),String(i+1)]));
    const position=cellInput(p.position||"Anggota");
    const status=cellInput(p.status,"select",[["Aktif","approved"],["Ditangguhkan","suspended"]]);
    const action=document.createElement("td"),save=document.createElement("button");save.className="save-row";save.textContent="SIMPAN";
    save.addEventListener("click",async()=>{
      const classNumber=Number(classNo.value);
      const max={NKPI:2,APHPI:2,TKJ:3,RPL:2,TAB:3,KULINER:3,APAPL:1,TP:2}[major.value];
      if(classNumber<1||classNumber>max){alert("Nomor kelas tidak sesuai dengan jurusan "+major.value+".");return;}
      if(!position.value.trim()||position.value.trim().length>50){alert("Jabatan harus 1–50 karakter.");return;}
      save.disabled=true;save.textContent="MENYIMPAN...";
      try{
        await updateDoc(doc(db,"players",p.uid),{grade:grade.value,major:major.value,classNumber,position:position.value.trim(),status:status.value});
        Object.assign(p,{grade:grade.value,major:major.value,classNumber,position:position.value.trim(),status:status.value});
        save.textContent="TERSIMPAN";renderStats();
        setTimeout(()=>{save.disabled=false;save.textContent="SIMPAN";},1100);
      }catch(error){
        console.error(error);save.disabled=false;save.textContent="SIMPAN";
        alert(error.code==="permission-denied"?"Firestore Rules belum mengizinkan perubahan admin. Perbarui Rules di Firebase Console.":"Gagal menyimpan: "+(error.message||"kesalahan"));
      }
    });
    action.append(save);
    [name,grade,major,classNo,position,status,action].forEach(td=>{const wrap=td;if(wrap===grade||wrap===major||wrap===classNo||wrap===position||wrap===status){const holder=document.createElement("td");holder.append(wrap);tr.append(holder);}else tr.append(wrap);});
    body.append(tr);
  });
}
$("#reloadBtn").addEventListener("click",loadPlayers);
["searchInput","gradeFilter","statusFilter"].forEach(id=>$("#"+id).addEventListener(id==="searchInput"?"input":"change",renderRows));
