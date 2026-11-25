// v339: Hugo "2 lavatório finalizado ! \nCliente Esio caveira" (23/11) recebeu o resumo da semana e nenhum ponto
import {T,KV,env,msg,sent} from './sim.mjs';
import {d1} from './d1sqlite.mjs';
env.HR_DB=d1();
const now=Date.now(), H='5574900000003';
KV.set('ponto:cfg',JSON.stringify({funcs:[{id:'3',nome:'Hugo Santos',tel:'74900000003'},{id:'1',nome:'Fabrício Morais',tel:'74900000001'}]})); KV.set('equipe:numeros',JSON.stringify({fabrica:'5574900000001',fab2:H}));
const P=(id,o)=>T.salvarPedido(env,{id,criado:now-86400000,status:'fechado',fichaEnviadaEm:now-3600e3,...o});
await P(301,{nome:'Ésio caveira',fabResp:'1',fab2Resp:'3',corteEm:now-86400000,resumoApp:{pedra:'Branco Itaúnas',itens:[{ambiente:'Lavatório',pecas:[{qtd:1,comp_cm:80,larg_cm:45}]},{ambiente:'Lavatório',pecas:[{qtd:1,comp_cm:80,larg_cm:45}]},{ambiente:'Divisória',pecas:[{qtd:2,comp_cm:100,larg_cm:15}]}]}});
await P(302,{nome:'Cássio Borges',fabResp:'1',fab2Resp:'3',resumoApp:{pedra:'Branco Pinta Verde',itens:[{ambiente:'Lavatório',pecas:[{qtd:2,comp_cm:80,larg_cm:45}]}]}});
const modo=process.argv[2]||'texto';
globalThis.__fotoAlvo='301'; globalThis.__fotoCerteza='alta';
if(modo==='foto') console.log(await msg(H,'',{type:'image',image:{id:'midE',mime_type:'image/jpeg',caption:'2 lavatório finalizado ! \nCliente Esio caveira'}}));
else console.log(await msg(H,'2 lavatório finalizado ! \nCliente Esio caveira'));
const p=await T.lerPedido(env,301); console.log('log:',JSON.stringify(p.prodLog||[]), 'fabPronto:',!!p.fabProntoEm, 'acab:',!!p.acabEm);
process.exit(0);
