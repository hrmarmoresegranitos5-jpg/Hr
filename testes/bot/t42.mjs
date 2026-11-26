// v362: Gmail — Pix recebido dá baixa no livro, compra do Mercado Livre vira gasto, cobrança vira boleto no app
import {T,env,sent,KV} from './sim.mjs';
let e=0; const ok=(c,m)=>{ if(!c){e++;console.log('ERRO',m);} };
const keep=setInterval(()=>{},1000);
const dono='5574991484460';
await env.HR_KV.put('cfg:gpixkey','K1');
// 1) Pix recebido
await env.HR_KV.put('liv:L1', JSON.stringify({id:'L1',cliente:'Maria Teste da Silva',desc:'cozinha',valor:3000,entregaEm:'2026-11-10',pagamentos:[{data:'2026-11-01',valor:1000,forma:'Pix'}]}));
const txtIn='Você recebeu um Pix de R$ 500,00\nQuarta-feira, 25 de novembro de 2026, às 09:00.\nMaria Teste da Silva\nCPF/CNPJ: ***.111.222-**\nBANCO X';
const ts=Date.parse('2026-11-25T12:00:00Z');
let n0=sent.length;
let r=await T.gpixRota(new Request('https://x/gpix',{method:'POST',body:JSON.stringify({chave:'K1',itens:[{id:'r1',ts,assunto:'Você recebeu um Pix',txt:txtIn,tipo:'pix'}]})}),env,new URL('https://x/gpix'));
let novos=sent.slice(n0); console.log(JSON.stringify(novos).slice(0,500));
ok(novos.some(s=>/Pix recebido/.test(s.txt)&&/Maria Teste/.test(s.txt)),'pergunta baixa');
await T.gmailBotao(env, dono, 'grec|r1|s');
const L=JSON.parse(await env.HR_KV.get('liv:L1')); console.log(JSON.stringify(L.pagamentos));
ok(L.pagamentos.length===2&&L.pagamentos[1].valor===500,'baixa feita');
// 2) Mercado Livre pago no cartão
globalThis.__aiFn=(sys,user)=>{
  if(/e-mails do Mercado Livre/.test(sys)) return /entregue/i.test(user)?JSON.stringify({evento:'entregue',itens:['Disco de corte'],valor:null,pedido:'123'}):JSON.stringify({evento:'compra',itens:['Disco de corte diamantado'],valor:89.9,pedido:'123'});
  if(/COBRANÇA A PAGAR/.test(sys)) return JSON.stringify({cobranca:true,fornecedor:'Energia Teste',descricao:'conta de luz',valor:312.45,vencimento:'2026-12-05',linha:'8366 0000 0031',categoria:'energia'});
  return null; };
n0=sent.length;
r=await T.gpixRota(new Request('https://x/gpix',{method:'POST',body:JSON.stringify({chave:'K1',itens:[{id:'ml1',ts,assunto:'Você comprou',txt:'Compra aprovada',tipo:'ml'}]})}),env,new URL('https://x/gpix'));
console.log(JSON.stringify(await r.json()));
novos=sent.slice(n0); console.log(JSON.stringify(novos).slice(0,400));
ok(novos.some(s=>/Mercado Livre/.test(s.txt)&&/89,90/.test(s.txt)),'pergunta gasto ML');
n0=sent.length;
await T.gmailBotao(env, dono, 'gml|ml1|s'); console.log(JSON.stringify(sent.slice(n0)).slice(0,300));
n0=sent.length;
await T.gpixRota(new Request('https://x/gpix',{method:'POST',body:JSON.stringify({chave:'K1',itens:[{id:'ml2',ts,assunto:'Seu pacote foi entregue',txt:'entregue',tipo:'ml'}]})}),env,new URL('https://x/gpix'));
ok(sent.slice(n0).some(s=>/Chegou/.test(s.txt)),'aviso entrega');
// 3) Cobrança
n0=sent.length;
await T.gpixRota(new Request('https://x/gpix',{method:'POST',body:JSON.stringify({chave:'K1',itens:[{id:'c1',ts,assunto:'Sua fatura chegou',de:'x@energia.test',txt:'Fatura',tipo:'conta'}]})}),env,new URL('https://x/gpix'));
novos=sent.slice(n0); console.log(JSON.stringify(novos).slice(0,400));
ok(novos.some(s=>/Cobrança no e-mail/.test(s.txt)&&/312,45/.test(s.txt)),'pergunta boleto');
await T.gmailBotao(env, dono, 'gcta|c1|s');
const cmds=[...KV.keys()].filter(k=>k.startsWith('cmd:')).map(k=>JSON.parse(KV.get(k))).filter(c=>c.acao==='boleto_novo');
console.log(JSON.stringify(cmds[0]&&cmds[0].parametros));
ok(cmds.length===1&&cmds[0].parametros.valor===312.45&&cmds[0].parametros.venc==='2026-12-05','cmd boleto_novo');
// repetido não pergunta de novo
n0=sent.length;
await T.gpixRota(new Request('https://x/gpix',{method:'POST',body:JSON.stringify({chave:'K1',itens:[{id:'c2',ts,assunto:'Sua fatura chegou',txt:'Fatura',tipo:'conta'}]})}),env,new URL('https://x/gpix'));
ok(!sent.slice(n0).some(s=>/Cobrança/.test(s.txt)),'dedupe cobrança');
// cfg
const rc=await T.gpixRota(new Request('https://x/gpix/cfg?k=K1'),env,new URL('https://x/gpix/cfg?k=K1')); const jc=await rc.json(); ok(jc.q&&jc.q.length===3,'cfg');
clearInterval(keep);
console.log('ERROS:',e); process.exit(e?1:0);
