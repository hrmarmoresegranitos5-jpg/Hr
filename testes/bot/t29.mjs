// v346: funcionário registra (pendente) e o dono registra a mesma etapa → sai da fila, sem contar duas vezes
import {T,KV,env,msg} from './sim.mjs';
const now=Date.now(), F='5574900000001', D='5574991484460';
KV.set('ponto:cfg',JSON.stringify({funcs:[{id:'1',nome:'Fabrício Morais',tel:'74900000001'}]})); KV.set('equipe:numeros',JSON.stringify({fabrica:F}));
await T.salvarPedido(env,{id:901,nome:'Jacob da Mata',criado:now-86400000,status:'fechado',fichaEnviadaEm:now-3600e3,fabResp:'1',entrega:'retirada',resumoApp:{pedra:'Preto São Gabriel',itens:[{ambiente:'Peitoril',pecas:[{qtd:2,comp_cm:120,larg_cm:15}]}]}});
await msg(F,'terminei o corte do Jacob');
let l=(await T.aprovListar(env)).filter(x=>x.st===0); console.log('pendentes antes:',l.length);
await msg(D,'Fabrício cortou o Jacob da Mata hoje');
// simula a ferramenta do dono (o agente não roda no simulador)
env._ctx={de:'55'+'74991484460'}; console.log('tool:',JSON.stringify(await T.producaoStatusTool(env,{cliente:'Jacob da Mata',etapa:'corte',funcionarios:['Fabrício']}).catch(e=>e.message))); env._ctx=null;
l=(await T.aprovListar(env)).filter(x=>x.st===0); console.log('pendentes depois:',l.length);
const m=await T.metasPontos(env,'2000-01-01','2100-01-01'); console.log('pts Fabrício', m['1']&&m['1'].pts);
console.log('ERROS:', l.length?1:0); process.exit(0);
