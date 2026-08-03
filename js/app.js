import {SUPABASE_URL,SUPABASE_KEY} from "./config.js";
import {loadLocal,saveLocal,uid} from "./db.js";

let db=loadLocal();
db.profile=db.profile||{};
db.bodyMetrics=db.bodyMetrics||[];
db.measurements=db.measurements||[];
db.progressPhotos=db.progressPhotos||[];
let user=null,page="home",timer=null,profileRow=null;
const app=document.getElementById("app");
const sb=window.supabase?.createClient?.(SUPABASE_URL,SUPABASE_KEY);

const quotes=["Das, was dich heute herausfordert, macht dich morgen stärker.","Disziplin schlägt Motivation, wenn Motivation nachlässt.","Jede Wiederholung bringt dich deinem Ziel näher.","Stärker als gestern. Bereit für morgen.","Konstanz formt Ergebnisse.","Du musst nicht perfekt sein. Du musst konsequent sein.","Heute zählt mehr als irgendwann.","Stärke wird aufgebaut, nicht gefunden.","Kleine Schritte werden zu großen Ergebnissen.","Dein einziges Limit ist das, das du dir selbst setzt."];
const esc=x=>String(x??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const fmt=d=>new Date(d+"T12:00:00").toLocaleDateString("de-DE");
const toast=t=>{const e=document.getElementById("toast");e.textContent=t;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),1800)};

const ICONS={
home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10.5V20h5v-6h4v6h5v-9.5"/>',
dumbbell:'<path d="M6.5 6.5v11"/><path d="M3.5 9v6"/><path d="M17.5 6.5v11"/><path d="M20.5 9v6"/><path d="M6.5 12h11"/>',
chart:'<path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19H2"/>',
calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M3 10h18"/>',
exercise:'<path d="M6 7v10"/><path d="M18 7v10"/><path d="M3 10v4"/><path d="M21 10v4"/><path d="M6 12h12"/>',
user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',
trash:'<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/>',
play:'<path d="m8 5 11 7-11 7z"/>',
plus:'<path d="M12 5v14"/><path d="M5 12h14"/>',
logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>'
};
function icon(name,cls=""){return `<svg class="svg-icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]||ICONS.home}</svg>`}

const save=()=>saveLocal(db);
const workload=w=>Math.round(w.exercises.reduce((a,e)=>a+e.sets.reduce((b,s)=>b+(+s.weight||0)*(+s.reps||0),0),0));
function greeting(){const h=new Date().getHours();return h<11?"Guten Morgen,":h<17?"Guten Tag,":"Guten Abend,"}
function dailyQuote(){const d=new Date(),start=new Date(d.getFullYear(),0,0),day=Math.floor((d-start)/86400000);return quotes[day%quotes.length]}
function name(){return profileRow?.display_name||db.profile.displayName||"Athlet"}

