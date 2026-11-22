import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import {OrbitControls} from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getAuth,signInAnonymously} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {getFirestore,doc,getDoc} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {firebaseConfig} from "./firebase-config.js";
const fb=initializeApp(firebaseConfig), auth=getAuth(fb), db=getFirestore(fb);
try {
 const user=auth.currentUser || (await signInAnonymously(auth)).user;
 const player=await getDoc(doc(db,"players",user.uid));
 if(!player.exists() || player.data().status!=="approved"){
   alert("Akses kampus belum disetujui. Silakan selesaikan registrasi terlebih dahulu.");
   location.href="index.html";
   throw new Error("Akses belum disetujui");
 }
} catch(e) {
 if(e.message!=="Akses belum disetujui"){alert("Sesi login tidak ditemukan. Silakan registrasi/login kembali.");location.href="index.html";}
 throw e;
}
const scene=new THREE.Scene();scene.background=new THREE.Color(0x9bc8dc);scene.fog=new THREE.Fog(0x9bc8dc,75,150);
const camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,.1,250);camera.position.set(38,42,55);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;document.querySelector("#game").appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,0,0);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.48;
scene.add(new THREE.HemisphereLight(0xeaf7ff,0x61764d,2));const sun=new THREE.DirectionalLight(0xfff0d1,2);sun.position.set(-30,60,30);sun.castShadow=true;scene.add(sun);
const M=c=>new THREE.MeshStandardMaterial({color:c});
function block(x,y,z,w,h,d,color){let o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(color));o.position.set(x,y+h/2,z);o.castShadow=true;o.receiveShadow=true;scene.add(o);return o}
block(0,-.5,0,120,1,100,0x76a96b);block(0,.02,35,120,.08,10,0x555e65);block(0,.03,12,7,.1,70,0xb9b9ad);
function building(name,x,z,w,d,color=0xf1eee5){block(x,0,z,w,.5,d,0xb9b9ad);block(x,.5,z,w,3,d,color);block(x,3.5,z,w,.35,d,0x985444);for(let xx=x-w/2+1;xx<x+w/2;xx+=2.5)block(xx,1.4,z-d/2-.08,1,1,.12,0x8cc5d5);const c=document.createElement("canvas");c.width=512;c.height=100;const ctx=c.getContext("2d");ctx.fillStyle="#102b43";ctx.font="bold 36px Arial";ctx.textAlign="center";ctx.fillText(name,256,65);const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c)}));s.position.set(x,5,z);s.scale.set(10,2,1);scene.add(s)}
building("GEDUNG UTAMA",-17,-5,24,12);building("KANTIN",18,-5,13,9,0xe8d9b7);building("BARAK ESKUL",-30,-24,13,9);building("UKS",-12,-25,9,7);
const labs=[["LAB NKPI",-39,0],["LAB APHPI",-39,15],["LAB TKJ",-21,17],["LAB RPL",-3,17],["LAB TAB",15,-25],["LAB KULINER",33,-18],["LAB APAPL",36,1],["LAB TP",17,17]];
labs.forEach(([n,x,z])=>building(n,x,z,13,8,0xe6e9e5));
block(0,0,31,19,2.4,1.2,0x173b5a);block(0,2.1,31,15,.25,1.35,0xe4b84f);
const player=new THREE.Group();scene.add(player);let body=new THREE.Mesh(new THREE.CapsuleGeometry(.42,.9,4,8),M(0x1c4c78));body.position.y=1.1;player.add(body);let head=new THREE.Mesh(new THREE.SphereGeometry(.32,12,10),M(0xd9a47b));head.position.y=1.95;player.add(head);player.position.set(0,0,25);
const keys={};addEventListener("keydown",e=>keys[e.key.toLowerCase()]=true);addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
let last=0;function loop(t){requestAnimationFrame(loop);let dt=Math.min((t-last)/1000,.04);last=t;let x=0,z=0;if(keys.w||keys.arrowup)z--;if(keys.s||keys.arrowdown)z++;if(keys.a||keys.arrowleft)x--;if(keys.d||keys.arrowright)x++;let l=Math.hypot(x,z)||1;player.position.x+=x/l*9*dt;player.position.z+=z/l*9*dt;player.position.x=THREE.MathUtils.clamp(player.position.x,-48,48);player.position.z=THREE.MathUtils.clamp(player.position.z,-40,42);if(x||z)player.rotation.y=Math.atan2(x,z);controls.target.lerp(player.position,.025);controls.update();renderer.render(scene,camera)}requestAnimationFrame(loop);
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
