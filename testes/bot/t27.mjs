// v343: o desenho do Projeto 2D chega do app e a ficha técnica vai como imagem
import {T,KV,env,W,sent} from './sim.mjs';
env.BOT_KEY='k';
const H=[{id:'q81592',orcNum:'ORC-0200',cliente:'Raimundo ramos',projeto:'Três nichos',material:'Branco fortaleza',valor:900,secao:'aceito',data:'2026-11-24'}];
KV.set('cfg:historico',JSON.stringify({ts:Date.now(),clientes:[],orcamentos:H}));
const jpg=Buffer.concat([Buffer.from([0xFF,0xD8,0xFF,0xE0]),Buffer.alloc(200)]).toString('base64');
const r=await W.fetch(new Request('https://x/bot/ficha/img',{method:'POST',headers:{'x-bot-key':'k','authorization':'Bearer k','content-type':'application/json'},body:JSON.stringify({qid:'q81592',cliente:'Raimundo ramos',hash:'h1',img:jpg})}),env,{waitUntil(){}});
console.log(await r.text());
const h=await (await W.fetch(new Request('https://x/bot/ficha/hashes',{headers:{'x-bot-key':'k','authorization':'Bearer k'}}),env,{waitUntil(){}})).text(); console.log(h);
const t=await T.fichaTecnicaTool(env,'5574991484460',{cliente:'Raimundo'}); console.log(t.texto); console.log(sent.map(x=>JSON.stringify(x).slice(0,150)).join('\n'));
console.log('ERROS:', /Projeto 2D\) JÁ ENVIADA/.test(t.texto)&&sent.some(x=>x.type==='image')?0:1); process.exit(0);
