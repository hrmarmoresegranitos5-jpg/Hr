// v354: projeto com vários ambientes — "terminei o lavatório do Cássio" pergunta a MEDIDA; resposta "66x50" marca só aquele
import {T,KV,env,msg} from './sim.mjs';
const now=Date.now(), F='5574900000001';
KV.set('ponto:cfg',JSON.stringify({funcs:[{id:'1',nome:'Fabrício Morais',tel:'74900000001'}]})); KV.set('equipe:numeros',JSON.stringify({fabrica:F}));
await T.salvarPedido(env,{id:1501,nome:'Cássio Borges',criado:now-86400000,status:'fechado',fichaEnviadaEm:now-3600e3,fabResp:'1',resumoApp:{pedra:'Preto São Gabriel',itens:[{ambiente:'Lavatório',pecas:[{qtd:1,comp_cm:66,larg_cm:50}]},{ambiente:'Lavatório',pecas:[{qtd:1,comp_cm:90,larg_cm:50}]},{ambiente:'Área gourmet',pecas:[{qtd:1,comp_cm:133,larg_cm:60}]}]}});
let r=await msg(F,'cortei o lavatório do Cássio'); console.log(r);
let E=0; if(!/medida/.test(r))E++;
r=await msg(F,'90x50'); console.log(r);
const p=await T.lerPedido(env,1501); console.log('prog',JSON.stringify(p.prog)); if(!(p.prog&&p.prog.corte&&p.prog.corte.length===1&&p.prog.corte[0]===1))E++;
r=await msg(F,'cortei a área gourmet do Cássio 133 x 60'); console.log(r);
const p2=await T.lerPedido(env,1501); console.log('prog',JSON.stringify(p2.prog)); if(p2.prog.corte.length!==2)E++;
console.log('ERROS:',E); process.exit(0);
