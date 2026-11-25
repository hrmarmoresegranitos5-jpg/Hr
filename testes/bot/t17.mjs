// v330: recado guardado (eq:pend) não pode engolir a foto/mensagem do funcionário
import {T,KV,env,msg} from './sim.mjs';
const now=Date.now();
KV.set('ponto:cfg',JSON.stringify({funcs:[{id:'3',nome:'Lucas',tel:'74999994299'}]}));
await T.salvarPedido(env,{id:201,nome:'Ezio Caveira',status:'fechado',criado:now-9e7,fichaEnviadaEm:now-36e5,acabResp:'3',corteEm:now-8e6,resumoApp:{pedra:'Branco',itens:[{ambiente:'Divisória',pecas:[{qtd:2,comp_cm:40,larg_cm:80}]}]}});
KV.set('eq:pend:99994299',JSON.stringify({lista:[{texto:'📈 *Lucas, a sua semana* 8 ponto(s)'}]}));
console.log(await msg('5574999994299','',{type:'image',image:{id:'i1',mime_type:'image/jpeg',caption:'Divisórias do Ezio caveira finalizadas'}}));
const p=await T.lerPedido(env,201); console.log('acabEm', !!p.acabEm, JSON.stringify(p.prodLog));
process.exit(0);
