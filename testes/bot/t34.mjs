// v351: ficha limpa para o cliente pelo WhatsApp da empresa
import {T,KV,env,W,sent} from './sim.mjs';
env.BOT_KEY='k';
const jpg=Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47]),Buffer.alloc(300)]).toString('base64');
const call=async b=>(await (await W.fetch(new Request('https://x/bot/ficha/cliente',{method:'POST',headers:{'x-bot-key':'k','content-type':'application/json'},body:JSON.stringify(b)}),env,{waitUntil(){}})).json());
let r=await call({cliente:'Tontoi da churrascaria',projeto:'Nicho',tel:'74900000555',img:jpg}); console.log(JSON.stringify(r), sent.map(x=>x.type).join(','));
console.log('pend:',!!KV.get('tplpend:5574900000555'));
KV.set('ult:5574900000555',String(Date.now())); sent.length=0;
r=await call({cliente:'Tontoi',tel:'74900000555',img:jpg}); console.log(JSON.stringify(r), sent.map(x=>x.type).join(','));
r=await call({cliente:'Ninguém Silva',img:jpg}); console.log(JSON.stringify(r));
process.exit(0);
