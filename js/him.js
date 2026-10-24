/* HIM APP — configuration (him.js)
   BY HIMANSHU

   >>> ONLY ONE THING TO EDIT: paste YOUR NEW Firebase Realtime Database details below. <<<
   Everything else (Telegram ID/token, ImgBB key, admin password) lives in Vercel
   Environment Variables — see SETUP.txt. No old database is used anywhere. */

const firebaseConfig = {
  apiKey: "AIzaSyB60IXgNau5An4wDZZovXhmdnXblm1cPGI",
  authDomain: "project-59fa7f7e-c480-4a5d-a49.firebaseapp.com",
  // Realtime Database URL: Firebase console > Build > Realtime Database > copy the URL shown at the top.
  // If yours is different from this default, replace it here.
  databaseURL: "https://project-59fa7f7e-c480-4a5d-a49-default-rtdb.firebaseio.com",
  projectId: "project-59fa7f7e-c480-4a5d-a49",
  storageBucket: "project-59fa7f7e-c480-4a5d-a49.firebasestorage.app",
  messagingSenderId: "156475198548",
  appId: "1:156475198548:web:dc43e5c39ce622b8e171c1"
};

/* ---------- Simple settings (this site runs on static hosting, e.g. GitHub Pages: no server, no env variables) ---------- */
const ADMIN_PASSWORD = "admin123";   // used only if the Vercel env ADMIN_PASSWORD is NOT set. CHANGE THIS.
const TELEGRAM_BOT_TOKEN = "";       // optional: Telegram bot token  (alerts for new chat / signup)
const TELEGRAM_CHAT_ID = "";         // optional: your Telegram chat id
const IMGBB_API_KEY = "";            // optional: ImgBB key (needed only for logo / banner / chat photo UPLOAD; links work without it)

const HIM_READY = !/PASTE_/.test(firebaseConfig.databaseURL);

// Watchdog: Firebase SDK (gstatic.com) load na ho / config set na ho to user ko saaf message dikhao.
(function () {
  function banner(msg, reload) {
    if (document.getElementById("himWarn") || !document.body) return;
    var b = document.createElement("div");
    b.id = "himWarn";
    b.setAttribute("style", "position:fixed;left:10px;right:10px;bottom:14px;max-width:480px;margin:0 auto;background:#1c2136;color:#fff;padding:14px 16px;border-radius:12px;font:600 13px/1.5 system-ui,sans-serif;z-index:9999;box-shadow:0 10px 30px rgba(0,0,0,.4)");
    b.innerHTML = msg + (reload ? '<br><button type="button" style="margin-top:8px;border:0;border-radius:8px;padding:8px 14px;font-weight:700;background:#7c5cff;color:#fff" onclick="location.reload()">🔄 Reload</button>' : "");
    document.body.appendChild(b);
  }
  window.addEventListener("load", function () {
    if (!HIM_READY) return banner("⚙️ Database not set yet. Open <b>him.js</b> and paste your new Firebase config.", false);
    setTimeout(function () {
      if (typeof firebase === "undefined") banner("⚠️ The app could not connect. Check your internet connection, or turn off any VPN / ad-blocker and try again.", true);
    }, 6000);
  });
})();

// Firebase starts on DOMContentLoaded (before every page script, because this file is loaded first).
// testDb is kept as an alias of db so chat/admin code works with the single new database.
let db = null, testDb = null;
function initFirebase() {
  try {
    if (!HIM_READY || typeof firebase === "undefined") return;
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    testDb = db;
  } catch (e) { console.warn("Firebase init failed:", e); }
}
document.addEventListener("DOMContentLoaded", initFirebase);

const APP_NAME = "HIM APP";
const APP_BY = "BY HIMANSHU";
const APP_LOGO = "icons/icon-192.png";
const LOGO_SM = "icons/logo-96.png";
const TELEGRAM_URL = "https://t.me/skgnots";
const TELEGRAM_GROUP = TELEGRAM_URL;

/* Links: open in Chrome / the phone browser (never inside the app) */
window.openExternal = function (url) { window.open(url, "_blank", "noopener"); };
window.haptic = function (k) { try { if (navigator.vibrate) navigator.vibrate(k === "error" ? [20, 40, 20] : 8); } catch (e) {} };

