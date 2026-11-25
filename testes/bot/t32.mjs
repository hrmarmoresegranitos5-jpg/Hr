// caso real 25/11 14:02 — Lucas: uma soleira era do Cássio, a outra do "Caco Bola"
import {T,KV,env,msg} from './sim.mjs';
const now=Date.now(), L='5574900000007';
KV.set('ponto:cfg',JSON.stringify({funcs:[{id:'7',nome:'Lucas Silva',tel:'74900000007'},{id:'1',nome:'Fabrício Morais',tel:'74900000001'}]})); KV.set('equipe:numeros',JSON.stringify({fabrica:'5574900000001',fab2:L}));
await T.salvarPedido(env,{id:1201,nome:'Cássio Borges',criado:now-86400000,status:'fechado',fichaEnviadaEm:now-3600e3,fabResp:'1',acabResp:'7',corteEm:now-7200e3,corteFeitoPor:'1',acabEm:now-3600e3,fabProntoEm:now-3600e3,prodLog:[{e:'acabamento',por:['7'],ts:now-3600e3,ap:1,apId:'x1'}],resumoApp:{pedra:'Branco Siena',itens:[{ambiente:'Soleira',pecas:[{qtd:2,comp_cm:90,larg_cm:15}]}]}});
await T.salvarPedido(env,{id:1202,nome:'Clériston',criado:now-86400000,status:'fechado',fichaEnviadaEm:now-3600e3,fabResp:'1',acabResp:'7',corteEm:now-7200e3,corteFeitoPor:'1',resumoApp:{pedra:'Branco Itaúnas',itens:[{ambiente:'Soleira',pecas:[{qtd:1,comp_cm:90,larg_cm:15}]}]}});
globalThis.__interpResp={tipo:'pergunta',pergunta:'Lucas, a outra soleira que você finalizou é de qual cliente?'};
let i=0; for (const t of ['Soleira de Cássio Borges finalizada','Aí eram duas... uma soleira só. Dei acabamento só em uma e fertilidade na outra. Aí no caso a outra já tá finalizada.','Essa soleira aí é de Caco Bola.','aí a do cliente caco bola']) { if(++i===3) globalThis.__interpResp={tipo:'registro',frases:['terminei o acabamento da soleira do Caco Bola']}; console.log('\n>>',t); console.log(await msg(L,t)); }
const c=await T.lerPedido(env,1202); console.log('Clériston pronto?',!!c.fabProntoEm); console.log('ERROS:', c.fabProntoEm?1:0); process.exit(0);
