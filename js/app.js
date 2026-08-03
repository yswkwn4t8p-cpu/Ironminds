
import {SUPABASE_URL,SUPABASE_KEY} from "./config.js";
import {loadLocal,saveLocal,uid} from "./db.js";

const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
let db=loadLocal(),user=null,page="home",timer=null,dirty=false;
db.bodyMetrics=db.bodyMetrics||[];
db.measurements=db.measurements||[];
db.progressPhotos=db.progressPhotos||[];
db.profile=db.profile||{height:"",weight:"",age:"",goalWeight:"",photo:""};
let profile=null,friends=[],incomingRequests=[],outgoingRequests=[],sharedWorkouts=[];
const app=document.getElementById("app");
const esc=x=>String(x??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const fmt=d=>new Date(d+"T12:00:00").toLocaleDateString("de-DE");
function toast(text){const t=document.getElementById("toast");t.textContent=text;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800)}
function persist(){dirty=true;saveLocal(db)}
function volume(){return Math.round(db.workouts.reduce((a,w)=>a+w.exercises.reduce((b,e)=>b+e.sets.reduce((c,s)=>c+(+s.weight||0)*(+s.reps||0),0),0),0))}
function nav(){
  const ps=["home","workout","history","plans","exercises","profile"];
  const labels=["Home","Training","Historie","Pläne","Übungen","Profil"];
  const icons=["⌂","🏋","▥","▣","⚒","♙"];
  return `<nav class="tabs">${ps.map((p,i)=>`<button class="tab ${page===p?"active":""}" data-p="${p}">${labels[i]}</button>`).join("")}</nav>
  <nav class="bottom">${ps.map((p,i)=>`<button class="${page===p?"active":""}" data-p="${p}"><b>${icons[i]}</b>${labels[i]}</button>`).join("")}</nav>`
}
function shell(body){
  return `<div class="app">
    <header class="glass-header">
      <div class="brand">
        <div class="logo">PA</div>
        <div class="brand-copy"><h1>IRONMINDS</h1><div class="sub">Disziplin. Fokus. Fortschritt.</div></div>
      </div>
      <div class="actions">
        <span id="syncState" class="sync">● synchronisiert</span>
        <button class="icon header-profile" id="profileBtn" aria-label="Profil">♙</button>
        <button class="btn hide-mobile" id="backup">Backup</button>
        <button class="btn header-logout" id="logout">Abmelden</button>
      </div>
    </header>${nav()}<main>${body}</main>
  </div>`
}
function home(){
  const name=profile?.display_name||user?.email?.split("@")[0]||"Athlet";
  const latest=db.workouts[0];
  const now=new Date();
  const weekStart=new Date(now);
  weekStart.setDate(now.getDate()-6);
  weekStart.setHours(0,0,0,0);
  const week=db.workouts.filter(w=>new Date(w.date+"T12:00:00")>=weekStart);
  const weekLoad=week.reduce((a,w)=>a+workoutLoad(w),0);
  const weekSets=week.reduce((a,w)=>a+w.exercises.reduce((b,e)=>b+e.sets.length,0),0);

  const quickItems=[
    ["workout","🏋","Training"],
    ["plans","▣","Pläne"],
    ["exercises","⚒","Übungen"],
    ["history","▥","Historie"],
    ["history","↗","Fortschritt"],
    ["profile","♙","Profil"],
    ["friends","♧","Freunde"],
    ["profile","◔","Statistiken"]
  ];

  return `<div class="home-screen">
    <section class="home-hero-exact">
      <div class="hero-overlay-exact"></div>
      <div class="hero-copy-exact">
        <span class="hero-kicker">Guten Morgen,</span>
        <h2>${esc(name)}!</h2>
        <p>„Das, was dich heute herausfordert, macht dich morgen stärker.“</p>
      </div>
    </section>

    <section class="card exact-glass quick-access-card">
      <h3>Schnellzugriff</h3>
      <div class="quick-access-grid">
        ${quickItems.map(([go,icon,label])=>`
          <button class="quick-access-item" data-go="${go}">
            <span>${icon}</span>
            <b>${label}</b>
          </button>`).join("")}
      </div>
    </section>

    <section class="card exact-glass last-workout-card">
      <div class="exact-section-title">
        <div><span class="section-icon">▣</span><h3>Letztes Training</h3></div>
        <span>${latest?fmt(latest.date):"–"}</span>
      </div>
      ${latest?`
        <div class="last-workout-main">
          <div>
            <h4>${esc(latest.name)}</h4>
            <div class="last-workout-metrics">
              <div><span>Dauer</span><b>${latest.duration||"–"}</b></div>
              <div><span>Volumen</span><b>${workoutLoad(latest).toLocaleString("de-DE")} kg</b></div>
              <div><span>Workload</span><b>${workoutLoad(latest).toLocaleString("de-DE")} kg</b></div>
            </div>
          </div>
          <div class="muscle-silhouette">◒</div>
        </div>`:
        `<div class="empty-workout"><p>Noch kein Training gespeichert.</p><button class="btn primary" data-go="workout">Training starten</button></div>`}
    </section>

    <section class="card exact-glass weekly-overview-card">
      <div class="exact-section-title">
        <h3>Übersicht diese Woche</h3>
        <button class="text-link" data-go="history">Mehr anzeigen</button>
      </div>
      <div class="weekly-overview-grid">
        <div class="weekly-overview-item">
          <span>Trainings</span>
          <b>${week.length}</b>
          <small>Workouts</small>
          <div class="mini-bars">${[2,4,3,5,7,4,6].map(v=>`<i style="height:${v*5}px"></i>`).join("")}</div>
        </div>
        <div class="weekly-overview-item">
          <span>Workload</span>
          <b>${Math.round(weekLoad).toLocaleString("de-DE")} kg</b>
          <small>${weekSets} Sätze</small>
          <div class="mini-line">⌁⌁⌁</div>
        </div>
        <div class="weekly-overview-item">
          <span>Gesamt</span>
          <b>${volume().toLocaleString("de-DE")} kg</b>
          <small>seit Beginn</small>
          <div class="mini-clock">◷</div>
        </div>
      </div>
    </section>
  </div>`
}
function workout(){return `<div class="grid"><section class="card s12"><h2>Training</h2><div class="two"><div class="field"><label>Trainingsplan</label><select id="plan"><option value="">Freies Training</option>${db.plans.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select></div><div class="field"><label>Titel</label><input id="wname" placeholder="z. B. Push A"></div></div><div class="two" style="margin-top:9px"><div class="field"><label>Datum</label><input id="wdate" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="field"><label>Pause</label><select id="pause"><option value="60">60 Sek.</option><option value="90">90 Sek.</option><option value="120">120 Sek.</option><option value="180">180 Sek.</option></select></div></div><div id="editor"></div></section></div>`}
function lastSets(pid,eid){return db.workouts.filter(w=>(pid?w.planId===pid:true)&&w.exercises.some(e=>e.exerciseId===eid)).sort((a,b)=>new Date(b.date)-new Date(a.date))[0]?.exercises.find(e=>e.exerciseId===eid)?.sets||[]}
function setRow(n,s={}){return `<div class="setrow"><span>${n}</span><input type="number" step=".5" value="${s.weight||""}" placeholder="kg"><input type="number" value="${s.reps||""}" placeholder="Wdh."><input type="number" min="0" max="10" step="1" value="${s.rir??""}" placeholder="RIR"><input type="checkbox" ${s.done?"checked":""}></div>`}
function editor(ids,pid){return `<div class="card" style="margin-top:12px"><h3>Sätze</h3>${ids.map(id=>{const e=db.exercises.find(x=>x.id===id),last=lastSets(pid,id),sets=last.length?last:[{}];return `<div class="workout-ex" data-e="${id}"><b>${esc(e?.name||"Übung")}</b>${last.length?`<div class="notice">Letztes Training: ${last.map(s=>`${s.weight||"-"} kg × ${s.reps||"-"}`).join(" · ")} · vorausgefüllt</div>`:""}<div class="field stress-field"><label>Stresslevel der Übung (1–10)</label><input class="exercise-stress" type="range" min="1" max="10" value="${last.at(-1)?.stress||5}"><span class="stress-value">${last.at(-1)?.stress||5}</span></div><div class="sethead"><span>#</span><span>Gewicht</span><span>Wdh.</span><span>RIR</span><span>✓</span></div><div class="sets">${sets.map((s,i)=>setRow(i+1,s)).join("")}</div><button class="btn add-set">＋ Satz</button></div>`}).join("")}<div class="field" style="margin-top:10px"><label>Notiz</label><textarea id="note"></textarea></div><div class="row-actions"><button class="btn" id="timerStart">⏱ Pause starten</button><button class="btn good" id="finish">✓ Training abschließen</button></div><div id="timer"></div></div>`}
function plans(){return `<div class="grid"><section class="card s6"><h2>Plan erstellen</h2><div class="form"><div class="field"><label>Planname</label><input id="pname" placeholder="z. B. Push A"></div><div class="field"><label>Übungen</label><div class="exercise-picker">${db.exercises.map(e=>`<label class="pick"><input type="checkbox" class="planpick" value="${e.id}"><span><b>${esc(e.name)}</b><br><span class="muted">${esc(e.muscle)}</span></span></label>`).join("")}</div></div><button class="btn primary" id="saveplan">Plan speichern</button></div></section><section class="card s6"><h2>Meine Pläne</h2>${db.plans.length?`<div class="list">${db.plans.map(p=>`<div class="row"><div><b>${esc(p.name)}</b><div class="row-sub">${p.exerciseIds.length} Übungen · ${db.workouts.filter(w=>w.planId===p.id).length} Trainings</div></div><div class="row-actions"><button class="icon start-plan" data-id="${p.id}">▶</button><button class="icon delete-plan" data-id="${p.id}">×</button></div></div>`).join("")}</div>`:`<div class="muted">Noch keine Pläne.</div>`}</section></div>`}
function exercises(){return `<div class="grid"><section class="card s4"><h2>Übung hinzufügen</h2><div class="form"><div class="field"><label>Name</label><input id="ename"></div><div class="field"><label>Muskelgruppe</label><input id="muscle"></div><div class="field"><label>Typ</label><select id="etype"><option>Kraft</option><option>Körpergewicht</option><option>Cardio</option><option>Mobilität</option></select></div><button class="btn primary" id="saveex">Übung speichern</button></div></section><section class="card s8"><h2>Meine Übungen</h2><div class="list">${db.exercises.map(e=>`<div class="row"><div><b>${esc(e.name)}</b><div class="row-sub">${esc(e.muscle)} · ${esc(e.type)}</div></div><button class="icon delete-ex" data-id="${e.id}">×</button></div>`).join("")}</div></section></div>`}
function workoutLoad(w){return Math.round(w.exercises.reduce((a,e)=>a+e.sets.reduce((b,s)=>b+(+s.weight||0)*(+s.reps||0),0),0))}
function history(){const id=document.getElementById("hex")?.value||db.exercises[0]?.id,pts=pointsFor(id);return `<div class="grid"><section class="card s12"><h2>Historie & Fortschritt</h2><div class="field"><label>Übung</label><select id="hex">${db.exercises.map(e=>`<option value="${e.id}" ${e.id===id?"selected":""}>${esc(e.name)}</option>`).join("")}</select></div></section><section class="card s4"><h3>Bestleistung</h3><div style="font-size:34px;font-weight:900">${pts.length?Math.max(...pts.map(p=>p.max)):0} kg</div></section><section class="card s4"><h3>Einheiten</h3><div style="font-size:34px;font-weight:900">${pts.length}</div></section><section class="card s4"><h3>Letztes Gewicht</h3><div style="font-size:34px;font-weight:900">${pts.at(-1)?.max||0} kg</div></section><section class="card s6"><h3>Maximalgewicht</h3><div class="canvas"><canvas id="c1"></canvas></div></section><section class="card s6"><h3>Volumen</h3><div class="canvas"><canvas id="c2"></canvas></div></section><section class="card s12"><h3>Workload pro Training</h3>${db.workouts.length?`<div class="list">${db.workouts.map(w=>`<div class="row"><div><b>${esc(w.name)}</b><div class="row-sub">${fmt(w.date)} · ${w.exercises.length} Übungen</div></div><div class="row-actions"><span class="pill">${workoutLoad(w)} kg Workload</span><button class="icon share-workout" data-id="${w.id}">Teilen</button></div></div>`).join("")}</div>`:`<div class="muted">Noch keine Trainings.</div>`}</section><section class="card s12"><h3>Übungsfortschritt</h3>${pts.length?`<div class="list">${pts.slice().reverse().map(p=>`<div class="row"><b>${fmt(p.date)}</b><span>${p.max} kg · ${Math.round(p.volume)} kg Volumen</span></div>`).join("")}</div>`:`<div class="muted">Noch keine Daten.</div>`}</section></div>`}
function pointsFor(id){const pts=[];db.workouts.slice().sort((a,b)=>new Date(a.date)-new Date(b.date)).forEach(w=>w.exercises.filter(e=>e.exerciseId===id).forEach(e=>{const s=e.sets.filter(x=>+x.weight&&+x.reps);if(s.length)pts.push({date:w.date,max:Math.max(...s.map(x=>+x.weight)),volume:s.reduce((a,x)=>a+(+x.weight)*(+x.reps),0)})}));return pts}
function chart(id,pts,key){const c=document.getElementById(id);if(!c||!pts.length)return;const r=c.getBoundingClientRect(),d=devicePixelRatio||1,w=r.width,h=r.height;c.width=w*d;c.height=h*d;const x=c.getContext("2d");x.scale(d,d);const p=28,v=pts.map(a=>a[key]),mn=Math.min(...v),mx=Math.max(...v),range=mx-mn||1;x.strokeStyle="#e5e7eb";for(let i=0;i<4;i++){const y=p+(h-2*p)*i/3;x.beginPath();x.moveTo(p,y);x.lineTo(w-p,y);x.stroke()}x.strokeStyle="#2563eb";x.lineWidth=3;x.beginPath();pts.forEach((a,i)=>{const xx=p+(w-2*p)*i/Math.max(1,pts.length-1),yy=h-p-(h-2*p)*(a[key]-mn)/range;i?x.lineTo(xx,yy):x.moveTo(xx,yy)});x.stroke();x.fillStyle="#111827";x.fillText(mx+" kg",p,15)}

function friendsPage(){
  return `<div class="grid">
  <section class="card s4"><h2>Mein Profil</h2>
    <div class="form">
      <div class="field"><label>Anzeigename</label><input id="displayName" value="${esc(profile?.display_name||"")}"></div>
      <button class="btn primary" id="saveProfile">Profil speichern</button>
      <div class="notice">Dein Freundescode: <b>${esc(profile?.friend_code||"wird erstellt")}</b></div>
    </div>
  </section>
  <section class="card s4"><h2>Freund hinzufügen</h2>
    <div class="form"><div class="field"><label>Freundescode</label><input id="friendCode" placeholder="z. B. IM-ABC123"></div><button class="btn primary" id="addFriend">Anfrage senden</button></div>
  </section>
  <section class="card s4"><h2>Anfragen</h2>
    ${incomingRequests.length?`<div class="list">${incomingRequests.map(r=>`<div class="row"><div><b>${esc(r.sender?.display_name||"Ironminds-Nutzer")}</b><div class="row-sub">${esc(r.sender?.friend_code||"")}</div></div><div class="row-actions"><button class="icon accept-request" data-id="${r.id}">✓</button><button class="icon reject-request" data-id="${r.id}">×</button></div></div>`).join("")}</div>`:`<div class="muted">Keine offenen Anfragen.</div>`}
  </section>
  <section class="card s6"><h2>Meine Freunde</h2>
    ${friends.length?`<div class="list">${friends.map(f=>`<div class="row"><div><b>${esc(f.display_name||"Ironminds-Nutzer")}</b><div class="row-sub">${esc(f.friend_code||"")}</div></div></div>`).join("")}</div>`:`<div class="muted">Noch keine Freunde hinzugefügt.</div>`}
  </section>
  <section class="card s6"><h2>Geteilte Workouts</h2>
    ${sharedWorkouts.length?`<div class="list">${sharedWorkouts.map(x=>`<div class="row"><div><b>${esc(x.workout?.name||"Workout")}</b><div class="row-sub">${esc(x.owner?.display_name||"Freund")} · ${fmt(x.workout?.date||new Date().toISOString().slice(0,10))}</div></div><div class="row-actions"><span class="pill">${workoutLoad(x.workout)} kg</span><button class="icon import-shared" data-id="${x.id}">Übernehmen</button></div></div>`).join("")}</div>`:`<div class="muted">Noch keine Workouts erhalten.</div>`}
  </section></div>`
}
async function ensureProfile(){
  if(!user)return;
  let {data}=await sb.from("profiles").select("*").eq("user_id",user.id).maybeSingle();
  if(!data){
    const code="IM-"+Math.random().toString(36).slice(2,8).toUpperCase();
    const name=user.email?.split("@")[0]||"Ironminds";
    const r=await sb.from("profiles").insert({user_id:user.id,display_name:name,friend_code:code}).select().single();
    data=r.data;
  }
  profile=data;
}
async function loadSocial(){
  if(!user)return;
  await ensureProfile();
  const {data:reqs}=await sb.from("friend_requests").select("id,sender_id,receiver_id,status,sender:profiles!friend_requests_sender_id_fkey(display_name,friend_code),receiver:profiles!friend_requests_receiver_id_fkey(display_name,friend_code)").or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
  incomingRequests=(reqs||[]).filter(r=>r.receiver_id===user.id&&r.status==="pending");
  outgoingRequests=(reqs||[]).filter(r=>r.sender_id===user.id&&r.status==="pending");
  const accepted=(reqs||[]).filter(r=>r.status==="accepted");
  friends=accepted.map(r=>r.sender_id===user.id?r.receiver:r.sender).filter(Boolean);
  const {data:shared}=await sb.from("shared_workouts").select("id,workout,created_at,owner:profiles!shared_workouts_owner_id_fkey(display_name,friend_code)").eq("recipient_id",user.id).order("created_at",{ascending:false});
  sharedWorkouts=shared||[];
}
async function sendFriendRequest(){
  const code=document.getElementById("friendCode").value.trim().toUpperCase();
  if(!code)return toast("Bitte Freundescode eingeben");
  const {data:target}=await sb.from("profiles").select("user_id").eq("friend_code",code).maybeSingle();
  if(!target)return toast("Freundescode nicht gefunden");
  if(target.user_id===user.id)return toast("Das ist dein eigener Code");
  const {error}=await sb.from("friend_requests").insert({sender_id:user.id,receiver_id:target.user_id,status:"pending"});
  if(error)return toast(error.message.includes("duplicate")?"Anfrage existiert bereits":error.message);
  await loadSocial();render();toast("Freundschaftsanfrage gesendet");
}
async function respondRequest(id,status){
  const {error}=await sb.from("friend_requests").update({status}).eq("id",id).eq("receiver_id",user.id);
  if(error)return toast(error.message);
  await loadSocial();render();
}
async function shareWorkout(id){
  if(!friends.length)return toast("Füge zuerst einen Freund hinzu");
  const workout=db.workouts.find(w=>w.id===id);
  const choices=friends.map((f,i)=>`${i+1}: ${f.display_name}`).join("\n");
  const pick=prompt(`Mit wem teilen?\n${choices}`);
  const friend=friends[Number(pick)-1];
  if(!friend)return;
  const {data:target}=await sb.from("profiles").select("user_id").eq("friend_code",friend.friend_code).single();
  const {error}=await sb.from("shared_workouts").insert({owner_id:user.id,recipient_id:target.user_id,workout});
  toast(error?error.message:"Workout geteilt ✓");
}
async function importShared(id){
  const item=sharedWorkouts.find(x=>x.id===id);
  if(!item)return;
  const copy=structuredClone(item.workout);copy.id=uid();copy.name=`${copy.name} – geteilt`;db.workouts.unshift(copy);persist();await push();toast("Workout übernommen");page="history";render();
}


function strengthRecords(){
  const out=[];
  db.exercises.forEach(ex=>{
    let best=0,bestReps=0,date="";
    db.workouts.forEach(w=>w.exercises.filter(e=>e.exerciseId===ex.id).forEach(e=>e.sets.forEach(set=>{
      const weight=+set.weight||0,reps=+set.reps||0;
      if(weight>best||(weight===best&&reps>bestReps)){best=weight;bestReps=reps;date=w.date}
    })));
    if(best>0)out.push({name:ex.name,best,bestReps,date});
  });
  return out.sort((a,b)=>b.best-a.best);
}
function muscleStats(){
  const map={};
  db.workouts.forEach(w=>w.exercises.forEach(e=>{
    const ex=db.exercises.find(x=>x.id===e.exerciseId);
    const muscle=ex?.muscle||"Sonstige";
    const load=e.sets.reduce((a,set)=>a+(+set.weight||0)*(+set.reps||0),0);
    map[muscle]=(map[muscle]||0)+load;
  }));
  return Object.entries(map).sort((a,b)=>b[1]-a[1]);
}
function periodStats(kind){
  const groups={};
  db.workouts.forEach(w=>{
    const d=new Date(w.date+"T12:00:00");
    const key=kind==="month"?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`:`${d.getFullYear()}`;
    groups[key]=groups[key]||{count:0,load:0,sets:0};
    groups[key].count++;
    groups[key].load+=workoutLoad(w);
    groups[key].sets+=w.exercises.reduce((a,e)=>a+e.sets.length,0);
  });
  return Object.entries(groups).sort((a,b)=>b[0].localeCompare(a[0]));
}
function bodyChartPoints(){return db.bodyMetrics.slice().sort((a,b)=>new Date(a.date)-new Date(b.date)).map(x=>({date:x.date,value:+x.weight||0}))}
function profilePage(){
  const recs=strengthRecords(),muscles=muscleStats(),months=periodStats("month"),years=periodStats("year");
  const displayName=profile?.display_name||user?.email?.split("@")[0]||"Athlet";
  return `<div class="profile-dashboard">
    <section class="card profile-hero glass-card">
      <div class="profile-top">
        <label class="avatar-wrap">
          ${db.profile.photo?`<img src="${db.profile.photo}" alt="Profilfoto">`:`<span>PA</span>`}
          <input id="profilePhoto" type="file" accept="image/*" hidden>
          <i>📷</i>
        </label>
        <div><h2>${esc(displayName)}</h2><p>Eisen. Stark. Unaufhaltbar.</p></div>
      </div>
      <div class="profile-metrics">
        <div><b>${db.profile.height||"–"}${db.profile.height?" cm":""}</b><span>Größe</span></div>
        <div><b>${db.profile.age||"–"}</b><span>Alter</span></div>
        <div><b>${db.profile.weight||"–"}${db.profile.weight?" kg":""}</b><span>Gewicht</span></div>
        <div><b>${db.profile.goalWeight||"–"}${db.profile.goalWeight?" kg":""}</b><span>Zielgewicht</span></div>
      </div>
      <details class="profile-edit">
        <summary>Profildaten bearbeiten</summary>
        <div class="two"><div class="field"><label>Größe (cm)</label><input id="height" type="number" value="${db.profile.height||""}"></div><div class="field"><label>Alter</label><input id="age" type="number" value="${db.profile.age||""}"></div></div>
        <div class="two"><div class="field"><label>Gewicht (kg)</label><input id="profileWeight" type="number" step=".1" value="${db.profile.weight||""}"></div><div class="field"><label>Zielgewicht (kg)</label><input id="goalWeight" type="number" step=".1" value="${db.profile.goalWeight||""}"></div></div>
        <button class="btn primary" id="saveProfileData">Profil speichern</button>
      </details>
    </section>

    <section class="profile-menu glass-card card">
      <button data-scroll="weightSection"><span>↗</span><div><b>Körpergewichtsverlauf</b><small>Verlauf anzeigen</small></div><i>›</i></button>
      <button data-scroll="measurementSection"><span>⌁</span><div><b>Umfangsmessungen</b><small>Brust, Taille, Arm, Oberschenkel</small></div><i>›</i></button>
      <button data-scroll="photosSection"><span>▧</span><div><b>Fortschrittsfotos</b><small>Deine Transformation</small></div><i>›</i></button>
      <button data-scroll="recordsSection"><span>♜</span><div><b>Kraftrekorde</b><small>Persönliche Bestleistungen</small></div><i>›</i></button>
      <button data-scroll="muscleSection"><span>◒</span><div><b>Muskelgruppen-Auswertung</b><small>Workload nach Muskelgruppen</small></div><i>›</i></button>
      <button data-scroll="statsSection"><span>▥</span><div><b>Statistiken</b><small>Monatlich & jährlich</small></div><i>›</i></button>
    </section>

    <section class="card glass-card sync-panel"><span>☁</span><b>Synchronisiert</b><small>Deine Daten sind aktuell</small></section>
    <button class="btn profile-logout" id="profileLogout">⇥ &nbsp; Abmelden</button>

    <section id="weightSection" class="card glass-card profile-detail"><h2>Körpergewichtsverlauf</h2><div class="two"><div class="field"><label>Datum</label><input id="weightDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="field"><label>Gewicht (kg)</label><input id="weightValue" type="number" step=".1"></div></div><button class="btn primary" id="addWeight">Gewicht eintragen</button><div class="canvas"><canvas id="bodyChart"></canvas></div></section>

    <section id="measurementSection" class="card glass-card profile-detail"><h2>Umfangsmessungen</h2><div class="form"><div class="field"><label>Datum</label><input id="measureDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="two"><div class="field"><label>Brust (cm)</label><input id="chest" type="number" step=".1"></div><div class="field"><label>Taille (cm)</label><input id="waist" type="number" step=".1"></div></div><div class="two"><div class="field"><label>Arm (cm)</label><input id="arm" type="number" step=".1"></div><div class="field"><label>Oberschenkel (cm)</label><input id="thigh" type="number" step=".1"></div></div><button class="btn primary" id="addMeasurement">Messung speichern</button></div>${db.measurements.length?`<div class="list detail-list">${db.measurements.slice().reverse().slice(0,6).map(x=>`<div class="row"><b>${fmt(x.date)}</b><span>${x.chest||"-"} / ${x.waist||"-"} / ${x.arm||"-"} / ${x.thigh||"-"} cm</span></div>`).join("")}</div>`:""}</section>

    <section id="photosSection" class="card glass-card profile-detail"><h2>Fortschrittsfotos</h2><div class="two"><div class="field"><label>Datum</label><input id="photoDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="field"><label>Foto</label><input id="progressPhoto" type="file" accept="image/*"></div></div><button class="btn primary" id="addProgressPhoto">Foto hinzufügen</button><div class="photo-grid">${db.progressPhotos.slice().reverse().map(x=>`<figure><img src="${x.data}" alt="Fortschrittsfoto"><figcaption>${fmt(x.date)}</figcaption></figure>`).join("")}</div></section>

    <section id="recordsSection" class="card glass-card profile-detail"><h2>Kraftrekorde</h2>${recs.length?`<div class="list">${recs.slice(0,12).map(r=>`<div class="row"><div><b>${esc(r.name)}</b><div class="row-sub">${r.date?fmt(r.date):""}</div></div><span class="pill">${r.best} kg × ${r.bestReps}</span></div>`).join("")}</div>`:`<div class="muted">Noch keine Rekorde.</div>`}</section>

    <section id="muscleSection" class="card glass-card profile-detail"><h2>Muskelgruppen-Auswertung</h2>${muscles.length?`<div class="list">${muscles.map(([m,v])=>`<div class="row"><b>${esc(m)}</b><span class="pill">${Math.round(v).toLocaleString("de-DE")} kg</span></div>`).join("")}</div>`:`<div class="muted">Noch keine Daten.</div>`}</section>

    <section id="statsSection" class="profile-stats-grid">
      <section class="card glass-card profile-detail"><h2>Monatsstatistik</h2>${months.length?`<div class="list">${months.slice(0,12).map(([k,v])=>`<div class="row"><div><b>${k}</b><div class="row-sub">${v.count} Trainings · ${v.sets} Sätze</div></div><span class="pill">${Math.round(v.load).toLocaleString("de-DE")} kg</span></div>`).join("")}</div>`:`<div class="muted">Noch keine Daten.</div>`}</section>
      <section class="card glass-card profile-detail"><h2>Jahresstatistik</h2>${years.length?`<div class="list">${years.map(([k,v])=>`<div class="row"><div><b>${k}</b><div class="row-sub">${v.count} Trainings · ${v.sets} Sätze</div></div><span class="pill">${Math.round(v.load).toLocaleString("de-DE")} kg</span></div>`).join("")}</div>`:`<div class="muted">Noch keine Daten.</div>`}</section>
    </section>
  </div>`
}

function resizeImage(file,max=1000,quality=.78){
  return new Promise((resolve,reject)=>{const img=new Image(),r=new FileReader();r.onload=()=>{img.onload=()=>{const ratio=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement("canvas");c.width=Math.round(img.width*ratio);c.height=Math.round(img.height*ratio);c.getContext("2d").drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL("image/jpeg",quality))};img.onerror=reject;img.src=r.result};r.onerror=reject;r.readAsDataURL(file)});
}

function authPage(){return `<div class="app"><div class="card auth"><div class="logo">PA</div><h2 style="text-align:center;margin-top:12px">Ironminds</h2><p class="muted" style="text-align:center">Dein Fitnesstagebuch auf allen Geräten.</p><div class="form"><div class="field"><label>E-Mail</label><input id="email" type="email"></div><div class="field"><label>Passwort</label><input id="password" type="password"></div><button class="btn primary" id="login">Anmelden</button><button class="btn" id="signup">Konto erstellen</button><button class="btn" id="reset">Passwort zurücksetzen</button><div class="notice">Nach der Anmeldung werden deine Daten zwischen Handy und PC synchronisiert.</div></div></div></div>`}
function setSync(text,off=false){const e=document.getElementById("syncState");if(e){e.textContent=text;e.classList.toggle("off",off)}}
async function push(){if(!user)return;setSync("Synchronisiere…");const {error}=await sb.from("ironminds_data").upsert({user_id:user.id,data:db,updated_at:new Date().toISOString()},{onConflict:"user_id"});if(error){console.error(error);setSync("Offline",true)}else{dirty=false;setSync("● synchronisiert")}}
async function pull(){if(!user)return;const {data,error}=await sb.from("ironminds_data").select("data").eq("user_id",user.id).maybeSingle();if(error){console.error(error);setSync("Offline",true);return}if(data?.data&&!dirty){db=data.data;saveLocal(db)}else await push()}
async function login(mode){const email=document.getElementById("email").value.trim(),password=document.getElementById("password").value;if(!email||!password)return toast("E-Mail und Passwort eingeben");const r=mode==="signup"?await sb.auth.signUp({email,password}):await sb.auth.signInWithPassword({email,password});if(r.error)return toast(r.error.message);if(mode==="signup"&&!r.data.session)return toast("Registriert. Bitte bestätige ggf. deine E-Mail.");user=r.data.user;await pull();render()}
async function resetPassword(){const email=document.getElementById("email").value.trim();if(!email)return toast("Bitte zuerst E-Mail eingeben");const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});toast(error?error.message:"E-Mail wurde gesendet.")}
function loadPlan(){const id=document.getElementById("plan").value,p=db.plans.find(x=>x.id===id);if(p){document.getElementById("wname").value=p.name;document.getElementById("editor").innerHTML=editor(p.exerciseIds,id)}else document.getElementById("editor").innerHTML=editor(db.exercises.map(e=>e.id),"");bindEditor()}
function bindEditor(){document.querySelectorAll(".add-set").forEach(b=>b.onclick=()=>{const q=b.previousElementSibling;q.insertAdjacentHTML("beforeend",setRow(q.children.length+1))});document.getElementById("finish")?.addEventListener("click",finish);document.getElementById("timerStart")?.addEventListener("click",startTimer)}
async function finish(){const pid=document.getElementById("plan").value,ex=[...document.querySelectorAll(".workout-ex")].map(b=>({exerciseId:b.dataset.e,stress:+b.querySelector(".exercise-stress")?.value||5,sets:[...b.querySelectorAll(".setrow")].map(r=>{const i=r.querySelectorAll("input");return{weight:i[0].value,reps:i[1].value,rir:i[2].value,done:i[3].checked}}).filter(s=>s.weight||s.reps)})).filter(x=>x.sets.length);if(!ex.length)return toast("Bitte mindestens einen Satz eintragen");db.workouts.unshift({id:uid(),planId:pid,name:document.getElementById("wname").value||"Training",date:document.getElementById("wdate").value,notes:document.getElementById("note").value,exercises:ex});persist();await push();page="home";render();toast("Training gespeichert ✓")}
function startTimer(){clearInterval(timer);let n=+document.getElementById("pause").value,t=document.getElementById("timer");t.innerHTML=`<div class="timer">${n} s</div>`;timer=setInterval(()=>{n--;t.innerHTML=`<div class="timer">${n} s</div>`;if(n<=0){clearInterval(timer);toast("Pause beendet!")}},1000)}
function backup(){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(db,null,2)],{type:"application/json"}));a.download="ironminds-backup.json";a.click()}
function bind(){document.querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{page=b.dataset.p;render()});document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{page=b.dataset.go;render()});document.getElementById("logout")?.addEventListener("click",async()=>{await sb.auth.signOut();user=null;render()});document.getElementById("backup")?.addEventListener("click",backup);document.getElementById("login")?.addEventListener("click",()=>login("login"));document.getElementById("signup")?.addEventListener("click",()=>login("signup"));document.getElementById("reset")?.addEventListener("click",resetPassword);const p=document.getElementById("plan");if(p){p.onchange=loadPlan;loadPlan()}document.getElementById("saveplan")?.addEventListener("click",async()=>{const name=document.getElementById("pname").value.trim(),ids=[...document.querySelectorAll(".planpick:checked")].map(x=>x.value);if(!name||!ids.length)return toast("Name und Übungen auswählen");db.plans.push({id:uid(),name,exerciseIds:ids});persist();await push();render();toast("Plan gespeichert ✓")});document.querySelectorAll(".start-plan").forEach(b=>b.onclick=()=>{page="workout";render();setTimeout(()=>{document.getElementById("plan").value=b.dataset.id;loadPlan()},20)});document.querySelectorAll(".delete-plan").forEach(b=>b.onclick=async()=>{db.plans=db.plans.filter(p=>p.id!==b.dataset.id);persist();await push();render()});document.getElementById("saveex")?.addEventListener("click",async()=>{const name=document.getElementById("ename").value.trim();if(!name)return toast("Name fehlt");db.exercises.push({id:uid(),name,muscle:document.getElementById("muscle").value||"Sonstige",type:document.getElementById("etype").value});persist();await push();render();toast("Übung gespeichert ✓")});document.querySelectorAll(".delete-ex").forEach(b=>b.onclick=async()=>{db.exercises=db.exercises.filter(e=>e.id!==b.dataset.id);db.plans.forEach(p=>p.exerciseIds=p.exerciseIds.filter(id=>id!==b.dataset.id));persist();await push();render()});document.querySelectorAll(".exercise-stress").forEach(x=>x.oninput=()=>x.nextElementSibling.textContent=x.value);
document.getElementById("saveProfile")?.addEventListener("click",async()=>{const display_name=document.getElementById("displayName").value.trim()||"Ironminds";const {error}=await sb.from("profiles").update({display_name}).eq("user_id",user.id);if(error)return toast(error.message);await loadSocial();render();toast("Profil gespeichert")});
document.getElementById("addFriend")?.addEventListener("click",sendFriendRequest);
document.querySelectorAll(".accept-request").forEach(b=>b.onclick=()=>respondRequest(b.dataset.id,"accepted"));
document.querySelectorAll(".reject-request").forEach(b=>b.onclick=()=>respondRequest(b.dataset.id,"rejected"));
document.querySelectorAll(".share-workout").forEach(b=>b.onclick=()=>shareWorkout(b.dataset.id));
document.querySelectorAll(".import-shared").forEach(b=>b.onclick=()=>importShared(b.dataset.id));

document.getElementById("profileBtn")?.addEventListener("click",()=>{page="profile";render()});
document.querySelectorAll("[data-scroll]").forEach(b=>b.onclick=()=>document.getElementById(b.dataset.scroll)?.scrollIntoView({behavior:"smooth",block:"start"}));
document.getElementById("profileLogout")?.addEventListener("click",async()=>{await sb.auth.signOut();user=null;render()});
document.getElementById("saveProfileData")?.addEventListener("click",async()=>{
  db.profile.height=document.getElementById("height").value;
  db.profile.age=document.getElementById("age").value;
  db.profile.weight=document.getElementById("profileWeight").value;
  db.profile.goalWeight=document.getElementById("goalWeight").value;
  const file=document.getElementById("profilePhoto").files[0];
  if(file)db.profile.photo=await resizeImage(file,600,.8);
  persist();await push();render();toast("Profil gespeichert");
});
document.getElementById("addWeight")?.addEventListener("click",async()=>{
  const weight=document.getElementById("weightValue").value;
  if(!weight)return toast("Gewicht fehlt");
  const date=document.getElementById("weightDate").value;
  db.bodyMetrics.push({id:uid(),date,weight});
  db.profile.weight=weight;
  persist();await push();render();toast("Gewicht gespeichert");
});
document.getElementById("addMeasurement")?.addEventListener("click",async()=>{
  db.measurements.push({id:uid(),date:document.getElementById("measureDate").value,chest:document.getElementById("chest").value,waist:document.getElementById("waist").value,arm:document.getElementById("arm").value,thigh:document.getElementById("thigh").value});
  persist();await push();render();toast("Messung gespeichert");
});
document.getElementById("addProgressPhoto")?.addEventListener("click",async()=>{
  const file=document.getElementById("progressPhoto").files[0];
  if(!file)return toast("Bitte Foto auswählen");
  const data=await resizeImage(file,1000,.72);
  db.progressPhotos.push({id:uid(),date:document.getElementById("photoDate").value,data});
  persist();await push();render();toast("Fortschrittsfoto gespeichert");
});
if(page==="profile")setTimeout(()=>{const pts=bodyChartPoints();const c=document.getElementById("bodyChart");if(c&&pts.length){const mapped=pts.map(x=>({date:x.date,value:x.value}));chart("bodyChart",mapped,"value")}},25);
const h=document.getElementById("hex");if(h){h.onchange=render;setTimeout(()=>{const pts=pointsFor(h.value);chart("c1",pts,"max");chart("c2",pts,"volume")},25)}}
function render(){app.innerHTML=user?shell(page==="home"?home():page==="workout"?workout():page==="plans"?plans():page==="friends"?friendsPage():page==="profile"?profilePage():page==="exercises"?exercises():history()):authPage();bind()}
const {data:{session}}=await sb.auth.getSession();user=session?.user||null;if(user){await pull();await loadSocial();}render();
window.addEventListener("online",()=>push());if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js");
