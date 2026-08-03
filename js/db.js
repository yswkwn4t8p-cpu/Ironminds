export const KEY="ironminds-v4-clean";
export const seed={exercises:[{id:"e1",name:"Bankdrücken",muscle:"Brust",type:"Kraft"},{id:"e2",name:"Kniebeugen",muscle:"Beine",type:"Kraft"},{id:"e3",name:"Kreuzheben",muscle:"Rücken",type:"Kraft"},{id:"e4",name:"Schulterdrücken",muscle:"Schultern",type:"Kraft"}],plans:[],workouts:[],profile:{displayName:"",height:"",weight:"",age:"",goalWeight:"",photo:""},bodyMetrics:[],measurements:[],progressPhotos:[]};
export function loadLocal(){try{return JSON.parse(localStorage.getItem(KEY))||structuredClone(seed)}catch{return structuredClone(seed)}}
export function saveLocal(db){localStorage.setItem(KEY,JSON.stringify(db))}
export const uid=()=>crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);
