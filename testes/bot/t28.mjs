// v345: pedido-lixo "Peitoril finalizadosn" não pode responder "já está anotado" para quem disse "acabamento ... finalizado"
import {T,KV,env,msg} from './sim.mjs';
const now=Date.now(), L='5574900000007';
KV.set('ponto:cfg',JSON.stringify({funcs:[{id:'7',nome:'Lucas Silva',tel:'74900000007'}]})); KV.set('equipe:numeros',JSON.stringify({fab2:L}));
await T.salvarPedido(env,{id:701,nome:'Peitoril finalizadosn',criado:now-86400000,status:'fechado',prontoEm:now-3600e3,fabProntoEm:now-3600e3,prodLog:[{e:'inicio',por:['7'],ts:now-86400000}],resumoApp:{itens:[{ambiente:'Peitoril',pecas:[{qtd:1,comp_cm:100,larg_cm:15}]}]}});
await T.salvarPedido(env,{id:702,nome:'Cássio Borges',criado:now-86400000,status:'fechado',fichaEnviadaEm:now-3600e3,corteEm:now-3600e3,corteFeitoPor:'1',acabResp:'7',resumoApp:{pedra:'Branco Siena',itens:[{ambiente:'Soleira',pecas:[{qtd:2,comp_cm:90,larg_cm:15}]}]}});
const r=await msg(L,'Acabamento da soleira de Cássio Borges finalizado'); console.log(r);
console.log('ERROS:', /finalizadosn/.test(r)?1:0); process.exit(0);