function withTimeout(promise, ms=8000){
  return Promise.race([
    promise,
    new Promise((_,reject)=>setTimeout(()=>reject(new Error("Database request timed out")),ms))
  ]);
}

function getUserId(){
  let id=localStorage.getItem("him_user_id");
  if(!id){
    id=(crypto.randomUUID?crypto.randomUUID():"uid_"+Date.now()+"_"+Math.random().toString(36).slice(2));
    localStorage.setItem("him_user_id",id);
  }
  return id;
}
function getUserName(){ return localStorage.getItem("him_user_name")||""; }
function getUserLoginId(){ return localStorage.getItem("him_login_id")||""; }
const SESSION_DAYS=30;
function setSession(loginId,name){
  localStorage.setItem("him_login_id",loginId);
  localStorage.setItem("him_user_name",name||loginId);
  localStorage.setItem("him_logged_in","1");
  localStorage.setItem("him_login_at",String(Date.now()));
}
function logoutSession(){
  ["him_logged_in","him_login_id","him_user_name","him_password_hash","him_login_at"].forEach(k=>localStorage.removeItem(k));
  sessionStorage.removeItem("him_admin");sessionStorage.removeItem("him_admin_token");sessionStorage.removeItem("him_admin_exp");
}
function isLoggedIn(){
  if(localStorage.getItem("him_logged_in")!=="1"||!getUserName())return false;
  const at=+localStorage.getItem("him_login_at")||0;
  if(!at){localStorage.setItem("him_login_at",String(Date.now()));return true} // old sessions: start the 30-day clock now
  if(Date.now()-at>SESSION_DAYS*864e5){logoutSession();return false}
  return true;
}

/* ---------- password security ---------- */
// New accounts: salted PBKDF2-SHA256 (per-user random salt). Old SHA-256 accounts still log in and are upgraded automatically.
const PW_ITER=120000;
const b64e=buf=>btoa(String.fromCharCode(...new Uint8Array(buf)));
async function pbkdf2(pw,saltB64,iter){
  const salt=Uint8Array.from(atob(saltB64),c=>c.charCodeAt(0));
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(pw),"PBKDF2",false,["deriveBits"]);
  return b64e(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt,iterations:iter},key,256));
}
async function makePasswordRecord(pw){
  const salt=b64e(crypto.getRandomValues(new Uint8Array(16)));
  return {passwordHash:await pbkdf2(pw,salt,PW_ITER),salt,iter:PW_ITER,algo:"pbkdf2-sha256"};
}
function safeEq(a,b){a=String(a||"");b=String(b||"");let d=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)d|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return d===0}
async function checkPassword(pw,acc){
  if(acc&&acc.algo==="pbkdf2-sha256"&&acc.salt)return{ok:safeEq(await pbkdf2(pw,acc.salt,acc.iter||PW_ITER),acc.passwordHash),legacy:false};
  return{ok:safeEq(await hashPassword(pw),acc&&acc.passwordHash),legacy:true};
}
const COMMON_PW=["123456","1234567","12345678","123456789","password","qwerty","111111","000000","abc123","iloveyou","123123","password1","skeducation"];
/* User ID: anything is allowed (letters, digits, symbols, any language) except spaces. 4-24 characters. */
function idIssue(id){
  id=String(id==null?"":id);
  if(!id)return"Enter a User ID.";
  if(/\s/.test(id))return"User ID cannot contain spaces.";
  if(/[\u0000-\u001f\u007f]/.test(id))return"User ID contains an invalid character.";
  var n=[...id].length;
  if(n<4||n>24)return"User ID must be 4-24 characters.";
  return"";
}
function passwordIssue(pw,id,name){
  if(pw.length<4)return"Password must be at least 4 characters.";
  return"";
}
function passwordStrength(pw){let n=0;if(pw.length>=6)n++;if(pw.length>=10)n++;if(/[A-Z]/.test(pw)&&/[a-z]/.test(pw))n++;if(/\d/.test(pw))n++;if(/[^A-Za-z0-9]/.test(pw))n++;return Math.min(4,Math.max(pw?1:0,n-1))}

