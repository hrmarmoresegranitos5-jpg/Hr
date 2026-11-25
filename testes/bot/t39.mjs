// v358d: rajada de mensagens do cliente no D1: só a última responde, juntando tudo
import {T,env} from './sim.mjs';
import {d1} from './d1sqlite.mjs';
const ka=setInterval(()=>{},500);
const e2={...env,ESPERA_CLIENTE:'1',HR_DB:d1()}; let e=0;
const mk=(id,t)=>({from:'5511900000099',id,type:'text',text:{body:t}});
const a=mk('w1','Ops'),b=mk('w2','Parede fundo e direita'),c=mk('w3','Corrigindo');
const p1=T.esperarRajada(e2,a); await new Promise(r=>setTimeout(r,300)); const p2=T.esperarRajada(e2,b); await new Promise(r=>setTimeout(r,300)); const p3=T.esperarRajada(e2,c);
const r=await Promise.all([p1,p2,p3]); console.log(r, c.text.body);
if(!(r[0]===true&&r[1]===true&&r[2]===false)){e++;console.log('ERRO só a última responde');}
if(!/Ops[\s\S]*direita[\s\S]*Corrigindo/.test(c.text.body)){e++;console.log('ERRO juntar');}
console.log('ERROS:',e); process.exit(e?1:0);
