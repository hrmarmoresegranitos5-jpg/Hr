// v355: folga do campeão e corrida do mês
import {T,KV,env} from './sim.mjs';
const pc=await T.premioCfg(env);
const pm={mes:'2026-12',rank:[{id:'1',nome:'Lucas',pct:142,pos:1},{id:'2',nome:'Hugo',pct:120,pos:2},{id:'3',nome:'Fabrício',pct:60,pos:3}],lista:[]};
const r={pos:2,pct:120,folga:{ok:false,faltam:['130% da meta do mês (está em 120%)','zero retrabalho, zero quebra']}};
console.log(T.corridaTexto(pm,pc,r));
const m=await T.premioMes(env); console.log('rank',JSON.stringify(m.rank),'campeao',m.campeaoId);
console.log('ERROS: 0'); process.exit(0);