/* Login lockout (this device): 5 wrong tries on one ID, or 12 on the device -> wait, doubling each time */
function lockGet(n){try{return JSON.parse(localStorage.getItem("him_lk_"+n)||"{}")}catch(e){return{}}}
function lockLeft(names){return 0}            // lockouts switched off
function lockFail(n,limit){}
function lockClear(n){}
function fmtWait(sec){return sec>=60?Math.ceil(sec/60)+" minute":sec+" second"}

/* only http(s) links are ever opened / embedded (blocks javascript:, data:, etc.) */
function safeUrl(u){
  try{u=String(u||"").trim();if(u&&!/^[a-z][a-z0-9+.-]*:/i.test(u))u="https://"+u;const x=new URL(u);return(x.protocol==="https:"||x.protocol==="http:")?x.href:""}catch(e){return""}
}
function hostOf(u){try{return new URL(u).hostname.replace(/^www\./,"")}catch(e){return""}}

async function hashPassword(pw){
  const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(pw));
  return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
function accountKey(userId){
  return String(userId||"").trim().toLowerCase().replace(/[.#$/\[\]\s]/g,"_");
}
function accountsRef(userId){ return testDb.ref("accounts/"+accountKey(userId)); }

function esc(s){
  return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function toast(msg,type="ok",ms){
  let el=document.getElementById("toast");
  if(!el){el=document.createElement("div");el.id="toast";document.body.appendChild(el)}
  el.className="toast "+type;el.textContent=msg;el.classList.add("show");
  // error messages (long, important) stay on screen longer so the user can actually read them
  clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove("show"),ms||(type==="error"?8000:2800));
}
async function apiPost(url,body){
  try{
    const r=await fetch(url,{method:"POST",keepalive:true,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const j=await r.json().catch(()=>({}));
    return Object.assign({status:r.status},j);
  }catch(e){return {ok:false,status:0}}
}
// Signup/login fail hone par user ko asli wajah (slow network / permission) batane ke liye
function authFailMsg(err){
  const m=String(err&&err.message||err||"")+" "+String(err&&err.code||"");
  if(/timed out/i.test(m))return "⏳ The network or server is slow. Please try again in a little while.";
  if(/permission[_ ]denied/i.test(m))return "🔒 The server did not allow this. Ask the admin to create an ID and password for you.";
  if(!navigator.onLine)return "📵 No internet. Check your connection.";
  return "";
}
async function notifyTelegram(type,p){
  p=p||{};
  const sv=await apiPost("/api/telegram",Object.assign({type},p));if(sv&&sv.ok)return sv; // Vercel env first
  if(!TELEGRAM_BOT_TOKEN||!TELEGRAM_CHAT_ID)return {ok:false};
  try{
    const who=String(p.userName||"User").slice(0,100);
    const head="📱 HIM APP\n\n";
    let text;
    if(type==="photo"&&p.photoUrl){
      const f=new URLSearchParams({chat_id:TELEGRAM_CHAT_ID,photo:String(p.photoUrl),caption:head+"💬 New Photo\n👤 "+who});
      await fetch("https://api.telegram.org/bot"+TELEGRAM_BOT_TOKEN+"/sendPhoto",{method:"POST",body:f});return {ok:true};
    }
    if(type==="signup")text=head+"🆕 New signup\n👤 "+who+(p.loginId?"\n🆔 "+p.loginId:"");
    else if(type==="rating")text=head+"⭐ New rating: "+(p.stars||"")+"/5\n👤 "+who+(p.review?"\n\n"+String(p.review).slice(0,500):"");
    else text=head+"💬 New Message\n👤 "+who+"\n\n"+String(p.messageText||"").slice(0,3500);
    await fetch("https://api.telegram.org/bot"+TELEGRAM_BOT_TOKEN+"/sendMessage",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:TELEGRAM_CHAT_ID,text})});
    return {ok:true};
  }catch(e){return {ok:false}}
}
/* Image upload straight to ImgBB (needs IMGBB_API_KEY above) */
async function uploadImageFile(file){
  if(file.size<=4*1024*1024){ // Vercel env (IMGBB_API_KEY) first
    try{const r=await fetch("/api/upload-image",{method:"POST",headers:{"Content-Type":file.type||"application/octet-stream"},body:file});const j=await r.json().catch(()=>({}));if(r.ok&&j.ok&&j.url)return j.url;}catch(e){}
  }
  if(!IMGBB_API_KEY)throw new Error("Upload is off. Paste a logo/image LINK instead (or set IMGBB_API_KEY in him.js).");
  const fd=new FormData();fd.append("image",file);
  const r=await fetch("https://api.imgbb.com/1/upload?key="+encodeURIComponent(IMGBB_API_KEY),{method:"POST",body:fd});
  const j=await r.json().catch(()=>({}));
  const u=j&&j.data&&(j.data.display_url||j.data.url);
  if(!r.ok||!u)throw new Error((j&&j.error&&j.error.message)||"Image upload failed");
  return u;
}
/* Tells the user WHY the database is not answering (and finds the right databaseURL if the configured one is wrong) */
async function dbPing(base){
  try{
    const c=window.AbortController?new AbortController():null,t=setTimeout(()=>c&&c.abort(),5000);
    const r=await fetch(String(base).replace(/\/$/,"")+"/.json?shallow=true",c?{signal:c.signal}:{});clearTimeout(t);
    return r.status;
  }catch(e){return 0}
}
async function dbDiagnose(){
  const pid=firebaseConfig.projectId,cur=String(firebaseConfig.databaseURL).replace(/\/$/,"");
  const st=await dbPing(cur);
  if(st===401||st===403)return "🔒 Database rules are blocking this. Firebase console > Realtime Database > Rules: set {\".read\":true,\".write\":true} and click Publish.";
  if(st===200)return "⏳ Database is reachable but slow. Please try again.";
  // configured URL does not answer: try the other URLs Firebase uses (default US, Singapore, Europe)
  const alt=["https://"+pid+"-default-rtdb.asia-southeast1.firebasedatabase.app","https://"+pid+"-default-rtdb.europe-west1.firebasedatabase.app","https://"+pid+"-default-rtdb.firebaseio.com","https://"+pid+".firebaseio.com"].filter(u=>u!==cur);
  const res=await Promise.all(alt.map(async u=>[u,await dbPing(u)]));
  const hit=res.find(x=>x[1]===200||x[1]===401||x[1]===403);
  if(hit)return "🛠 Wrong databaseURL in him.js. Your database is at: "+hit[0]+" — paste this into databaseURL in him.js and redeploy."+((hit[1]===401||hit[1]===403)?" (Also set Rules to read/write true.)":"");
  if(st===404)return "❌ Realtime Database not created. Firebase console > Build > Realtime Database > Create Database (not Firestore!), then copy its URL into databaseURL in him.js.";
  if(st===0)return "❌ Cannot reach the database. Create a Realtime Database in Firebase (not Firestore), copy its URL into databaseURL in him.js, and check your internet.";
  return "❌ Database error ("+st+"). Check databaseURL in him.js.";
}
async function authFailMsgAsync(err){
  const m=String(err&&err.message||err||"");
  if(/timed out/i.test(m))return await dbDiagnose();
  return authFailMsg(err);
}
function isImageUrl(url){return /\.(png|jpe?g|gif|webp|bmp)(\?.*)?$/i.test(url||"")||/ibb\.co|imgbb\.com/i.test(url||"");}

function himYmd(d){const z=n=>String(n).padStart(2,"0");d=d||new Date();return d.getFullYear()+"-"+z(d.getMonth()+1)+"-"+z(d.getDate())}
async function registerUser(force){
  // Marks the user as "seen". Throttled: at most once per 10 min per device (and always once per new day).
  const today=himYmd(),last=+localStorage.getItem("him_reg_t")||0,dayDone=localStorage.getItem("him_day")===today;
  if(!force&&dayDone&&Date.now()-last<600000)return;
  if(!testDb)return;
  localStorage.setItem("him_reg_t",String(Date.now())); // set first so parallel calls don't double write
  try{
    const uid=getUserId(),name=getUserName(),loginId=getUserLoginId(),now=new Date().toISOString();
    const ref=testDb.ref("users/"+uid),upd={name,loginId,lastSeen:now};
    upd["days/"+today]=1; // daily activity log used by Admin > Daily Activity
    if(localStorage.getItem("him_first_done")!=="1"){
      const old=(await withTimeout(ref.once("value"))).val()||{};
      upd.userId=uid;upd.firstSeen=old.firstSeen||now;upd.blocked=old.blocked===true;
      await withTimeout(ref.update(upd));
      localStorage.setItem("him_first_done","1");
    }else await withTimeout(ref.update(upd));
    localStorage.setItem("him_day",today);
  }catch(e){localStorage.removeItem("him_reg_t");throw e}
}
async function isBlocked(){
  const uid=getUserId();
  const [a,b]=await Promise.all([
    withTimeout(testDb.ref("users/"+uid+"/blocked").once("value")),
    withTimeout(testDb.ref("blocked_users/"+uid).once("value"))
  ]);
  return a.val()===true||b.val()===true;
}
function watchBlocked(){
  const uid=getUserId();
  ["users/"+uid+"/blocked","blocked_users/"+uid].forEach(path=>{
    testDb.ref(path).on("value",s=>{
      if(s.val()===true){
        logoutSession();
        alert("🚫 The admin has blocked your account.");
        location.href="signup.html";
      }
    });
  });
}
function shareUrl(){return withTimeout(testDb.ref("settings/domain").once("value")).then(s=>s.val()||location.origin).catch(()=>location.origin);}

function themeInit(){
  const t=localStorage.getItem("him_theme")||(null)||"dark";
  document.documentElement.dataset.theme=t;
}
function toggleTheme(){
  const t=document.documentElement.dataset.theme==="dark"?"light":"dark";
  document.documentElement.dataset.theme=t;
  localStorage.setItem("him_theme",t);
  updateThemeButtons();
  if(window.tgSyncColors)window.tgSyncColors();
}
function updateThemeButtons(){
  document.querySelectorAll(".sk-theme-toggle").forEach(b=>{
    const light=document.documentElement.dataset.theme==="light";
    if(typeof icon==="function")b.innerHTML=icon(light?"moon":"sun",19);else b.textContent=light?"🌙":"☀️";
    b.title=light?"Dark mode":"Light mode";
    b.setAttribute("aria-label",b.title);
  });
}
document.addEventListener("DOMContentLoaded",themeInit);

/* Chat helpers shared by admin + user pages */
function isoMax(a,b){return (a||"")>(b||"")?a:b}
async function refreshChatMeta(chatRef){
  // After a message is deleted, keep the chat-list preview (last_message etc.) in sync.
  const snap=await chatRef.child("messages").once("value"),ms=Object.values(snap.val()||{});
  if(!ms.length)return chatRef.update({last_message:null,last_sender:null,last_timestamp:null});
  ms.sort((a,b)=>String(a.timestamp).localeCompare(String(b.timestamp)));
  const l=ms[ms.length-1];
  return chatRef.update({last_message:l.text||"Photo",last_sender:l.sender,last_timestamp:l.timestamp});
}
function timeAgoShort(iso){
  if(!iso)return "";
  const d=new Date(iso),now=new Date(),sec=(now-d)/1000;
  if(d.toDateString()===now.toDateString())return d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
  if(sec<172800)return "Yesterday";
  return d.toLocaleDateString([],{day:"numeric",month:"short"});
}


// Run non-critical work after the page has painted (keeps first load fast)
function idle(fn,timeout){ if(window.requestIdleCallback)requestIdleCallback(fn,{timeout:timeout||2500}); else setTimeout(fn,600); }
function stateHtml(title,text,btn){ return `<div class="state"><b>${esc(title)}</b>${esc(text||"")}${btn||""}</div>`; }
function retryBtn(){
  const why=(window.HIMData&&HIMData.lastError)?'<br><small style="opacity:.6;font-size:10.5px;word-break:break-all">'+esc(String(HIMData.lastError).slice(0,160))+'</small>':"";
  return why+'<br><button type="button" class="primary" onclick="try{HIMData.clear()}catch(e){}location.reload()">Try again</button>';
}
const SKELS={
  list:n=>'<div class="skel-list">'+'<div class="skel"></div>'.repeat(n||4)+'</div>',
  grid:n=>'<div class="skel-grid">'+'<div class="skel"></div>'.repeat(n||6)+'</div>',
  row:()=>'<div class="skel-row"><div class="skel"></div><div class="skel"></div></div>'
};


/* ---------- Favourite APKs (per user): local first, synced to favorites/<uid>/<apkId> ---------- */
function favKey(){ return "him_fav_"+getUserId(); }
function getFavs(){ try{ return JSON.parse(localStorage.getItem(favKey())||"[]"); }catch(e){ return []; } }
function setFavs(a){ try{ localStorage.setItem(favKey(),JSON.stringify(a)); }catch(e){} }
function isFav(id){ return getFavs().indexOf(String(id))>-1; }
function toggleFav(id){
  id=String(id);const f=getFavs(),i=f.indexOf(id);
  if(i>-1)f.splice(i,1);else f.push(id);
  setFavs(f);
  try{ if(testDb)testDb.ref("favorites/"+getUserId()+"/"+id).set(i>-1?null:true).catch(()=>{}); }catch(e){}
  return i===-1;
}
// Merge what the database has (other devices) into this device, once per page open.
function syncFavs(cb){
  try{
    if(!testDb)return;
    withTimeout(testDb.ref("favorites/"+getUserId()).once("value"),9000).then(s=>{
      const remote=Object.keys(s.val()||{}),local=getFavs(),all=Array.from(new Set(local.concat(remote)));
      if(all.length!==local.length){setFavs(all);if(cb)cb()}
      // push local-only favourites up
      local.filter(x=>remote.indexOf(x)<0).forEach(x=>testDb.ref("favorites/"+getUserId()+"/"+x).set(true).catch(()=>{}));
    }).catch(()=>{});
  }catch(e){}
}
function loadApks(onUpdate){ return HIMData.apks(onUpdate).catch(function(err){console.warn("APKs unavailable:",err);return []}); }

/* ---------- APK card + list helpers (shared by ALL APK and FAVOURITE APK) ---------- */
function apkCard(x){
  const url=safeUrl(x.url),ic=safeUrl(x.icon)||APP_LOGO,fav=isFav(x.id);
  return `<article class="acard${x.pin?" pinned":""}" data-id="${esc(x.id)}"><div class="a-top"><div class="a-ic"><img src="${esc(ic)}" loading="lazy" decoding="async" alt="" onerror="this.onerror=null;this.src='${APP_LOGO}';this.classList.add('fb')"></div><div class="a-info"><h3>${esc(x.name)}</h3><div class="a-meta"><span class="a-chip">MOD</span>${x.size?`<span class="a-chip g">${esc(x.size)}</span>`:""}${x.pin?'<span class="a-chip y">★ Featured</span>':""}</div></div><button type="button" class="a-fav${fav?" on":""}" data-fav="${esc(x.id)}" aria-label="Favourite" aria-pressed="${fav}">${icon("heart",20)}</button></div>${x.about?`<p class="a-about">${esc(x.about)}</p>${String(x.about).length>110?'<button type="button" class="a-more">Read more</button>':""}`:""}${url?`<a class="a-dl" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${icon("download",18)} Download</a>`:'<span class="a-dl dis">Link not available</span>'}</article>`;
}
function bindApkList(list){
  list.addEventListener("click",e=>{
    const f=e.target.closest(".a-fav");
    if(f){
      const on=toggleFav(f.dataset.fav);f.classList.toggle("on",on);f.setAttribute("aria-pressed",on);haptic("ok");
      toast(on?"Added to Favourite APK ❤️":"Removed from favourites");
      list.dispatchEvent(new CustomEvent("favchange",{detail:{id:f.dataset.fav,on}}));return;
    }
    const m=e.target.closest(".a-more");
    if(m){const p=m.previousElementSibling;p.classList.toggle("open");m.textContent=p.classList.contains("open")?"Show less":"Read more"}
  });
}
/* every external link opens in Chrome / the phone browser, never inside the app */
document.addEventListener("click",e=>{
  const a=e.target.closest&&e.target.closest("a[target=_blank]");
  if(a&&a.href&&/^https?:/i.test(a.href)){e.preventDefault();openExternal(a.href)}
});
