import {SUPABASE_URL,SUPABASE_KEY} from "./config.js";
import {loadLocal,saveLocal,uid} from "./db.js";

let db=loadLocal();
db.profile=db.profile||{};
db.bodyMetrics=db.bodyMetrics||[];
db.measurements=db.measurements||[];
db.progressPhotos=db.progressPhotos||[];
db.exercises=db.exercises||[];
db.plans=db.plans||[];
db.workouts=db.workouts||[];

let user=null;
let profileRow=null;
let friends=[];
let requests=[];
let sharedWorkouts=[];
let page="home";
let timer=null;

const app=document.getElementById("app");
const sb=window.supabase?.createClient?.(SUPABASE_URL,SUPABASE_KEY);

const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
}[char]));
const fmt=date=>new Date(date+"T12:00:00").toLocaleDateString("de-DE");
const save=()=>saveLocal(db);
const workload=workout=>Math.round((workout.exercises||[]).reduce(
  (sum,exercise)=>sum+(exercise.sets||[]).reduce(
    (setSum,set)=>setSum+(+set.weight||0)*(+set.reps||0),0
  ),0
));

const QUOTES=[
  "Das, was dich heute herausfordert, macht dich morgen stärker.",
  "Disziplin schlägt Motivation, wenn Motivation nachlässt.",
  "Jede Wiederholung bringt dich deinem Ziel näher.",
  "Stärker als gestern. Bereit für morgen.",
  "Konstanz formt Ergebnisse.",
  "Du musst nicht perfekt sein. Du musst konsequent sein.",
  "Heute zählt mehr als irgendwann.",
  "Stärke wird aufgebaut, nicht gefunden.",
  "Kleine Schritte werden zu großen Ergebnissen.",
  "Dein einziges Limit ist das, das du dir selbst setzt.",
  "Training verändert nicht nur den Körper, sondern auch den Kopf.",
  "Der Weg ist lang. Genau deshalb lohnt er sich.",
  "Jeder Satz ist eine Stimme für dein zukünftiges Ich.",
  "Fortschritt beginnt außerhalb deiner Komfortzone."
];

const ICONS={
  home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10.5V20h5v-6h4v6h5v-9.5"/>',
  dumbbell:'<path d="M6.5 6.5v11"/><path d="M3.5 9v6"/><path d="M17.5 6.5v11"/><path d="M20.5 9v6"/><path d="M6.5 12h11"/>',
  chart:'<path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19H2"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M3 10h18"/>',
  exercise:'<path d="M6 7v10"/><path d="M18 7v10"/><path d="M3 10v4"/><path d="M21 10v4"/><path d="M6 12h12"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',
  trash:'<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/>',
  play:'<path d="m8 5 11 7-11 7z"/>',
  plus:'<path d="M12 5v14"/><path d="M5 12h14"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4"/><path d="m8.6 13.5 6.8 4"/>',
  camera:'<path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3z"/><circle cx="12" cy="13" r="4"/>',
  trophy:'<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M5 5H3v2a4 4 0 0 0 4 4"/><path d="M19 5h2v2a4 4 0 0 1-4 4"/>'
};
function icon(name,cssClass=""){
  return `<svg class="svg-icon ${cssClass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]||ICONS.home}</svg>`;
}
function toast(text){
  const node=document.getElementById("toast");
  node.textContent=text;
  node.classList.add("show");
  setTimeout(()=>node.classList.remove("show"),1800);
}
function greeting(){
  const hour=new Date().getHours();
  return hour<11?"Guten Morgen,":hour<17?"Guten Tag,":"Guten Abend,";
}
function dailyQuote(){
  const date=new Date();
  const start=new Date(date.getFullYear(),0,0);
  const day=Math.floor((date-start)/86400000);
  return QUOTES[day%QUOTES.length];
}
function profileName(){
  return profileRow?.display_name||db.profile.displayName||"Athlet";
}
function resizeImage(file,max=1000,quality=.75){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    const image=new Image();
    reader.onload=()=>{
      image.onload=()=>{
        const ratio=Math.min(1,max/Math.max(image.width,image.height));
        const canvas=document.createElement("canvas");
        canvas.width=Math.round(image.width*ratio);
        canvas.height=Math.round(image.height*ratio);
        canvas.getContext("2d").drawImage(image,0,0,canvas.width,canvas.height);
        resolve(canvas.toDataURL("image/jpeg",quality));
      };
      image.onerror=reject;
      image.src=reader.result;
    };
    reader.onerror=reject;
    reader.readAsDataURL(file);
  });
}

