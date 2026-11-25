// v328: pedido de falta/sair cedo → botão do dono → resposta ao funcionário
import {T,KV,env,msg} from './sim.mjs';
KV.set('ponto:cfg',JSON.stringify({funcs:[{id:'1',nome:'Fabrício Morais',tel:'74999990011'}]}));
console.log(await msg('5574999990011','posso sair mais cedo hoje? tenho dentista'));
const k=[...KV.keys()].find(k=>k.startsWith('ponto:aus:')), id=k.split(':')[2];
console.log(await msg('5574991484460','',{type:'interactive',interactive:{type:'button_reply',button_reply:{id:'au_ok|'+id,title:'Pode'}}}));
console.log(await msg('5574999990011','vou chegar atrasado amanhã'));
console.log(await msg('5574999990011','posso faltar sexta?'));
console.log(await msg('5574991484460','o Fabrício não pode'));
process.exit(0);
