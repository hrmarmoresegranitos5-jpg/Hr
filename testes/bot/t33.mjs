// v349: serviço com nome-lixo → pergunta ao dono se apaga
import {T,KV,env,msg,sent} from './sim.mjs';
const now=Date.now();
await T.salvarPedido(env,{id:1301,nome:'Peitoril finalizadosn',criado:now,status:'fechado',resumoApp:{itens:[{ambiente:'Peitoril',pecas:[{qtd:1,comp_cm:100,larg_cm:15}]}]}});
await T.salvarPedido(env,{id:1302,nome:'Cássio Borges',criado:now,status:'fechado',resumoApp:{itens:[{ambiente:'Soleira',pecas:[{qtd:1,comp_cm:100,larg_cm:15}]}]}});
const ag=T.agoraBahia(); console.log('hora',ag.min);
await T.prodLixoChecar(env); console.log(sent.map(x=>x.txt).join('\n'));
const r=await msg('5574991484460','',{type:'interactive',interactive:{type:'button_reply',button_reply:{id:'plx|1301|s',title:'Apagar'}}}); console.log(r);
const p=await T.lerPedido(env,1301); console.log('ERROS:', p.status==='recusado'&&!sent.some(x=>/Cássio/.test(x.txt||''))?0:1); process.exit(0);