function authPage(){return `<div class="app"><div class="card auth"><div class="logo"><span>PA</span></div><h2>Ironminds</h2><div class="form"><div class="field"><label>E-Mail</label><input id="email" type="email"></div><div class="field"><label>Passwort</label><input id="password" type="password"></div><button class="btn primary" id="login">Anmelden</button><button class="btn" id="signup">Konto erstellen</button></div></div></div>`}
function nav(){
  const ps=["home","workout","history","plans","exercises","profile"];
  const labels=["Home","Training","Historie","Pläne","Übungen","Profil"];
  const icons=["home","dumbbell","chart","calendar","exercise","user"];
  return `<nav class="tabs">${ps.map((p,i)=>`<button data-p="${p}" class="${page===p?"active":""}">${icon(icons[i],"nav-icon")}<span>${labels[i]}</span></button>`).join("")}</nav>
  <nav class="bottom">${ps.map((p,i)=>`<button data-p="${p}" class="${page===p?"active":""}">${icon(icons[i],"nav-icon")}<span>${labels[i]}</span></button>`).join("")}</nav>`
}
function shell(body){
  return `<div class="app">
    <div class="compact-topbar">
      <div class="mini-brand"><div class="logo"><span>PA</span></div><b>IRONMINDS</b></div>
      <button class="icon" id="profileBtn" aria-label="Profil">${icon("user")}</button>
    </div>
    ${nav()}
    <main>${body}</main>
  </div>`
}
function home(){const latest=db.workouts[0],week=db.workouts.filter(w=>new Date(w.date)>new Date(Date.now()-7*86400000));const quick=[["workout","dumbbell","Training"],["plans","calendar","Pläne"],["exercises","exercise","Übungen"],["history","chart","Historie"],["history","chart","Fortschritt"],["profile","user","Profil"],["profile","chart","Statistiken"],["plans","plus","Neu"]];return `<div class="grid"><section class="hero s12"><div class="hero-copy"><span class="kicker">${greeting()}</span><h2>${esc(name())}!</h2><p>„${esc(dailyQuote())}“</p></div></section><section class="card s12"><h3>Schnellzugriff</h3><div class="quick-grid">${quick.map(([p,i,l])=>`<button class="quick" data-p="${p}">${icon(i,"quick-icon")}<b>${l}</b></button>`).join("")}</div></section><section class="card s6"><h3>Letztes Training</h3>${latest?`<div class="row"><div><b>${esc(latest.name)}</b><div class="row-sub">${fmt(latest.date)}</div></div><span class="pill">${workload(latest)} kg</span></div>`:`<div class="muted">Noch kein Training gespeichert.</div>`}</section><section class="card s6"><h3>Diese Woche</h3><div class="stats"><div class="stat"><b>${week.length}</b><span>Trainings</span></div><div class="stat"><b>${week.reduce((a,w)=>a+workload(w),0)}</b><span>Workload</span></div><div class="stat"><b>${db.plans.length}</b><span>Pläne</span></div></div></section></div>`}
function plans(){
  return `<div class="grid">
    <section class="card s6"><h2 id="planFormTitle">Plan erstellen</h2>
      <div class="form">
        <input id="editPlanId" type="hidden">
        <div class="field"><label>Planname</label><input id="pname"></div>
        <div class="exercise-picker">
          ${db.exercises.map(e=>`<div class="plan-row">
            <label class="plan-top"><input type="checkbox" class="pick" value="${e.id}"><b>${esc(e.name)}</b></label>
            <div class="plan-defaults">
              <div class="field"><label>Sätze</label><input class="sets" data-id="${e.id}" type="number" min="1" value="3"></div>
              <div class="field"><label>Wdh.</label><input class="reps" data-id="${e.id}" type="number" min="1" value="10"></div>
            </div>
          </div>`).join("")}
        </div>
        <div class="row-actions">
          <button class="btn primary" id="savePlan">${icon("plus","btn-icon")}<span>Plan speichern</span></button>
          <button class="btn" id="cancelEditPlan" style="display:none">Bearbeitung abbrechen</button>
        </div>
      </div>
    </section>
    <section class="card s6"><h2>Meine Pläne</h2>
      <div class="list">${db.plans.map(p=>`<div class="row"><div><b>${esc(p.name)}</b><div class="row-sub">${p.exerciseIds.length} Übungen</div></div><div class="row-actions"><button class="icon startPlan" data-id="${p.id}" aria-label="Starten">${icon("play")}</button><button class="icon editPlan" data-id="${p.id}" aria-label="Bearbeiten">${icon("edit")}</button><button class="icon deletePlan" data-id="${p.id}" aria-label="Löschen">${icon("trash")}</button></div></div>`).join("")||'<div class="muted">Noch keine Pläne.</div>'}</div>
    </section>
  </div>`
}
function workout(){return `<div class="card"><h2>Training</h2><div class="two"><div class="field"><label>Plan</label><select id="plan"><option value="">Freies Training</option>${db.plans.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select></div><div class="field"><label>Titel</label><input id="wname"></div></div><div class="two" style="margin-top:8px"><div class="field"><label>Datum</label><input id="wdate" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="field"><label>Pause</label><select id="pause"><option>60</option><option>90</option><option>120</option></select></div></div><div id="editor"></div></div>`}
function lastSets(pid,eid){return db.workouts.filter(w=>w.planId===pid).sort((a,b)=>new Date(b.date)-new Date(a.date))[0]?.exercises.find(e=>e.exerciseId===eid)?.sets||[]}
function setRow(n,s={}){return `<div class="setrow"><span>${n}</span><input type="number" step=".5" value="${s.weight||""}" placeholder="kg"><input type="number" value="${s.reps||""}" placeholder="Wdh."><input type="number" min="0" max="10" value="${s.rir||""}" placeholder="RIR"><input type="checkbox"></div>`}
function loadPlan(){const id=document.getElementById("plan").value,p=db.plans.find(x=>x.id===id),ids=p?p.exerciseIds:db.exercises.map(e=>e.id);document.getElementById("wname").value=p?.name||"";document.getElementById("editor").innerHTML=`<div class="card" style="margin-top:10px">${ids.map(id=>{const e=db.exercises.find(x=>x.id===id),last=lastSets(id?document.getElementById("plan").value:"",id),pres=p?.prescriptions?.find(x=>x.exerciseId===id),sets=last.length?last:Array.from({length:pres?.sets||1},()=>({reps:pres?.reps||""}));return `<div class="workout-ex" data-e="${id}"><b>${esc(e.name)}</b>${pres?`<div class="notice">${pres.sets} Sätze × ${pres.reps} Wdh.</div>`:""}<div class="sethead"><span>#</span><span>Gewicht</span><span>Wdh.</span><span>RIR</span><span>✓</span></div>${sets.map((s,i)=>setRow(i+1,s)).join("")}</div>`}).join("")}<div class="field"><label>Notiz</label><textarea id="note"></textarea></div><button class="btn good" id="finish">Training abschließen</button></div>`;document.getElementById("finish").onclick=finish}
function finish(){const ex=[...document.querySelectorAll(".workout-ex")].map(b=>({exerciseId:b.dataset.e,sets:[...b.querySelectorAll(".setrow")].map(r=>{const i=r.querySelectorAll("input");return{weight:i[0].value,reps:i[1].value,rir:i[2].value}}).filter(s=>s.weight||s.reps)})).filter(e=>e.sets.length);if(!ex.length)return toast("Bitte Sätze eintragen");const modal=document.createElement("div");modal.className="modal";modal.innerHTML=`<div class="card modal-card"><h2>Stresslevel zum Abschluss</h2><div class="list">${ex.map(e=>`<div class="stress-row" data-e="${e.exerciseId}"><b>${esc(db.exercises.find(x=>x.id===e.exerciseId)?.name)}</b><div class="stress-control"><input type="range" min="1" max="10" value="5"><span>5</span></div></div>`).join("")}</div><div style="margin-top:12px"><button class="btn" id="cancel">Abbrechen</button> <button class="btn good" id="saveWorkout">Speichern</button></div></div>`;document.body.appendChild(modal);modal.querySelectorAll("input").forEach(i=>i.oninput=()=>i.nextElementSibling.textContent=i.value);modal.querySelector("#cancel").onclick=()=>modal.remove();modal.querySelector("#saveWorkout").onclick=async()=>{modal.querySelectorAll(".stress-row").forEach(r=>{ex.find(e=>e.exerciseId===r.dataset.e).stress=+r.querySelector("input").value});db.workouts.unshift({id:uid(),planId:document.getElementById("plan").value,name:document.getElementById("wname").value||"Training",date:document.getElementById("wdate").value,notes:document.getElementById("note").value,exercises:ex});save();await sync();modal.remove();page="home";render();toast("Training gespeichert")}}
function history(){return `<div class="card"><h2>Historie</h2><div class="list">${db.workouts.map(w=>`<div class="row"><div><b>${esc(w.name)}</b><div class="row-sub">${fmt(w.date)}</div></div><span class="pill">${workload(w)} kg Workload</span></div>`).join("")||'<div class="muted">Noch keine Trainings.</div>'}</div></div>`}
function exercises(){return `<div class="grid"><section class="card s4"><h2>Übung hinzufügen</h2><div class="form"><div class="field"><label>Name</label><input id="ename"></div><div class="field"><label>Muskelgruppe</label><input id="muscle"></div><button class="btn primary" id="saveExercise">Speichern</button></div></section><section class="card s8"><h2>Übungen</h2><div class="list">${db.exercises.map(e=>`<div class="row"><b>${esc(e.name)}</b><span>${esc(e.muscle)}</span></div>`).join("")}</div></section></div>`}
function profile(){return `<div class="grid"><section class="card s12"><div class="profile-toolbar"><h2>Profil</h2><button class="icon danger" id="logout">${icon("logout")}</button></div><div class="profile-main">${db.profile.photo?`<img class="avatar" src="${db.profile.photo}">`:`<div class="logo"><span>PA</span></div>`}<div><h2>${esc(name())}</h2><div class="muted">Eisen. Stark. Unaufhaltbar.</div></div></div><div class="profile-metrics"><div><b>${db.profile.height||"-"}</b><span>Größe</span></div><div><b>${db.profile.age||"-"}</b><span>Alter</span></div><div><b>${db.profile.weight||"-"}</b><span>Gewicht</span></div><div><b>${db.profile.goalWeight||"-"}</b><span>Ziel</span></div></div><div class="form" style="margin-top:14px"><div class="field"><label>Profilname</label><input id="displayName" value="${esc(name())}"></div><div class="two"><div class="field"><label>Größe</label><input id="height" value="${db.profile.height||""}"></div><div class="field"><label>Alter</label><input id="age" value="${db.profile.age||""}"></div></div><div class="two"><div class="field"><label>Gewicht</label><input id="weight" value="${db.profile.weight||""}"></div><div class="field"><label>Zielgewicht</label><input id="goalWeight" value="${db.profile.goalWeight||""}"></div></div><button class="btn primary" id="saveProfile">Profil speichern</button></div></section></div>`}
async function sync(){if(!user)return;await sb.from("ironminds_data").upsert({user_id:user.id,data:db,updated_at:new Date().toISOString()},{onConflict:"user_id"})}
async function loadCloud(){if(!user)return;const {data}=await sb.from("ironminds_data").select("data").eq("user_id",user.id).maybeSingle();if(data?.data){db=data.data;save()}else await sync();const p=await sb.from("profiles").select("*").eq("user_id",user.id).maybeSingle();profileRow=p.data;if(!profileRow){const code="IM-"+Math.random().toString(36).slice(2,8).toUpperCase();const r=await sb.from("profiles").insert({user_id:user.id,display_name:user.email.split("@")[0],friend_code:code}).select().single();profileRow=r.data}}
async function doAuth(mode){const email=document.getElementById("email").value.trim(),password=document.getElementById("password").value;if(!email||!password)return toast("E-Mail und Passwort eingeben");const r=mode==="signup"?await sb.auth.signUp({email,password}):await sb.auth.signInWithPassword({email,password});if(r.error)return toast(r.error.message);if(!r.data.session)return toast("Bitte E-Mail bestätigen");user=r.data.user;await loadCloud();render()}
function render(){app.innerHTML=user?shell(page==="home"?home():page==="workout"?workout():page==="history"?history():page==="plans"?plans():page==="exercises"?exercises():profile()):authPage();bind()}
function bind(){document.querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{page=b.dataset.p;render()});document.getElementById("profileBtn")?.addEventListener("click",()=>{page="profile";render()});document.getElementById("login")?.addEventListener("click",()=>doAuth("login"));document.getElementById("signup")?.addEventListener("click",()=>doAuth("signup"));document.getElementById("plan")?.addEventListener("change",loadPlan);if(document.getElementById("plan"))loadPlan();document.getElementById("savePlan")?.addEventListener("click",async()=>{
  const name=document.getElementById("pname").value.trim();
  const selected=[...document.querySelectorAll(".pick:checked")];
  if(!name||!selected.length)return toast("Name und Übungen auswählen");
  const exerciseIds=selected.map(x=>x.value);
  const prescriptions=exerciseIds.map(id=>({
    exerciseId:id,
    sets:+document.querySelector(`.sets[data-id="${id}"]`).value||3,
    reps:+document.querySelector(`.reps[data-id="${id}"]`).value||10
  }));
  const editId=document.getElementById("editPlanId").value;
  if(editId){
    const plan=db.plans.find(p=>p.id===editId);
    if(plan){plan.name=name;plan.exerciseIds=exerciseIds;plan.prescriptions=prescriptions}
    toast("Plan aktualisiert");
  }else{
    db.plans.push({id:uid(),name,exerciseIds,prescriptions});
    toast("Plan gespeichert");
  }
  save();await sync();render()
});document.querySelectorAll(".startPlan").forEach(b=>b.onclick=()=>{page="workout";render();setTimeout(()=>{document.getElementById("plan").value=b.dataset.id;loadPlan()},20)});
document.querySelectorAll(".editPlan").forEach(b=>b.onclick=()=>{
  const plan=db.plans.find(p=>p.id===b.dataset.id);
  if(!plan)return;
  document.getElementById("editPlanId").value=plan.id;
  document.getElementById("pname").value=plan.name;
  document.getElementById("planFormTitle").textContent="Plan bearbeiten";
  document.getElementById("cancelEditPlan").style.display="";
  document.querySelectorAll(".pick").forEach(cb=>{
    cb.checked=plan.exerciseIds.includes(cb.value);
    const prescription=plan.prescriptions?.find(x=>x.exerciseId===cb.value);
    if(prescription){
      document.querySelector(`.sets[data-id="${cb.value}"]`).value=prescription.sets;
      document.querySelector(`.reps[data-id="${cb.value}"]`).value=prescription.reps;
    }
  });
  window.scrollTo({top:0,behavior:"smooth"});
});
document.querySelectorAll(".deletePlan").forEach(b=>b.onclick=async()=>{
  db.plans=db.plans.filter(p=>p.id!==b.dataset.id);
  save();await sync();render();toast("Plan gelöscht");
});
document.getElementById("cancelEditPlan")?.addEventListener("click",()=>render());document.getElementById("saveExercise")?.addEventListener("click",async()=>{const name=document.getElementById("ename").value.trim();if(!name)return;db.exercises.push({id:uid(),name,muscle:document.getElementById("muscle").value||"Sonstige",type:"Kraft"});save();await sync();render()});document.getElementById("saveProfile")?.addEventListener("click",async()=>{const displayName=document.getElementById("displayName").value.trim()||"Athlet";db.profile.displayName=displayName;db.profile.height=document.getElementById("height").value;db.profile.age=document.getElementById("age").value;db.profile.weight=document.getElementById("weight").value;db.profile.goalWeight=document.getElementById("goalWeight").value;await sb.from("profiles").update({display_name:displayName}).eq("user_id",user.id);if(profileRow)profileRow.display_name=displayName;save();await sync();render()});document.getElementById("logout")?.addEventListener("click",async()=>{await sb.auth.signOut();user=null;render()})}
async function init(){if(!sb){app.innerHTML='<div class="app"><div class="card auth"><h2>Ironminds</h2><div class="notice">Supabase konnte nicht geladen werden. Bitte Internetverbindung prüfen.</div></div></div>';return}try{const {data:{session}}=await sb.auth.getSession();user=session?.user||null;if(user)await loadCloud();render()}catch(err){console.error(err);app.innerHTML='<div class="app"><div class="card auth"><h2>Ironminds</h2><div class="notice">Startfehler: '+esc(err.message)+'</div></div></div>'}}
init();
