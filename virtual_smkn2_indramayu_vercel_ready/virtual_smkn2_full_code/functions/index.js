const {onCall,HttpsError}=require("firebase-functions/v2/https");
const {onDocumentUpdated}=require("firebase-functions/v2/firestore");
const admin=require("firebase-admin");
admin.initializeApp();
const db=admin.firestore();
const MAJORS={NKPI:2,APHPI:2,TKJ:3,RPL:2,TAB:3,KULINER:3,APAPL:1,TP:2};
const clean=s=>String(s||"").trim();
exports.registerPlayer=onCall(async request=>{
 if(!request.auth)throw new HttpsError("unauthenticated","Sesi pemain tidak ditemukan.");
 const uid=request.auth.uid, d=request.data||{};
 const fullName=clean(d.fullName),instagram=clean(d.instagram).replace(/^@/,""),grade=clean(d.grade),major=clean(d.major);
 if(fullName.length<3||fullName.length>70)throw new HttpsError("invalid-argument","Nama lengkap tidak valid.");
 if(!/^[A-Za-z0-9._]{2,30}$/.test(instagram))throw new HttpsError("invalid-argument","Username Instagram tidak valid.");
 if(!["X","XI","XII"].includes(grade)||!Object.hasOwn(MAJORS,major))throw new HttpsError("invalid-argument","Tingkat atau jurusan tidak valid.");
 if(d.followed!==true)throw new HttpsError("failed-precondition","Centang pernyataan sudah mengikuti akun sekolah.");
 const playerRef=db.collection("players").doc(uid);
 return await db.runTransaction(async tx=>{
  const existing=await tx.get(playerRef);
  if(existing.exists)throw new HttpsError("already-exists","Akun ini sudah pernah mendaftar. Jurusan tidak dapat diganti.");
  const classRefs=[];
  for(let n=1;n<=MAJORS[major];n++)classRefs.push(db.collection("classCounts").doc(`${grade}_${major}_${n}`));
  const snaps=[];for(const ref of classRefs)snaps.push(await tx.get(ref));
  let chosen=0,min=Number.MAX_SAFE_INTEGER;
  snaps.forEach((s,i)=>{const count=s.exists?(s.data().count||0):0;if(count<min){min=count;chosen=i+1}});
  const countRef=classRefs[chosen-1], old=snaps[chosen-1];
  tx.set(countRef,{grade,major,classNumber:chosen,count:(old.exists?(old.data().count||0):0)+1},{merge:true});
  tx.create(playerRef,{uid,fullName,instagram,grade,major,classNumber:chosen,status:"pending",followDeclaration:true,createdAt:admin.firestore.FieldValue.serverTimestamp()});
  return {status:"pending",className:`${grade} ${major} ${chosen}`};
 });
});
exports.getMyRegistration=onCall(async request=>{
 if(!request.auth)throw new HttpsError("unauthenticated","Tidak terautentikasi.");
 const snap=await db.collection("players").doc(request.auth.uid).get();
 if(!snap.exists)return {exists:false};
 return {exists:true,...snap.data()};
});