function authPage(){
  return `<div class="app">
    <div class="card auth">
      <div class="logo"><span>PA</span></div>
      <h2>Ironminds</h2>
      <div class="form">
        <div class="field"><label>E-Mail</label><input id="email" type="email" autocomplete="email"></div>
        <div class="field"><label>Passwort</label><input id="password" type="password" autocomplete="current-password"></div>
        <button class="btn primary" id="login">Anmelden</button>
        <button class="btn" id="signup">Konto erstellen</button>
      </div>
    </div>
  </div>`;
}
function nav(){
  const pages=["home","workout","history","plans","exercises","profile"];
  const labels=["Home","Training","Historie","Pläne","Übungen","Profil"];
  const icons=["home","dumbbell","chart","calendar","exercise","user"];
  const buttons=pages.map((target,index)=>`
    <button data-page="${target}" class="${page===target?"active":""}">
      ${icon(icons[index],"nav-icon")}<span>${labels[index]}</span>
    </button>`).join("");
  return `<nav class="tabs">${buttons}</nav><nav class="bottom">${buttons}</nav>`;
}
function shell(content){
  return `<div class="app">
    <div class="compact-topbar">
      <div class="mini-brand"><div class="logo"><span>PA</span></div><b>IRONMINDS</b></div>
      <div class="row-actions">
        <button class="icon" id="friendsButton" aria-label="Freunde">${icon("users")}</button>
        <button class="icon" id="profileButton" aria-label="Profil">${icon("user")}</button>
      </div>
    </div>
    ${nav()}
    <main>${content}</main>
  </div>`;
}
function weeklyStats(){
  const now=new Date();
  const start=new Date(now);
  start.setDate(now.getDate()-((now.getDay()+6)%7));
  start.setHours(0,0,0,0);
  const workouts=db.workouts.filter(item=>new Date(item.date+"T12:00:00")>=start);
  const stressValues=workouts.map(item=>+item.stress||0).filter(Boolean);
  return {
    workouts:workouts.length,
    sets:workouts.reduce((sum,item)=>sum+item.exercises.reduce((a,e)=>a+e.sets.length,0),0),
    workload:workouts.reduce((sum,item)=>sum+workload(item),0),
    avgStress:stressValues.length?stressValues.reduce((a,b)=>a+b,0)/stressValues.length:0
  };
}
function homePage(){
  const latest=db.workouts[0];
  const week=weeklyStats();
  const quick=[
    ["workout","dumbbell","Training"],
    ["plans","calendar","Pläne"],
    ["exercises","exercise","Übungen"],
    ["history","chart","Historie"],
    ["history","chart","Fortschritt"],
    ["profile","user","Profil"],
    ["friends","users","Freunde"],
    ["profile","chart","Statistiken"]
  ];
  return `<div class="grid">
    <section class="hero s12">
      <div class="hero-copy">
        <span class="kicker">${greeting()}</span>
        <h2>${esc(profileName())}!</h2>
        <p>„${esc(dailyQuote())}“</p>
      </div>
      <div class="hero-bottom-brand">IRONMINDS</div>
    </section>

    <section class="card s12">
      <h3>Schnellzugriff</h3>
      <div class="quick-grid">
        ${quick.map(([target,iconName,label])=>`
          <button class="quick" data-page="${target}">
            ${icon(iconName,"quick-icon")}<b>${label}</b>
          </button>`).join("")}
      </div>
    </section>

    <section class="card s6">
      <h3>Letztes Training</h3>
      ${latest?`<div class="row"><div><b>${esc(latest.name)}</b><div class="row-sub">${fmt(latest.date)}${latest.stress?` · Stress ${latest.stress}/10`:""}</div></div><span class="pill">${workload(latest)} kg</span></div>`:'<div class="muted">Noch kein Training gespeichert.</div>'}
    </section>

    <section class="card s6">
      <h3>Diese Woche</h3>
      <div class="stats">
        <div class="stat"><b>${week.workouts}</b><span>Trainings</span></div>
        <div class="stat"><b>${week.sets}</b><span>Sätze</span></div>
        <div class="stat"><b>${week.workload} kg</b><span>Workload</span></div>
      </div>
    </section>
  </div>`;
}

function plansPage(){
  return `<div class="grid">
    <section class="card s6">
      <h2 id="planFormTitle">Plan erstellen</h2>
      <div class="form">
        <input id="editPlanId" type="hidden">
        <div class="field"><label>Planname</label><input id="planName"></div>
        <div class="exercise-picker">
          ${db.exercises.map(exercise=>`
            <div class="plan-row">
              <label class="plan-top">
                <input type="checkbox" class="plan-pick" value="${exercise.id}">
                <b>${esc(exercise.name)}</b>
              </label>
              <div class="plan-defaults">
                <div class="field"><label>Sätze</label><input class="plan-sets" data-id="${exercise.id}" type="number" min="1" value="3"></div>
                <div class="field"><label>Wdh.</label><input class="plan-reps" data-id="${exercise.id}" type="number" min="1" value="10"></div>
              </div>
            </div>`).join("")}
        </div>
        <div class="field">
          <label>Reihenfolge im Plan</label>
          <div id="planOrder" class="plan-order-list"><div class="muted">Wähle Übungen aus.</div></div>
        </div>
        <div class="row-actions">
          <button class="btn primary" id="savePlan">${icon("plus","btn-icon")}<span>Plan speichern</span></button>
          <button class="btn" id="cancelPlanEdit" hidden>Abbrechen</button>
        </div>
      </div>
    </section>
    <section class="card s6">
      <h2>Meine Pläne</h2>
      <div class="list">
        ${db.plans.map(plan=>`<div class="row">
          <div><b>${esc(plan.name)}</b><div class="row-sub">${plan.exerciseIds.length} Übungen</div></div>
          <div class="row-actions">
            <button class="icon start-plan" data-id="${plan.id}">${icon("play")}</button>
            <button class="icon edit-plan" data-id="${plan.id}">${icon("edit")}</button>
            <button class="icon delete-plan" data-id="${plan.id}">${icon("trash")}</button>
          </div>
        </div>`).join("")||'<div class="muted">Noch keine Pläne.</div>'}
      </div>
    </section>
  </div>`;
}
function selectedOrder(){
  return [...document.querySelectorAll("#planOrder .plan-order-item")].map(item=>item.dataset.id);
}
function renderPlanOrder(ids){
  const box=document.getElementById("planOrder");
  if(!box)return;
  if(!ids.length){
    box.innerHTML='<div class="muted">Wähle Übungen aus.</div>';
    return;
  }
  box.innerHTML=ids.map((id,index)=>{
    const exercise=db.exercises.find(item=>item.id===id);
    return `<div class="plan-order-item" data-id="${id}">
      <span class="order-number">${index+1}</span>
      <b>${esc(exercise?.name||"Übung")}</b>
      <div class="row-actions">
        <button class="icon move-up">↑</button>
        <button class="icon move-down">↓</button>
      </div>
    </div>`;
  }).join("");
  document.querySelectorAll(".move-up").forEach(button=>button.onclick=()=>{
    const item=button.closest(".plan-order-item");
    const previous=item.previousElementSibling;
    if(previous)item.parentElement.insertBefore(item,previous);
    refreshOrderNumbers();
  });
  document.querySelectorAll(".move-down").forEach(button=>button.onclick=()=>{
    const item=button.closest(".plan-order-item");
    const next=item.nextElementSibling;
    if(next)item.parentElement.insertBefore(next,item);
    refreshOrderNumbers();
  });
}
function refreshOrderNumbers(){
  document.querySelectorAll(".plan-order-item").forEach((item,index)=>{
    item.querySelector(".order-number").textContent=index+1;
  });
}

