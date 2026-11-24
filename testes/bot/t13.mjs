// v324: "ele pagou 150" (estava 153,20 e já no app) → pede a correção ao app e acerta o livro
import {T,KV,env} from './sim.mjs';
const ts=Date.now()-3600000, k='fin:'+String(ts).padStart(13,'0')+'-7';
KV.set(k,JSON.stringify({k,waId:'wa'+ts+'7',type:'in',desc:'Recebido de Clériston Souza (dinheiro)',value:153.2,date:'2026-11-24',importado:true}));
KV.set('liv:1',JSON.stringify({id:'1',cliente:'Clériston Souza',valor:306.4,pagamentos:[{data:'2026-11-24',valor:153.2,forma:'dinheiro'}]}));
console.log((await T.corrigirPagamentoCliente(env,{cliente:'Clériston',valor_certo:150})).texto);
console.log(JSON.stringify(await T.correcoesPendentes(env)));
