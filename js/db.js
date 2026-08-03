export const LOCAL_KEY="ironminds-v3";
export const seed={exercises:[{id:"e1",name:"Bankdrücken",muscle:"Brust",type:"Kraft"},{id:"e2",name:"Kniebeugen",muscle:"Beine",type:"Kraft"},{id:"e3",name:"Kreuzheben",muscle:"Rücken",type:"Kraft"},{id:"e4",name:"Schulterdrücken",muscle:"Schultern",type:"Kraft"},{id:"e5",name:"Klimmzüge",muscle:"Rücken",type:"Körpergewicht"}],plans:[],workouts:[],bodyMetrics:[],measurements:[],progressPhotos:[],profile:{height:"",weight:"",age:"",goalWeight:"",photo:""}};
export function loadLocal(){try{return JSON.parse(localStorage.getItem(LOCAL_KEY))||structuredClone(seed)}catch{return structuredClone(seed)}}
export function saveLocal(db){localStorage.setItem(LOCAL_KEY,JSON.stringify(db))}
export const uid=()=>crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);
