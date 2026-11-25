import fs from 'fs';
import {T,KV,env,msg,ai} from '../sim.mjs';
const now=Date.now();
KV.set('ponto:cfg',JSON.stringify({funcs:[{id:'1',nome:'Fabrício Morais',tel:'74999990011'},{id:'2',nome:'Gibson',tel:'74999990022'},{id:'3',nome:'Lucas',tel:'74999994299'}]}));
KV.set('equipe:numeros',JSON.stringify({fabrica:'5574999990011',entrega:'5574999990022'}));
const P=(id,o)=>T.salvarPedido(env,{id,criado:now-86400000,status:'fechado',fichaEnviadaEm:now-3600e3,...o});
await P(101,{nome:'Jacob da Mata',fabResp:'1',resumoApp:{pedra:'Preto São Gabriel',itens:[{ambiente:'Peitoril',pecas:[{qtd:2,comp_cm:120,larg_cm:15}]}]}});
await P(102,{nome:'Cássio Borges',fabResp:'1',acabResp:'3',resumoApp:{pedra:'Branco Pinta Verde',itens:[{ambiente:'Lavatório',pecas:[{qtd:2,comp_cm:80,larg_cm:45}]}]}});
await P(103,{nome:'Osmailton Souza',numero:'5574988880003',fabResp:'1',entResp:'2',corteEm:now-9e6,fabProntoEm:now-7200e3,entregaEnviadaEm:now-3600e3,valor:500,resumoApp:{pedra:'Preto',itens:[{ambiente:'Cozinha',pecas:[{qtd:1,comp_cm:200,larg_cm:60}]}]}});
await P(104,{nome:'Poliana Reis',entResp:'2',corteEm:now-9e6,fabProntoEm:now-7200e3,resumoApp:{pedra:'Branco Siena',itens:[{ambiente:'Cozinha',pecas:[{qtd:1,comp_cm:250,larg_cm:60}]}]}});
const N={F:'5574999990011',G:'5574999990022',L:'5574999994299'};
const foto=(cap)=>({type:'image',image:{id:'img'+Math.random().toString(36).slice(2,7),mime_type:'image/jpeg',...(cap?{caption:cap}:{})}});
const casos=[
 ['F','FOTO','corte do Jacó pronto'],
 ['F','FOTO',''],
 ['F','TXT','é do Cássio'],
 ['F','FOTO','peitoril finalizado'],
 ['F','FOTO','soleira itaunas cortada'],
 ['L','FOTO','acabamento do Cássio'],
 ['L','FOTO',''],
 ['L','FOTO',''],
 ['G','TXT','instalei a cozinha da Poliana'],
 ['G','FOTO',''],
 ['G','FOTO','entregue Osmailton'],
 ['F','FOTO','terminei'],
 ['F','FOTO','cortei 1 peitoril do Jacó, falta 1'],
];
const out=[];
for (const [k,t,c] of casos){ const r=await msg(N[k], t==='TXT'?c:'', t==='FOTO'?foto(c):{}); out.push(`[${k}] ${t} "${c}"\n   → ${r.replace(/\n/g,' ⏎ ').slice(0,420)}`); }
const st=id=>{const p=JSON.parse(KV.get('ped:'+id)||'{}');return `${p.nome}: corte=${!!p.corteEm} pronto=${!!p.fabProntoEm} acab=${!!p.acabEm} entregue=${!!p.entregueEm} fotos=${(p.fotos||[]).length} log=${JSON.stringify((p.prodLog||[]).map(x=>x.e+':'+(x.por||[]).join('+')))}`};
out.push('\nESTADO:\n'+[101,102,103,104].map(st).join('\n'));
fs.writeFileSync(new URL('./fotos.txt',import.meta.url).pathname,out.join('\n')); console.log('ok'); process.exit(0);
