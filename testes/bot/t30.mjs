// v346: "duas pratileira já cortado de Cássio" — peça fora do projeto vai ao dono (não "já estava anotado")
import {T,KV,env,msg} from './sim.mjs';
const now=Date.now(), F='5574900000001';
KV.set('ponto:cfg',JSON.stringify({funcs:[{id:'1',nome:'Fabrício Morais',tel:'74900000001'}]})); KV.set('equipe:numeros',JSON.stringify({fabrica:F}));
await T.salvarPedido(env,{id:1001,nome:'Cássio Borges',criado:now-86400000,status:'fechado',fichaEnviadaEm:now-3600e3,fabResp:'1',corteEm:now-3600e3,corteFeitoPor:'1',resumoApp:{pedra:'Preto São Gabriel',itens:[{ambiente:'Lavatório',pecas:[{qtd:1,comp_cm:80,larg_cm:45}]},{ambiente:'Lavatório',pecas:[{qtd:1,comp_cm:80,larg_cm:45}]},{ambiente:'Área gourmet',pecas:[{qtd:1,comp_cm:200,larg_cm:60}]}]}});
const r=await msg(F,'duas pratileira já cortado de Cássio'); console.log(r);
console.log('ERROS:', /já estava anotado/.test(r)||!/não está no projeto/.test(r)?1:0); process.exit(0);
