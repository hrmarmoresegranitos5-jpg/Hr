// PDF do saldo pelo bot
import {T,KV,env,sent,ultMidia} from './sim.mjs'; import fs from 'fs';
KV.set('liv:abc',JSON.stringify({id:'abc',cliente:'Jailton (papinha)',desc:'Cozinha+Cozinha — Verde Ubatuba',valor:4675.4,pagamentos:[{data:'2026-10-06',valor:2000,forma:'pix',obs:'entrada'}],tel:''}));
console.log((await T.pdfSaldoCliente(env,'5574991484460',{cliente:'Jailton'})).texto);
console.log(sent.map(s=>s.type+' '+String(s.txt||'').slice(0,120)).join('\n'));
const b=ultMidia(); if(b){fs.writeFileSync('/tmp/extrato.pdf',b); console.log('pdf',b.length,'bytes');}
