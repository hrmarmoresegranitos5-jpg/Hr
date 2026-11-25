// v331: casos reais do Gibson — "Finalizando o serviço de poliano" com a instalação começada; "Ok" sem "não entendi"; "Ss" à pergunta vai ao dono
import {T,KV,env,msg} from './sim.mjs';
const now=Date.now();
KV.set('ponto:cfg',JSON.stringify({funcs:[{id:'2',nome:'Gibson',tel:'74900000002'}]}));
KV.set('equipe:numeros',JSON.stringify({entrega:'5574900000002'}));
await T.salvarPedido(env,{id:301,nome:'Poliano dos Anjos',status:'fechado',criado:now-9e7,fichaEnviadaEm:now-36e5,entResp:'2',corteEm:now-8e6,fabProntoEm:now-7e6,entregaEnviadaEm:now-6e6,instIniEm:now-5e6,instIniPor:'2',resumoApp:{pedra:'Preto',itens:[{ambiente:'Cozinha',pecas:[{qtd:1,comp_cm:250,larg_cm:60}]}]}});
const G='5574900000002', foto=c=>({type:'image',image:{id:'i'+Math.random(),mime_type:'image/jpeg',caption:c}});
console.log('### foto'); console.log(await msg(G,'',foto('Finalizando o serviço de poliano')));
const p=await T.lerPedido(env,301); console.log('entregue?', !!p.entregueEm);
console.log('### ok'); console.log(await msg(G,'Ok'));
process.exit(0);
