// v361: Pix do Gmail dá nome ao Pix do Mercado Pago que estava sem nome
import {T,env,sent} from './sim.mjs';
let e=0; const ok=(c,m)=>{ if(!c){e++;console.log('ERRO',m);} };
const txt='Seu Pix de R$ 5.000 foi enviado\nQuarta-feira, 25 de novembro de 2026, às 10:16:50.\nJoel de Souza Ferreira\nCPF/CNPJ: ***.924.815-**\nBANCO BRADESCO S.A.\nAgência: 6920';
const ts=Date.parse('2026-11-25T13:16:50Z');
const x=T.gpixLer({ts,assunto:'Seu Pix foi enviado',txt}); console.log(JSON.stringify(x));
ok(x.valor===5000&&x.nome==='Joel de Souza Ferreira'&&x.sentido==='out'&&x.hora==='10:16'&&x.data==='2026-11-25','leitura');
await env.HR_KV.put('mpx:p:abc', JSON.stringify({h:'abc',sentido:'out',valor:5000,data:'2026-11-25',hora:'10:16',desc:'Pix enviado',semNome:true}));
await env.HR_KV.put('cfg:gpixkey','K1');
const n0=sent.length;
const r=await T.gpixRota(new Request('https://x/gpix',{method:'POST',body:JSON.stringify({chave:'K1',itens:[{id:'m1',ts,assunto:'Seu Pix foi enviado',txt}]})}),env,new URL('https://x/gpix'));
const j=await r.json(); ok(j.ok&&j.novos===1,'post');
const p=JSON.parse(await env.HR_KV.get('mpx:p:abc')||'null'); console.log(JSON.stringify(p));
ok(p&&p.desc==='Joel de Souza Ferreira'&&p.semNome===false,'pendente ganhou o nome');
ok(JSON.parse(await env.HR_KV.get('gpix:m1')).st==='ok','gmail marcado');
console.log(JSON.stringify(sent.slice(n0)).slice(0,600));
const r2=await T.gpixRota(new Request('https://x/gpix',{method:'POST',body:JSON.stringify({chave:'errada',itens:[]})}),env,new URL('https://x/gpix')); ok(r2.status===401,'chave');
console.log('ERROS:',e); process.exit(e?1:0);
