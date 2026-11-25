import fs from 'fs';
import {T,KV,env,msg,ai} from '../sim.mjs';
const now=Date.now();
KV.set('ponto:cfg',JSON.stringify({funcs:[{id:'1',nome:'Fabrício Morais',tel:'74999990011'},{id:'2',nome:'Gibson',tel:'74999990022'},{id:'3',nome:'Lucas',tel:'74999994299'},{id:'4',nome:'Hugo',tel:'74999990001'}]}));
KV.set('equipe:numeros',JSON.stringify({fabrica:'5574999990011',entrega:'5574999990022'}));
const P=(id,o)=>T.salvarPedido(env,{id,criado:now-86400000,status:'fechado',fichaEnviadaEm:now-3600e3,...o});
await P(101,{nome:'Jacob da Mata',numero:'5574988880001',fabResp:'1',resumoApp:{pedra:'Preto São Gabriel',itens:[{ambiente:'Peitoril',pecas:[{qtd:2,comp_cm:120,larg_cm:15}]}]}});
await P(102,{nome:'Cássio Borges',fabResp:'1',resumoApp:{pedra:'Branco Pinta Verde',itens:[{ambiente:'Lavatório',pecas:[{qtd:2,comp_cm:80,larg_cm:45}]}]}});
await P(103,{nome:'Osmailton Souza',numero:'5574988880003',fabResp:'1',entResp:'2',fabProntoEm:now-7200e3,entregaEnviadaEm:now-3600e3,valor:500,resumoApp:{pedra:'Preto',itens:[{ambiente:'Cozinha',pecas:[{qtd:1,comp_cm:200,larg_cm:60}]}]}});
await P(104,{nome:'Poliana Reis',entResp:'2',fabProntoEm:now-7200e3,resumoApp:{pedra:'Branco Siena',itens:[{ambiente:'Cozinha',pecas:[{qtd:1,comp_cm:250,larg_cm:60}]}]}});
KV.set('liv:1',JSON.stringify({id:'1',cliente:'Jailton Santos',valor:5000,pagamentos:[{data:'2026-11-20',valor:2000,forma:'pix'}]}));
const DONO='5574991484460', NUM={F:'5574999990011',G:'5574999990022'};
const out=[]; const OUTF=process.env.OUT||'./resultado.txt';
const run=async(from,t)=>{ const n0=ai.length; const r=await msg(from,t); const ia=ai.slice(n0).map(s=>s.slice(0,30)); out.push({t,from:from===DONO?'D':from.slice(-4),ia:ia.length?ia.join(' | '):'',r:r.replace(/\n/g,' ⏎ ').slice(0,1400)}); await new Promise(r=>setTimeout(r,5)); };
for (const l of fs.readFileSync(new URL('./dono.txt',import.meta.url),'utf8').split('\n')) { if(!l.trim()||l.startsWith('#')) continue; await run(DONO,l); }
for (const l of fs.readFileSync(new URL(process.env.FUNC||"./func.txt",import.meta.url),"utf8").split("\n")) { if(!l.trim()) continue; const [k,t]=l.split('|'); await run(NUM[k],t); }
fs.writeFileSync(new URL(OUTF,import.meta.url).pathname, out.map(o=>`[${o.from}] ${o.t}\n   IA: ${o.ia||'—'}\n   → ${o.r||'(sem resposta)'}`).join('\n'));
console.log('ok',out.length); process.exit(0);
