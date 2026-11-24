// pontos em dobro: o funcionário registrou o corte e o dono conta de novo → não soma duas vezes
import {T,KV,env} from './sim.mjs';
const now=Date.now();
KV.set('ponto:cfg',JSON.stringify({funcs:[{id:'1',nome:'Fabrício Morais',tel:'74999990011'},{id:'3',nome:'Lucas',tel:'74999994299'}]}));
const P=(id,o)=>T.salvarPedido(env,{id,criado:now-86400000,status:'fechado',...o});
await P(201,{nome:'Cássio Borges',fabResp:'1',resumoApp:{itens:[{ambiente:'Lavatório',pecas:[{qtd:4,comp_cm:80,larg_cm:45,rot:'Bancada'}]}]},prodLog:[{e:'corte',por:['1'],ts:now-120000,frac:0.25,itens:[0]}]});
env._agBruto='Fabrício acabou de te mandar a foto ele terminou o corte de mais um lavatório';
console.log('1)', (await T.producaoStatusTool(env,{cliente:'Cássio Borges',etapa:'corte',funcionarios:['Fabrício'],item:'lavatório'})).texto);
env._agBruto='Lucas cortou mais um lavatório do Cássio';
console.log('2)', (await T.producaoStatusTool(env,{cliente:'Cássio Borges',etapa:'corte',funcionarios:['Lucas'],item:'lavatório'})).texto);
console.log('3)', (await T.producaoStatusTool(env,{cliente:'Cássio Borges',etapa:'corte',funcionarios:['Lucas'],item:'lavatório',pecas:1})).texto);
await P(202,{nome:'Maria Teste',fabResp:'1',resumoApp:{itens:[{ambiente:'Cozinha',pecas:[{qtd:2,comp_cm:200,larg_cm:60}]}]},prodLog:[{e:'corte',por:['1'],ts:now-600000},{e:'corte',por:['1'],ts:now-300000,dono:1}]});
console.log('4) limpeza:', await T.prodDuplicadosDono(env));
console.log('   Maria log:', JSON.stringify(JSON.parse(KV.get('ped:0000000000202')||KV.get('ped:202')||'{}').prodLog));
