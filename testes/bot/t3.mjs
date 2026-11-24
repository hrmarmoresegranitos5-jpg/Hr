import {T,KV,env,msg} from './sim.mjs';
const now=Date.now();
KV.set('ponto:cfg',JSON.stringify({funcs:[{id:'2',nome:'Jefferson',tel:'71999990022'},{id:'5',nome:'Gibson',tel:'74999994713'}]}));
KV.set('ult:5571999990022',String(now)); KV.set('ult:5574999994713',String(now));
const P=(id,o)=>T.salvarPedido(env,{id,criado:now-86400000,status:'fechado',fichaEnviadaEm:now-7200e3,...o});
await P(201,{nome:'Osmailton',fabResp:'1',entResp:'2',corteEm:now-3600e3,fabProntoEm:now-1800e3,entregaEnviadaEm:now-1700e3});
await P(202,{nome:'Maria Souza',numero:'5574999990000',valor:850,forma_pagto:'dinheiro',fabResp:'1',entResp:'5',fabProntoEm:now-1800e3,entregaEnviadaEm:now-1700e3,resumoApp:{pedra:'Preto São Gabriel',itens:[{ambiente:'Lavatório',pecas:[{qtd:1,comp_cm:90,larg_cm:50}]}]}});
const J='5571999990022', G='5574999994713';
console.log(await msg(J,'instalei o do Osmailton, recebi 500 no dinheiro'));
console.log('--- foto'); console.log(await msg(J,'',{type:'image',image:{id:'m123',mime_type:'image/jpeg'}}));
console.log('--- G'); console.log(await msg(G,'instalei o da Maria, ela pagou 800 no dinheiro'));
console.log(await msg(G,'',{type:'image',image:{id:'m124',mime_type:'image/jpeg'}}));
for (const k of [201,202]) { const raw=[...KV.entries()].find(([kk])=>kk.endsWith(':'+k)); const p=raw&&JSON.parse(raw[1]); console.log(k, p&&{entregue:!!p.entregueEm, receb:p.recebido||p.receb||p.pagtoEntrega, valor:p.valor}); }
