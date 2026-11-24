import {T,KV,env,msg} from './sim.mjs';
const now=Date.now();
KV.set('ponto:cfg',JSON.stringify({funcs:[{id:'1',nome:'Fabrício Morais',tel:'74900000001'},{id:'3',nome:'Lucas',tel:'74999994299'}]}));
KV.set('ult:5574900000001',String(now));KV.set('ult:5574999994299',String(now));
const P=(id,o)=>T.salvarPedido(env,{id,criado:now-86400000,status:'fechado',fichaEnviadaEm:now-7200e3,...o});
await P(301,{nome:'Jacob da Mata',fabResp:'1',acabResp:'3',resumoApp:{pedra:'Preto São Gabriel',itens:[{ambiente:'Peitoril',pecas:[{qtd:2,comp_cm:120,larg_cm:15}]}]}});
const F='5574900000001',L='5574999994299';
for (const [f,t] of [[F,'cortei o do Jacó'],[F,'cortei o do Jacó'],[L,'terminei o acabamento do Jacó'],[L,'terminei o acabamento do Jacó'],[L,'Não contou meus pontos'],[F,'quantos pontos eu tenho?']]) { console.log('\n### '+String(f).slice(-4)+': '+t); console.log(await msg(f,t)); }
