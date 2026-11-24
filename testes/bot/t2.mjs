import {T,KV,env,msg} from './sim.mjs';
const now=Date.now();
KV.set('ponto:cfg',JSON.stringify({funcs:[{id:'1',nome:'Fabrício Morais',tel:'74900000001'},{id:'2',nome:'Jefferson',tel:'74900000005'},{id:'5',nome:'Gibson',tel:'74999994713'}]}));
KV.set('ult:5574900000005',String(now)); KV.set('ult:5574999994713',String(now));
const P=(id,o)=>T.salvarPedido(env,{id,criado:now-86400000,status:'fechado',fichaEnviadaEm:now-7200e3,...o});
await P(201,{nome:'Osmailton',fabResp:'1',entResp:'2',corteEm:now-3600e3,fabProntoEm:now-1800e3,entregaEnviadaEm:now-1700e3});
await P(202,{nome:'Maria Souza',numero:'5574999990000',valor:850,fabResp:'1',entResp:'5',fabProntoEm:now-1800e3,entregaEnviadaEm:now-1700e3,resumoApp:{pedra:'Preto São Gabriel',itens:[{ambiente:'Soleira',pecas:[{qtd:3,comp_cm:90,larg_cm:15}]}]}});
const J='5574900000005', G='5574999994713';
for (const [f,t] of [[J,'instalei o do Osmailton, recebi 500 no dinheiro'],[G,'entreguei o da Maria, ela pagou 800 no pix'],[G,'quantos pontos eu tenho?']]) { console.log('\n### '+t); console.log(await msg(f,t)); }
