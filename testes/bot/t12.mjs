import {T,KV,env,sent} from './sim.mjs';
KV.set('ponto:cfg',JSON.stringify({funcs:[{id:'1',nome:'Fabrício',tel:'74999990011'}]}));
const ts=Date.parse('2026-11-24T15:04:30Z');
await T.salvarPedido(env,{id:401,nome:'Cássio Borges',status:'fechado',criado:ts-9e7,corteEm:ts-8e7,fabProntoEm:ts,prontoEm:ts,entregaEnviadaEm:ts+1000,prodLog:[{e:'corte',por:['1'],ts:ts-8e7},{e:'fabricacao',por:['1'],ts}]});
KV.set('prod:fotoesp:99990011',JSON.stringify({pid:401,em:ts}));
await T.fixCassioV323(env);
const p=await T.lerPedido(env,401); console.log(JSON.stringify({corte:!!p.corteEm,pronto:!!p.fabProntoEm,ent:!!p.entregaEnviadaEm,log:p.prodLog.length}), KV.has('prod:fotoesp:99990011'));
console.log(sent.map(s=>s.txt).join('\n'));
