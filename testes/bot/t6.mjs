import {T,KV,env} from './sim.mjs';
const now=Date.now();
KV.set('ponto:cfg',JSON.stringify({funcs:[{id:'1',nome:'Fabrício Morais',tel:'74900000001'},{id:'5',nome:'Gibson',tel:'74999994713'}]}));
await T.salvarPedido(env,{id:601,nome:'Renata Brito',status:'fechado',criado:now-5*864e5,corteEm:now-4*864e5,entregueEm:now-2*864e5,valor:1000,pago:true,recebidoEntrega:{valor:600,forma:'dinheiro'},prodLog:[{e:'corte',por:['1'],ts:now-4*864e5},{e:'instalacao',por:['5'],ts:now-2*864e5}],pecas:[{qtd:1,comp_cm:1,larg_cm:1}],estimado:{m2:1}});
console.log(await T.retroBonificacao(env,{semAviso:true}));
