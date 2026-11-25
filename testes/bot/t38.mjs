// v356: fila do funcionário numa mensagem só; aviso de ponto antigo sem Hoje/Semana; cor da pedra
import {T,KV,env,sent} from './sim.mjs';
let e=0; const ok=(c,m)=>{ if(!c){e++;console.log('ERRO',m);} };
ok(T.corPedraGrupo('Preto São Gabriel')==='escura','preto'); ok(T.corPedraGrupo('lavatório duplo, pedra cinza')==='clara','cinza'); ok(T.corPedraGrupo('Branco Itaúnas')==='clara','branco'); ok(T.corPedraGrupo('')==='','vazio');
const tel='5574900000077';
await env.HR_KV.put('eq:pend:'+tel.slice(-8), JSON.stringify({lista:[{texto:'*Sua semana*\n6 pontos',em:Date.now()-60000},{texto:'⭐ *+2 ponto(s)*, Jeff! (fabricação · Poliano)\n📅 Hoje: *2 de 3,5*\n📆 Semana: *2 de 19*',em:Date.now()-20*3600000}]}));
const n0=sent.length; await T.eqPendente(env,tel); const novos=sent.slice(n0); const tx=JSON.stringify(novos);
console.log(tx.slice(0,500));
ok(novos.length===1,'uma mensagem só: '+novos.length); ok(!/Hoje:/.test(tx),'tirou Hoje'); ok(/Poliano/.test(tx)&&/Guardei/.test(tx),'conteúdo');
console.log('ERROS:',e); process.exit(e?1:0);
