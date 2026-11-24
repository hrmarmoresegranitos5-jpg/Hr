// parear o tablet do balcão: código → dono manda "parear X" → tablet recebe o link
import {env,T,KV,sent,msg,W} from './sim.mjs';
const ctx={waitUntil(){},passThroughOnException(){}};
const r1=await W.fetch(new Request('https://w.test/balcao/codigo',{method:'POST'}),env,ctx); const j1=await r1.json(); console.log('código:',j1);
console.log('antes:',await (await W.fetch(new Request('https://w.test/balcao/par?c='+j1.codigo),env,ctx)).json());
console.log(await msg('74991484460','parear '+j1.codigo));
console.log('depois:',await (await W.fetch(new Request('https://w.test/balcao/par?c='+j1.codigo),env,ctx)).json());
console.log('de novo:',await (await W.fetch(new Request('https://w.test/balcao/par?c='+j1.codigo),env,ctx)).json());
