// v347: nome de cliente mal ouvido no áudio da fábrica
import {T,KV,env} from './sim.mjs';
const now=Date.now(), L='5574900000007';
KV.set('ponto:cfg',JSON.stringify({funcs:[{id:'7',nome:'Lucas Silva',tel:'74900000007'}]}));
await T.salvarPedido(env,{id:1101,nome:'Caco Bola',criado:now,status:'fechado',fichaEnviadaEm:now,resumoApp:{itens:[{ambiente:'Soleira',pecas:[{qtd:1,comp_cm:90,larg_cm:15}]}]}});
let E=0;
globalThis.__vozResp={texto:'Essa soleira aí é de Caco Bola.',trocas:[['caput boy','Caco Bola']]};
let r=await T.vozCorrigirNomes(env,'Essa soleira aí é de caput boy.',L,false); console.log(r); if(!/Caco Bola/.test(r))E++;
globalThis.__vozResp={texto:'Terminei o do Fabrício Machado.',trocas:[['caput boy','Fabrício Machado']]}; // invenção: nome fora da lista → ignora
r=await T.vozCorrigirNomes(env,'Terminei o do caput boy.',L,false); console.log(r); if(/Machado/.test(r))E++;
r=await T.vozCorrigirNomes(env,'Essa soleira aí é de caput boy.','5574900009999',false); console.log('cliente:',r); if(/Caco/.test(r))E++;
console.log('ERROS:',E); process.exit(0);