function workoutPage(){
  return `<div class="card">
    <h2>Training</h2>
    <div class="two">
      <div class="field"><label>Plan</label><select id="workoutPlan"><option value="">Freies Training</option>${db.plans.map(plan=>`<option value="${plan.id}">${esc(plan.name)}</option>`).join("")}</select></div>
      <div class="field"><label>Titel</label><input id="workoutName"></div>
    </div>
    <div class="two" style="margin-top:8px">
      <div class="field"><label>Datum</label><input id="workoutDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
      <div class="field"><label>Pause</label><select id="pauseSeconds"><option value="60">60 Sekunden</option><option value="90">90 Sekunden</option><option value="120">120 Sekunden</option><option value="180">180 Sekunden</option></select></div>
    </div>
    <div id="workoutEditor"></div>
  </div>`;
}
function lastSets(planId,exerciseId){
  const workout=db.workouts
    .filter(item=>item.planId===planId)
    .sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
  return workout?.exercises.find(item=>item.exerciseId===exerciseId)?.sets||[];
}
function setRow(index,set={}){
  return `<div class="set-row">
    <span>${index}</span>
    <input type="number" step=".5" value="${set.weight||""}" placeholder="kg">
    <input type="number" value="${set.reps||""}" placeholder="Wdh.">
    <input type="number" min="0" max="10" value="${set.rir||""}" placeholder="RIR">
    <input type="checkbox" ${set.done?"checked":""}>
  </div>`;
}
function loadWorkoutPlan(){
  const planId=document.getElementById("workoutPlan").value;
  const plan=db.plans.find(item=>item.id===planId);
  const ids=plan?plan.exerciseIds:db.exercises.map(item=>item.id);
  document.getElementById("workoutName").value=plan?.name||"";
  const html=ids.map(id=>{
    const exercise=db.exercises.find(item=>item.id===id);
    const previous=lastSets(planId,id);
    const prescription=plan?.prescriptions?.find(item=>item.exerciseId===id);
    const sets=previous.length
      ? previous
      : Array.from({length:prescription?.sets||1},()=>({reps:prescription?.reps||""}));
    return `<div class="workout-exercise" data-id="${id}">
      <b>${esc(exercise?.name||"Übung")}</b>
      ${prescription?`<div class="notice">Planvorgabe: ${prescription.sets} Sätze × ${prescription.reps} Wdh.</div>`:""}
      ${previous.length?`<div class="notice">Letztes Training vorausgefüllt.</div>`:""}
      <div class="set-head"><span>#</span><span>Gewicht</span><span>Wdh.</span><span>RIR</span><span>✓</span></div>
      <div class="sets">${sets.map((set,index)=>setRow(index+1,set)).join("")}</div>
      <button class="btn add-set">${icon("plus","btn-icon")}<span>Satz hinzufügen</span></button>
    </div>`;
  }).join("");
  document.getElementById("workoutEditor").innerHTML=`<div class="card inner-card">${html}
    <div class="field"><label>Notiz</label><textarea id="workoutNotes"></textarea></div>
    <div class="row-actions">
      <button class="btn" id="startTimer">Pausentimer starten</button>
      <button class="btn good" id="finishWorkout">Training abschließen</button>
    </div>
    <div id="timerDisplay"></div>
  </div>`;
  document.querySelectorAll(".add-set").forEach(button=>button.onclick=()=>{
    const list=button.previousElementSibling;
    list.insertAdjacentHTML("beforeend",setRow(list.children.length+1,{}));
  });
  document.getElementById("startTimer").onclick=startTimer;
  document.getElementById("finishWorkout").onclick=finishWorkout;
}
function startTimer(){
  clearInterval(timer);
  let seconds=+document.getElementById("pauseSeconds").value;
  const display=document.getElementById("timerDisplay");
  display.innerHTML=`<div class="timer">${seconds} s</div>`;
  timer=setInterval(()=>{
    seconds--;
    display.innerHTML=`<div class="timer">${Math.max(0,seconds)} s</div>`;
    if(seconds<=0){
      clearInterval(timer);
      toast("Pause beendet");
    }
  },1000);
}
function finishWorkout(){
  const exercises=[...document.querySelectorAll(".workout-exercise")].map(box=>({
    exerciseId:box.dataset.id,
    sets:[...box.querySelectorAll(".set-row")].map(row=>{
      const inputs=row.querySelectorAll("input");
      return {
        weight:inputs[0].value,
        reps:inputs[1].value,
        rir:inputs[2].value,
        done:inputs[3].checked
      };
    }).filter(set=>set.weight||set.reps)
  })).filter(exercise=>exercise.sets.length);
  if(!exercises.length)return toast("Bitte Sätze eintragen");

  const modal=document.createElement("div");
  modal.className="modal";
  modal.innerHTML=`<div class="card modal-card">
    <h2>Training abschließen</h2>
    <p class="muted">Wie hoch war das Stresslevel für das gesamte Training?</p>
    <div class="overall-stress">
      <input id="overallStress" type="range" min="1" max="10" value="5">
      <div><span id="overallStressValue">5</span><small>von 10</small></div>
    </div>
    <div class="row-actions" style="margin-top:14px">
      <button class="btn" id="cancelFinish">Abbrechen</button>
      <button class="btn good" id="saveFinishedWorkout">Speichern</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  const input=modal.querySelector("#overallStress");
  input.oninput=()=>modal.querySelector("#overallStressValue").textContent=input.value;
  modal.querySelector("#cancelFinish").onclick=()=>modal.remove();
  modal.querySelector("#saveFinishedWorkout").onclick=async()=>{
    db.workouts.unshift({
      id:uid(),
      planId:document.getElementById("workoutPlan").value,
      name:document.getElementById("workoutName").value||"Training",
      date:document.getElementById("workoutDate").value,
      notes:document.getElementById("workoutNotes").value,
      stress:+input.value,
      exercises
    });
    save();
    await sync();
    modal.remove();
    page="home";
    render();
    toast("Training gespeichert");
  };
}

function strengthRecords(){
  return db.exercises.map(exercise=>{
    let best=0,reps=0,date="";
    db.workouts.forEach(workout=>{
      workout.exercises.filter(item=>item.exerciseId===exercise.id).forEach(item=>{
        item.sets.forEach(set=>{
          const weight=+set.weight||0;
          const currentReps=+set.reps||0;
          if(weight>best||(weight===best&&currentReps>reps)){
            best=weight;reps=currentReps;date=workout.date;
          }
        });
      });
    });
    return best?{name:exercise.name,best,reps,date}:null;
  }).filter(Boolean).sort((a,b)=>b.best-a.best);
}
function muscleStats(){
  const map={};
  db.workouts.forEach(workout=>workout.exercises.forEach(item=>{
    const exercise=db.exercises.find(ex=>ex.id===item.exerciseId);
    const muscle=exercise?.muscle||"Sonstige";
    map[muscle]=(map[muscle]||0)+item.sets.reduce(
      (sum,set)=>sum+(+set.weight||0)*(+set.reps||0),0
    );
  }));
  return Object.entries(map).sort((a,b)=>b[1]-a[1]);
}
function periodStats(mode){
  const map={};
  db.workouts.forEach(workout=>{
    const date=new Date(workout.date+"T12:00:00");
    const key=mode==="month"
      ? `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`
      : `${date.getFullYear()}`;
    map[key]=map[key]||{count:0,sets:0,load:0};
    map[key].count++;
    map[key].sets+=workout.exercises.reduce((sum,item)=>sum+item.sets.length,0);
    map[key].load+=workload(workout);
  });
  return Object.entries(map).sort((a,b)=>b[0].localeCompare(a[0]));
}
function historyPage(){
  const week=weeklyStats();
  const records=strengthRecords();
  const muscles=muscleStats();
  const months=periodStats("month");
  const years=periodStats("year");
  return `<div class="grid">
    <section class="card s12">
      <div class="section-head"><h2>Wochenstatistik</h2><span>Aktuelle Woche</span></div>
      <div class="weekly-grid">
        <div><b>${week.workouts}</b><span>Trainings</span></div>
        <div><b>${week.sets}</b><span>Sätze</span></div>
        <div><b>${week.workload} kg</b><span>Workload</span></div>
        <div><b>${week.avgStress?week.avgStress.toFixed(1):"-"}</b><span>Ø Stress</span></div>
      </div>
    </section>
    <section class="card s12">
      <h2>Historie & Fortschritt</h2>
      <div class="list">${db.workouts.map(workout=>`<div class="row">
        <div><b>${esc(workout.name)}</b><div class="row-sub">${fmt(workout.date)} · ${workout.exercises.length} Übungen${workout.stress?` · Stress ${workout.stress}/10`:""}</div></div>
        <div class="row-actions"><span class="pill">${workload(workout)} kg</span><button class="icon share-workout" data-id="${workout.id}">${icon("share")}</button></div>
      </div>`).join("")||'<div class="muted">Noch keine Trainings.</div>'}</div>
    </section>
    <section class="card s6"><h2>Kraftrekorde</h2><div class="list">${records.map(record=>`<div class="row"><div><b>${esc(record.name)}</b><div class="row-sub">${fmt(record.date)}</div></div><span class="pill">${record.best} kg × ${record.reps}</span></div>`).join("")||'<div class="muted">Noch keine Rekorde.</div>'}</div></section>
    <section class="card s6"><h2>Muskelgruppen</h2><div class="list">${muscles.map(([muscle,value])=>`<div class="row"><b>${esc(muscle)}</b><span class="pill">${Math.round(value)} kg</span></div>`).join("")||'<div class="muted">Noch keine Daten.</div>'}</div></section>
    <section class="card s6"><h2>Monatsstatistik</h2><div class="list">${months.map(([key,value])=>`<div class="row"><div><b>${key}</b><div class="row-sub">${value.count} Trainings · ${value.sets} Sätze</div></div><span class="pill">${Math.round(value.load)} kg</span></div>`).join("")||'<div class="muted">Noch keine Daten.</div>'}</div></section>
    <section class="card s6"><h2>Jahresstatistik</h2><div class="list">${years.map(([key,value])=>`<div class="row"><div><b>${key}</b><div class="row-sub">${value.count} Trainings · ${value.sets} Sätze</div></div><span class="pill">${Math.round(value.load)} kg</span></div>`).join("")||'<div class="muted">Noch keine Daten.</div>'}</div></section>
  </div>`;
}

function exercisesPage(){
  return `<div class="grid">
    <section class="card s4">
      <h2>Übung hinzufügen</h2>
      <div class="form">
        <div class="field"><label>Name</label><input id="exerciseName"></div>
        <div class="field"><label>Muskelgruppe</label><input id="exerciseMuscle"></div>
        <div class="field"><label>Typ</label><select id="exerciseType"><option>Kraft</option><option>Körpergewicht</option><option>Cardio</option><option>Mobilität</option></select></div>
        <button class="btn primary" id="saveExercise">Speichern</button>
      </div>
    </section>
    <section class="card s8">
      <h2>Übungen</h2>
      <div class="list">${db.exercises.map(exercise=>`<div class="row">
        <div><b>${esc(exercise.name)}</b><div class="row-sub">${esc(exercise.muscle)} · ${esc(exercise.type)}</div></div>
        <button class="icon delete-exercise" data-id="${exercise.id}">${icon("trash")}</button>
      </div>`).join("")}</div>
    </section>
  </div>`;
}

function bodyPoints(){
  return db.bodyMetrics.slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
}
function drawBodyChart(){
  const canvas=document.getElementById("bodyChart");
  const points=bodyPoints();
  if(!canvas||!points.length)return;
  const rect=canvas.getBoundingClientRect();
  const ratio=devicePixelRatio||1;
  canvas.width=rect.width*ratio;
  canvas.height=rect.height*ratio;
  const ctx=canvas.getContext("2d");
  ctx.scale(ratio,ratio);
  const width=rect.width,height=rect.height,padding=28;
  const values=points.map(item=>+item.weight);
  const min=Math.min(...values),max=Math.max(...values),range=max-min||1;
  ctx.strokeStyle="rgba(255,255,255,.12)";
  for(let i=0;i<4;i++){
    const y=padding+(height-2*padding)*i/3;
    ctx.beginPath();ctx.moveTo(padding,y);ctx.lineTo(width-padding,y);ctx.stroke();
  }
  ctx.strokeStyle="#ef3437";
  ctx.lineWidth=3;
  ctx.beginPath();
  points.forEach((item,index)=>{
    const x=padding+(width-2*padding)*index/Math.max(1,points.length-1);
    const y=height-padding-(height-2*padding)*((+item.weight)-min)/range;
    index?ctx.lineTo(x,y):ctx.moveTo(x,y);
  });
  ctx.stroke();
  ctx.fillStyle="#fff";
  ctx.fillText(`${max} kg`,padding,15);
}
function profilePage(){
  const records=strengthRecords();
  return `<div class="grid">
    <section class="card s12">
      <div class="profile-toolbar"><h2>Profil</h2><button class="icon danger" id="logout">${icon("logout")}</button></div>
      <div class="profile-main">
        ${db.profile.photo?`<img class="avatar" src="${db.profile.photo}" alt="Profilfoto">`:'<div class="logo"><span>PA</span></div>'}
        <div><h2>${esc(profileName())}</h2><div class="muted">Eisen. Stark. Unaufhaltbar.</div></div>
      </div>
      <div class="profile-metrics">
        <div><b>${db.profile.height||"-"}</b><span>Größe</span></div>
        <div><b>${db.profile.age||"-"}</b><span>Alter</span></div>
        <div><b>${db.profile.weight||"-"}</b><span>Gewicht</span></div>
        <div><b>${db.profile.goalWeight||"-"}</b><span>Zielgewicht</span></div>
      </div>
      <div class="form profile-form">
        <div class="field"><label>Profilname</label><input id="displayName" value="${esc(profileName())}"></div>
        <div class="field"><label>Profilfoto</label><input id="profilePhoto" type="file" accept="image/*"></div>
        <div class="two"><div class="field"><label>Größe (cm)</label><input id="height" value="${db.profile.height||""}"></div><div class="field"><label>Alter</label><input id="age" value="${db.profile.age||""}"></div></div>
        <div class="two"><div class="field"><label>Gewicht (kg)</label><input id="weight" value="${db.profile.weight||""}"></div><div class="field"><label>Zielgewicht (kg)</label><input id="goalWeight" value="${db.profile.goalWeight||""}"></div></div>
        <button class="btn primary" id="saveProfile">Profil speichern</button>
      </div>
    </section>

    <section class="card s6">
      <h2>Körpergewichtsverlauf</h2>
      <div class="two"><div class="field"><label>Datum</label><input id="weightDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="field"><label>Gewicht</label><input id="weightValue" type="number" step=".1"></div></div>
      <button class="btn primary" id="addWeight">Eintragen</button>
      <div class="chart-wrap"><canvas id="bodyChart"></canvas></div>
      <div class="list">${db.bodyMetrics.slice().reverse().slice(0,8).map(item=>`<div class="row"><b>${fmt(item.date)}</b><span>${item.weight} kg</span></div>`).join("")||'<div class="muted">Noch keine Daten.</div>'}</div>
    </section>

    <section class="card s6">
      <h2>Umfangsmessungen</h2>
      <div class="form">
        <div class="field"><label>Datum</label><input id="measurementDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
        <div class="two"><div class="field"><label>Brust</label><input id="chest" type="number" step=".1"></div><div class="field"><label>Taille</label><input id="waist" type="number" step=".1"></div></div>
        <div class="two"><div class="field"><label>Arm</label><input id="arm" type="number" step=".1"></div><div class="field"><label>Oberschenkel</label><input id="thigh" type="number" step=".1"></div></div>
        <button class="btn primary" id="addMeasurement">Messung speichern</button>
      </div>
      <div class="list">${db.measurements.slice().reverse().slice(0,6).map(item=>`<div class="row"><div><b>${fmt(item.date)}</b><div class="row-sub">Brust ${item.chest||"-"} · Taille ${item.waist||"-"} · Arm ${item.arm||"-"} · Bein ${item.thigh||"-"} cm</div></div></div>`).join("")}</div>
    </section>

    <section class="card s6">
      <h2>Fortschrittsfotos</h2>
      <div class="two"><div class="field"><label>Datum</label><input id="photoDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="field"><label>Foto</label><input id="progressPhoto" type="file" accept="image/*"></div></div>
      <button class="btn primary" id="addProgressPhoto">Foto hinzufügen</button>
      <div class="photo-grid">${db.progressPhotos.slice().reverse().map(item=>`<figure><img src="${item.data}" alt="Fortschrittsfoto"><figcaption>${fmt(item.date)}</figcaption></figure>`).join("")}</div>
    </section>

    <section class="card s6">
      <h2>Kraftrekorde</h2>
      <div class="list">${records.map(record=>`<div class="row"><div><b>${esc(record.name)}</b><div class="row-sub">${fmt(record.date)}</div></div><span class="pill">${record.best} kg × ${record.reps}</span></div>`).join("")||'<div class="muted">Noch keine Rekorde.</div>'}</div>
    </section>
  </div>`;
}

function friendsPage(){
  const incoming=requests.filter(item=>item.receiver_id===user.id&&item.status==="pending");
  const accepted=requests.filter(item=>item.status==="accepted");
  friends=accepted.map(item=>item.sender_id===user.id?item.receiver:item.sender).filter(Boolean);
  return `<div class="grid">
    <section class="card s4">
      <h2>Freundescode</h2>
      <div class="notice"><b>${esc(profileRow?.friend_code||"wird erstellt")}</b></div>
      <div class="field"><label>Code eines Freundes</label><input id="friendCode"></div>
      <button class="btn primary" id="sendRequest">Anfrage senden</button>
    </section>
    <section class="card s4">
      <h2>Anfragen</h2>
      <div class="list">${incoming.map(item=>`<div class="row"><div><b>${esc(item.sender?.display_name||"Nutzer")}</b><div class="row-sub">${esc(item.sender?.friend_code||"")}</div></div><div class="row-actions"><button class="icon accept-request" data-id="${item.id}">✓</button><button class="icon reject-request" data-id="${item.id}">×</button></div></div>`).join("")||'<div class="muted">Keine offenen Anfragen.</div>'}</div>
    </section>
    <section class="card s4">
      <h2>Freunde</h2>
      <div class="list">${friends.map(item=>`<div class="row"><b>${esc(item.display_name||"Nutzer")}</b><span>${esc(item.friend_code||"")}</span></div>`).join("")||'<div class="muted">Noch keine Freunde.</div>'}</div>
    </section>
    <section class="card s12">
      <h2>Geteilte Workouts</h2>
      <div class="list">${sharedWorkouts.map(item=>`<div class="row"><div><b>${esc(item.workout?.name||"Workout")}</b><div class="row-sub">${esc(item.owner?.display_name||"Freund")} · ${fmt(item.workout?.date||new Date().toISOString().slice(0,10))}</div></div><button class="btn import-shared" data-id="${item.id}">Übernehmen</button></div>`).join("")||'<div class="muted">Noch keine Workouts erhalten.</div>'}</div>
    </section>
  </div>`;
}

async function sync(){
  if(!user)return;
  const {error}=await sb.from("ironminds_data").upsert({
    user_id:user.id,
    data:db,
    updated_at:new Date().toISOString()
  },{onConflict:"user_id"});
  if(error)console.error(error);
}
async function loadCloud(){
  if(!user)return;
  const cloud=await sb.from("ironminds_data").select("data").eq("user_id",user.id).maybeSingle();
  if(cloud.data?.data){
    db=cloud.data.data;
    db.profile=db.profile||{};
    db.bodyMetrics=db.bodyMetrics||[];
    db.measurements=db.measurements||[];
    db.progressPhotos=db.progressPhotos||[];
    db.exercises=db.exercises||[];
    db.plans=db.plans||[];
    db.workouts=db.workouts||[];
    save();
  }else{
    await sync();
  }
  const profileResult=await sb.from("profiles").select("*").eq("user_id",user.id).maybeSingle();
  profileRow=profileResult.data;
  if(!profileRow){
    const friendCode="IM-"+Math.random().toString(36).slice(2,8).toUpperCase();
    const created=await sb.from("profiles").insert({
      user_id:user.id,
      display_name:user.email?.split("@")[0]||"Athlet",
      friend_code:friendCode
    }).select().single();
    profileRow=created.data;
  }
  await loadSocial();
}
async function loadSocial(){
  if(!user)return;
  const result=await sb.from("friend_requests")
    .select("id,sender_id,receiver_id,status,sender:profiles!friend_requests_sender_id_fkey(display_name,friend_code,user_id),receiver:profiles!friend_requests_receiver_id_fkey(display_name,friend_code,user_id)")
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
  requests=result.data||[];
  const shared=await sb.from("shared_workouts")
    .select("id,workout,owner:profiles!shared_workouts_owner_id_fkey(display_name,friend_code)")
    .eq("recipient_id",user.id)
    .order("created_at",{ascending:false});
  sharedWorkouts=shared.data||[];
}
async function authenticate(mode){
  const email=document.getElementById("email").value.trim();
  const password=document.getElementById("password").value;
  if(!email||!password)return toast("E-Mail und Passwort eingeben");
  const result=mode==="signup"
    ? await sb.auth.signUp({email,password})
    : await sb.auth.signInWithPassword({email,password});
  if(result.error)return toast(result.error.message);
  if(!result.data.session)return toast("Bitte E-Mail bestätigen");
  user=result.data.user;
  await loadCloud();
  render();
}
async function shareWorkout(id){
  if(!friends.length)return toast("Füge zuerst einen Freund hinzu");
  const names=friends.map((friend,index)=>`${index+1}: ${friend.display_name}`).join("\n");
  const choice=prompt(`Mit wem teilen?\n${names}`);
  const friend=friends[Number(choice)-1];
  if(!friend)return;
  const workout=db.workouts.find(item=>item.id===id);
  const {error}=await sb.from("shared_workouts").insert({
    owner_id:user.id,
    recipient_id:friend.user_id,
    workout
  });
  toast(error?error.message:"Workout geteilt");
}

function render(){
  let content;
  if(!user)content=authPage();
  else if(page==="home")content=shell(homePage());
  else if(page==="workout")content=shell(workoutPage());
  else if(page==="history")content=shell(historyPage());
  else if(page==="plans")content=shell(plansPage());
  else if(page==="exercises")content=shell(exercisesPage());
  else if(page==="friends")content=shell(friendsPage());
  else content=shell(profilePage());
  app.innerHTML=content;
  bind();
}

function bind(){
  document.querySelectorAll("[data-page]").forEach(button=>button.onclick=()=>{
    page=button.dataset.page;
    render();
  });
  document.getElementById("profileButton")?.addEventListener("click",()=>{
    page="profile";render();
  });
  document.getElementById("friendsButton")?.addEventListener("click",async()=>{
    await loadSocial();page="friends";render();
  });
  document.getElementById("login")?.addEventListener("click",()=>authenticate("login"));
  document.getElementById("signup")?.addEventListener("click",()=>authenticate("signup"));

  document.querySelectorAll(".plan-pick").forEach(input=>input.onchange=()=>{
    const current=selectedOrder();
    if(input.checked&&!current.includes(input.value))current.push(input.value);
    if(!input.checked){
      const index=current.indexOf(input.value);
      if(index>=0)current.splice(index,1);
    }
    renderPlanOrder(current);
  });
  document.getElementById("savePlan")?.addEventListener("click",async()=>{
    const name=document.getElementById("planName").value.trim();
    const checked=[...document.querySelectorAll(".plan-pick:checked")];
    if(!name||!checked.length)return toast("Name und Übungen auswählen");
    const checkedIds=checked.map(input=>input.value);
    let exerciseIds=selectedOrder().filter(id=>checkedIds.includes(id));
    checkedIds.forEach(id=>{if(!exerciseIds.includes(id))exerciseIds.push(id)});
    const prescriptions=exerciseIds.map(id=>({
      exerciseId:id,
      sets:+document.querySelector(`.plan-sets[data-id="${id}"]`).value||3,
      reps:+document.querySelector(`.plan-reps[data-id="${id}"]`).value||10
    }));
    const editId=document.getElementById("editPlanId").value;
    if(editId){
      const plan=db.plans.find(item=>item.id===editId);
      if(plan){
        plan.name=name;plan.exerciseIds=exerciseIds;plan.prescriptions=prescriptions;
      }
      toast("Plan aktualisiert");
    }else{
      db.plans.push({id:uid(),name,exerciseIds,prescriptions});
      toast("Plan gespeichert");
    }
    save();await sync();render();
  });
  document.querySelectorAll(".start-plan").forEach(button=>button.onclick=()=>{
    page="workout";render();
    setTimeout(()=>{
      document.getElementById("workoutPlan").value=button.dataset.id;
      loadWorkoutPlan();
    },20);
  });
  document.querySelectorAll(".edit-plan").forEach(button=>button.onclick=()=>{
    const plan=db.plans.find(item=>item.id===button.dataset.id);
    if(!plan)return;
    document.getElementById("editPlanId").value=plan.id;
    document.getElementById("planName").value=plan.name;
    document.getElementById("planFormTitle").textContent="Plan bearbeiten";
    document.getElementById("cancelPlanEdit").hidden=false;
    document.querySelectorAll(".plan-pick").forEach(input=>{
      input.checked=plan.exerciseIds.includes(input.value);
      const prescription=plan.prescriptions?.find(item=>item.exerciseId===input.value);
      if(prescription){
        document.querySelector(`.plan-sets[data-id="${input.value}"]`).value=prescription.sets;
        document.querySelector(`.plan-reps[data-id="${input.value}"]`).value=prescription.reps;
      }
    });
    renderPlanOrder(plan.exerciseIds);
    window.scrollTo({top:0,behavior:"smooth"});
  });
  document.querySelectorAll(".delete-plan").forEach(button=>button.onclick=async()=>{
    db.plans=db.plans.filter(item=>item.id!==button.dataset.id);
    save();await sync();render();toast("Plan gelöscht");
  });
  document.getElementById("cancelPlanEdit")?.addEventListener("click",render);

  const planSelect=document.getElementById("workoutPlan");
  if(planSelect){
    planSelect.onchange=loadWorkoutPlan;
    loadWorkoutPlan();
  }

  document.getElementById("saveExercise")?.addEventListener("click",async()=>{
    const name=document.getElementById("exerciseName").value.trim();
    if(!name)return toast("Name fehlt");
    db.exercises.push({
      id:uid(),
      name,
      muscle:document.getElementById("exerciseMuscle").value||"Sonstige",
      type:document.getElementById("exerciseType").value
    });
    save();await sync();render();
  });
  document.querySelectorAll(".delete-exercise").forEach(button=>button.onclick=async()=>{
    db.exercises=db.exercises.filter(item=>item.id!==button.dataset.id);
    db.plans.forEach(plan=>{
      plan.exerciseIds=plan.exerciseIds.filter(id=>id!==button.dataset.id);
      plan.prescriptions=(plan.prescriptions||[]).filter(item=>item.exerciseId!==button.dataset.id);
    });
    save();await sync();render();
  });

  document.querySelectorAll(".share-workout").forEach(button=>button.onclick=()=>shareWorkout(button.dataset.id));

  document.getElementById("saveProfile")?.addEventListener("click",async()=>{
    const displayName=document.getElementById("displayName").value.trim()||"Athlet";
    db.profile.displayName=displayName;
    db.profile.height=document.getElementById("height").value;
    db.profile.age=document.getElementById("age").value;
    db.profile.weight=document.getElementById("weight").value;
    db.profile.goalWeight=document.getElementById("goalWeight").value;
    const photo=document.getElementById("profilePhoto").files[0];
    if(photo)db.profile.photo=await resizeImage(photo,600,.8);
    await sb.from("profiles").update({display_name:displayName}).eq("user_id",user.id);
    if(profileRow)profileRow.display_name=displayName;
    save();await sync();render();toast("Profil gespeichert");
  });
  document.getElementById("addWeight")?.addEventListener("click",async()=>{
    const weight=document.getElementById("weightValue").value;
    if(!weight)return toast("Gewicht fehlt");
    db.bodyMetrics.push({id:uid(),date:document.getElementById("weightDate").value,weight});
    db.profile.weight=weight;
    save();await sync();render();
  });
  document.getElementById("addMeasurement")?.addEventListener("click",async()=>{
    db.measurements.push({
      id:uid(),
      date:document.getElementById("measurementDate").value,
      chest:document.getElementById("chest").value,
      waist:document.getElementById("waist").value,
      arm:document.getElementById("arm").value,
      thigh:document.getElementById("thigh").value
    });
    save();await sync();render();
  });
  document.getElementById("addProgressPhoto")?.addEventListener("click",async()=>{
    const file=document.getElementById("progressPhoto").files[0];
    if(!file)return toast("Bitte Foto auswählen");
    db.progressPhotos.push({
      id:uid(),
      date:document.getElementById("photoDate").value,
      data:await resizeImage(file)
    });
    save();await sync();render();
  });
  if(page==="profile")setTimeout(drawBodyChart,20);

  document.getElementById("sendRequest")?.addEventListener("click",async()=>{
    const code=document.getElementById("friendCode").value.trim().toUpperCase();
    if(!code)return toast("Code fehlt");
    const target=await sb.from("profiles").select("user_id").eq("friend_code",code).maybeSingle();
    if(!target.data)return toast("Code nicht gefunden");
    if(target.data.user_id===user.id)return toast("Das ist dein eigener Code");
    const result=await sb.from("friend_requests").insert({
      sender_id:user.id,
      receiver_id:target.data.user_id,
      status:"pending"
    });
    if(result.error)return toast(result.error.message);
    await loadSocial();render();toast("Anfrage gesendet");
  });
  document.querySelectorAll(".accept-request").forEach(button=>button.onclick=async()=>{
    await sb.from("friend_requests").update({status:"accepted"}).eq("id",button.dataset.id);
    await loadSocial();render();
  });
  document.querySelectorAll(".reject-request").forEach(button=>button.onclick=async()=>{
    await sb.from("friend_requests").update({status:"rejected"}).eq("id",button.dataset.id);
    await loadSocial();render();
  });
  document.querySelectorAll(".import-shared").forEach(button=>button.onclick=async()=>{
    const item=sharedWorkouts.find(entry=>entry.id===button.dataset.id);
    if(!item)return;
    const copy=structuredClone(item.workout);
    copy.id=uid();
    copy.name=`${copy.name} – geteilt`;
    db.workouts.unshift(copy);
    save();await sync();page="history";render();
  });

  document.getElementById("logout")?.addEventListener("click",async()=>{
    await sb.auth.signOut();
    user=null;profileRow=null;friends=[];requests=[];sharedWorkouts=[];
    render();
  });
}

async function init(){
  if(!sb){
    app.innerHTML='<div class="app"><div class="card auth"><h2>Ironminds</h2><div class="notice">Supabase konnte nicht geladen werden. Bitte Internetverbindung prüfen.</div></div></div>';
    return;
  }
  try{
    const {data:{session}}=await sb.auth.getSession();
    user=session?.user||null;
    if(user)await loadCloud();
    render();
  }catch(error){
    console.error(error);
    app.innerHTML=`<div class="app"><div class="card auth"><h2>Ironminds</h2><div class="notice">Startfehler: ${esc(error.message)}</div></div></div>`;
  }
}
init();
