// v352: Fabrício "As duas soleira do branco Siena já cortado" → Cássio (lavatórios Preto São Gabriel) → serviço separado, dono confirma, pontos entram
import {T,KV,env,msg} from './sim.mjs';
const now=Date.now(), F='5574900000001', D='5574991484460';
KV.set('ponto:cfg',JSON.stringify({funcs:[{id:'1',nome:'Fabrício Morais',tel:'74900000001'}]})); KV.set('equipe:numeros',JSON.stringify({fabrica:F}));
KV.set('cfg:historico',JSON.stringify({ts:now,clientes:[],orcamentos:[{id:'a',cliente:'Cássio Borges',projeto:'Soleira',material:'Branco Siena',valor:505.38,m2:0.6,secao:'pendente',data:'2026-11-24',amb:'Soleira: 2x 90x15'},{id:'b',cliente:'Cássio Borges',projeto:'Lavatórios',material:'Preto São Gabriel',valor:1744,secao:'aceito',data:'2026-11-10'}]}));
await T.salvarPedido(env,{id:1401,nome:'Cássio Borges',criado:now-86400000,status:'fechado',fichaEnviadaEm:now-3600e3,fabResp:'1',corteEm:now-3600e3,corteFeitoPor:'1',resumoApp:{pedra:'Preto São Gabriel',itens:[{ambiente:'Lavatório',pecas:[{qtd:1,comp_cm:80,larg_cm:45}]},{ambiente:'Área gourmet',pecas:[{qtd:1,comp_cm:200,larg_cm:60}]}]}});
console.log(await msg(F,'As duas soleira do branco Siena já cortado de Cássio Borges'));
const ek=[...KV.keys()].find(k=>k.startsWith('etpconf:')); console.log('conf:',KV.get(ek));
console.log(await msg(D,'',{type:'interactive',interactive:{type:'button_reply',button_reply:{id:'etpc|'+ek.slice(8)+'|s',title:'Sim'}}}));
const m=await T.metasPontos(env,'2000-01-01','2100-01-01'); console.log('pts',JSON.stringify(m['1']&&m['1'].tarefas));
const ps=await T.pedidosProducao(env,()=>true); console.log(ps.map(p=>p.nome+' | '+(p.projetoApp||'')+' | '+(p.resumoApp&&p.resumoApp.pedra)).join('\n'));
console.log('ERROS:', ps.length===2 && m['1'] && m['1'].tarefas.some(t=>t.pid!=1401)?0:1); process.exit(0);
