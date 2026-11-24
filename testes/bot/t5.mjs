import {T,KV,env,msg} from './sim.mjs';
const now=Date.now();
KV.set('ponto:cfg',JSON.stringify({funcs:[{id:'1',nome:'Fabrício Morais',tel:'74900000001'},{id:'4',nome:'Hugo',tel:'74999990001'},{id:'5',nome:'Gibson',tel:'74999994713'},{id:'2',nome:'Jefferson',tel:'74900000005'}]}));
for (const t of ['5574900000001','5574999990001','5574999994713','5574900000005']) KV.set('ult:'+t,String(now));
const P=(id,o)=>T.salvarPedido(env,{id,criado:now-86400000,status:'fechado',fichaEnviadaEm:now-7200e3,...o});
await P(501,{nome:'Cássio Borges',numero:'5574988887777',valor:6000,fabResp:'1',fab2Resp:'4',entResp:'5',resumoApp:{pedra:'Preto São Gabriel',itens:[{ambiente:'Lavatório 1',sv:['cuba_lav','s_reta'],pecas:[{qtd:1,comp_cm:80,larg_cm:45,rot:'Bancada'},{qtd:1,comp_cm:80,larg_cm:10,rot:'Saia'}]},{ambiente:'Lavatório 2',sv:['cuba_lav'],pecas:[{qtd:1,comp_cm:80,larg_cm:45,rot:'Bancada'}]},{ambiente:'Área gourmet',sv:['cook','reb_a','s_45'],pecas:[{qtd:1,comp_cm:250,larg_cm:60,rot:'Bancada'},{qtd:1,comp_cm:250,larg_cm:6,rot:'Saia 45'},{qtd:2,comp_cm:90,larg_cm:60,rot:'Pé'}]}]}});
const F='5574900000001',H='5574999990001',G='5574999994713',J='5574900000005';
for (const [f,t] of [[F,'cortei os 2 lavatórios do Cássio'],[F,'cortei a área gourmet do Cássio'],[H,'terminei o lavatório 1 do Cássio'],[H,'terminei tudo do Cássio'],[G,'comecei a instalação do Cássio, o Jefferson está comigo'],[G,'instalei o do Cássio, ele pagou 3000 no dinheiro e o resto vai pagar no pix amanhã'],[F,'quanto vale a cozinha do Cássio?']]) { console.log('\n### '+String(f).slice(-4)+': '+t); console.log((await msg(f,t)).split('\n').filter(l=>!l.includes('ined: und')).join('\n')); }
const raw=[...KV.entries()].find(([k])=>k.endsWith('0000000000501')); const p=JSON.parse(raw[1]); console.log('\nESTADO:',{pago:p.pago,receb:p.recebidoEntrega,log:(p.prodLog||[]).map(x=>x.e+':'+x.por.join('+')+(x.item?'('+x.item+')':''))});
for (const e of ['corte','fabricacao','polimento','instalacao']) console.log(e, T.ptsEtapa(p,e,Date.now()));
console.log('--- foto da instalação'); console.log(await msg(G,'',{type:'image',image:{id:'m999',mime_type:'image/jpeg'}}));
const p2=JSON.parse([...KV.entries()].find(([k])=>k.endsWith('0000000000501'))[1]); console.log('ESTADO2',{entregue:!!p2.entregueEm,pago:p2.pago,receb:p2.recebidoEntrega,ajud:p2.entAjud});
