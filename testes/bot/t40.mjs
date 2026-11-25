// v359: detalhes do site com foto real (pedido ao dono, texto, catálogo, pedido do cliente com acabamento)
import {T,env,sent} from './sim.mjs';
let e=0; const ok=(c,m)=>{ if(!c){e++;console.log('ERRO',m);} };
const dono='5574991484460';
await T.siteDetTexto(env,dono,'melhorar o site','melhorar o site');
const pd=JSON.parse(await env.HR_KV.get('det:pede')); ok(pd&&pd.k==='s45','pede sainha 45 primeiro: '+JSON.stringify(pd));
ok(/Sainha 45/.test(JSON.stringify(sent.slice(-1))),'mensagem do pedido');
const r=await T.siteDetImagem(env,dono,{type:'image',image:{id:'IMG1',caption:''}}); ok(r===true,'foto guardada');
let det=await T.siteDetalhes(env); ok(det.find(x=>x.k==='s45').fotos.length===1,'1 foto no s45');
await T.siteDetBotao(env,dono,'det|txt|s45'); await T.siteDetTexto(env,dono,'Borda grossa em 45 graus, parece pedra maciça.','borda grossa em 45 graus, parece pedra macica.');
det=await T.siteDetalhes(env); ok(/maciça/.test(det.find(x=>x.k==='s45').d),'texto mudou');
ok(JSON.parse(await env.HR_KV.get('det:pede')).k==='sreta','depois pede a sainha reta');
const r2=await T.siteDetImagem(env,dono,{type:'image',image:{id:'IMG2',caption:'site: rebaixo americano'}}); ok(r2===true,'legenda site:');
det=await T.siteDetalhes(env); ok(det.find(x=>x.k==='reb_a').fotos.length===1,'rebaixo com foto');
console.log('ERROS:',e); process.exit(e?1:0);
