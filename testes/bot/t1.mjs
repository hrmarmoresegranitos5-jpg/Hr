import {T,KV,env,msg} from './sim.mjs';
const now=Date.now();
KV.set('ponto:cfg',JSON.stringify({funcs:[{id:'1',nome:'Fabrício Morais',tel:'74900000001'},{id:'2',nome:'Jefferson',tel:'74900000005'},{id:'3',nome:'Lucas',tel:'74999994299'},{id:'4',nome:'Hugo',tel:'74999990001'}]}));
const P=(id,o)=>T.salvarPedido(env,{id,criado:now-86400000,status:'fechado',fichaEnviadaEm:now-3600e3,...o});
await P(101,{nome:'Jacob da Mata',interesse:'peitoril',fabResp:'1',resumoApp:{pedra:'Preto São Gabriel',itens:[{ambiente:'Peitoril',pecas:[{qtd:2,comp_cm:120,larg_cm:15,rot:'Peitoril'}]}]}});
await P(102,{nome:'Cássio Borges',fabResp:'1',resumoApp:{pedra:'Preto São Gabriel',itens:[{ambiente:'Lavatório 1',pecas:[{qtd:1,comp_cm:80,larg_cm:45,rot:'Bancada'}]},{ambiente:'Lavatório 2',pecas:[{qtd:1,comp_cm:80,larg_cm:45}]},{ambiente:'Área gourmet',pecas:[{qtd:1,comp_cm:200,larg_cm:60}]}]}});
await P(103,{nome:'Osmailton',fabResp:'1',entResp:'2'});
const F='5574900000001';
for (const t of ['Os peitoril de Jacó no preto são Gabriel já cortado','Quero saber dos pontos de hoje, dos peitoris, se é preto são gabriel','terminei o corte do Osmailton','quantos pontos eu tenho?','o que tenho pra fazer?','e a cozinha que eu cortei e você não me deu os pontos?']) { console.log('\n### '+t); console.log(await msg(F,t)); }
const o=JSON.parse(KV.get('ped:103')||'null'); console.log('\nOsmailton:',o&&{pronto:!!o.fabProntoEm,entEnviada:!!o.entregaEnviadaEm});
console.log('\n### auditoria\n'+await T.auditoriaTexto(env));
