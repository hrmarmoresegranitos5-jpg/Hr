// v336: álbum (várias fotos seguidas) nunca registra duas vezes; foto sem legenda com várias tarefas → IA; segunda leva depois de 20 min
import {T,KV,env,msg} from './sim.mjs';
const now=Date.now();
const F='5574900000001',G='5574900000002',L='5574900000003';
const reset=async()=>{ KV.clear(); KV.set('ponto:cfg',JSON.stringify({funcs:[{id:'1',nome:'Fabrício Morais',tel:'74900000001'},{id:'2',nome:'Gibson',tel:'74900000002'},{id:'3',nome:'Lucas',tel:'74900000003'}]})); KV.set('equipe:numeros',JSON.stringify({fabrica:F,entrega:G}));
  const P=(id,o)=>T.salvarPedido(env,{id,criado:now-86400000,status:'fechado',fichaEnviadaEm:now-3600e3,...o});
  await P(101,{nome:'Jacob da Mata',fabResp:'1',acabResp:'3',resumoApp:{pedra:'Preto São Gabriel',itens:[{ambiente:'Peitoril',pecas:[{qtd:2,comp_cm:120,larg_cm:15}]}]}});
  await P(102,{nome:'Cássio Borges',fabResp:'1',resumoApp:{pedra:'Branco Pinta Verde',itens:[{ambiente:'Lavatório',pecas:[{qtd:2,comp_cm:80,larg_cm:45}]}]}});
  await P(104,{nome:'Poliana Reis',entResp:'2',corteEm:now-9e6,fabProntoEm:now-8e6,entregaEnviadaEm:now-7e6,resumoApp:{pedra:'Branco Siena',itens:[{ambiente:'Cozinha',pecas:[{qtd:1,comp_cm:250,larg_cm:60}]}]}});
  await P(105,{nome:'Wesley Lima',entResp:'2',corteEm:now-9e6,fabProntoEm:now-8e6,entregaEnviadaEm:now-7e6,resumoApp:{pedra:'Preto',itens:[{ambiente:'Lavatório',pecas:[{qtd:1,comp_cm:80,larg_cm:45}]}]}}); };
const foto=c=>({type:'image',image:{id:'i'+Math.random().toString(36).slice(2,7),mime_type:'image/jpeg',...(c?{caption:c}:{})}});
const pts=async id=>{ const p=await T.lerPedido(env,id); return JSON.stringify((p.prodLog||[]).map(x=>x.e))+` corteIni=${!!p.corteIniEm} corte=${!!p.corteEm} pronto=${!!p.fabProntoEm} inst=${!!p.instIniEm} entregue=${!!p.entregueEm}`; };
let erros=0; const conf=(c,t)=>{ if(!c){erros++; console.log('❌ '+t);} else console.log('✅ '+t); };
// 1. álbum de 3 fotos com legenda na 1ª ("cortado" do Jacó) → um registro só
await reset(); for (const c of ['peitoris do Jacó cortados','','']) await msg(F,'',foto(c));
let j=await T.lerPedido(env,101); conf((j.prodLog||[]).filter(x=>x.e==='corte').length<=1 && (j.corteEm||j.fabProntoEm), '1 álbum cortado Jacó: um registro '+await pts(101));
// 2. álbum sem legenda, 2 tarefas, IA alta no Cássio início → um início só
await reset(); globalThis.__fotoAlvo='102'; globalThis.__fotoCerteza='alta'; const r2=[]; for (const c of ['','','']) r2.push(await msg(F,'',foto(c)));
let c2=await T.lerPedido(env,102); conf(c2.corteIniEm && r2.filter(r=>/Pela foto/.test(r)).length===1, '2 álbum sem legenda: IA uma vez só '+await pts(102)+' | '+r2.map(r=>r.split('\n').filter(l=>/→0001/.test(l)).length).join(','));
// 3. Gibson: "iniciando" sem cliente com 2 instalações → IA (alvo Poliana) ini; depois "finalizado" (sem cliente) → fim da Poliana (a que começou)
await reset(); globalThis.__fotoAlvo='104'; await msg(G,'',foto('iniciando')); globalThis.__fotoAlvo=null; globalThis.__fotoCerteza=null;
await KV.delete('prod:fotoult:00000002'); const r3=await msg(G,'',foto('finalizado'));
conf((await T.lerPedido(env,104)).entregueEm && !(await T.lerPedido(env,105)).entregueEm, '3 finalizado sem cliente → a instalação que estava começada (Poliana) | '+r3.replace(/\n/g,' ').slice(0,160));
// 4. foto sem legenda depois de 20 min da última → não "mais uma foto guardada" no pedido antigo
await reset(); await msg(F,'',foto('peitoris do Jacó cortados')); const fu=JSON.parse(KV.get('prod:fotoult:00000001')||'null'); if(fu){fu.em-=21*60000; KV.set('prod:fotoult:00000001',JSON.stringify(fu));}
globalThis.__fotoCerteza='baixa'; const r4=await msg(F,'',foto('')); globalThis.__fotoCerteza=null;
conf(!/Mais uma foto guardada no pedido de Jacob/.test(r4), '4 foto 21 min depois não cai no Jacó | '+r4.replace(/\n/g,' ').slice(0,140));
// 5. Lucas (acabador) foto "finalizado" sem cliente com só o Jacó cortado → acabamento do Jacó
await reset(); { const p=await T.lerPedido(env,101); p.corteEm=now-5e6; await T.salvarPedido(env,p); } const r5=await msg(L,'',foto('finalizado'));
conf((await T.lerPedido(env,101)).acabEm, '5 acabador "finalizado" → acabamento do Jacó | '+r5.replace(/\n/g,' ').slice(0,140));
// 6. "polido" do acabador
await reset(); { const p=await T.lerPedido(env,101); p.corteEm=now-5e6; await T.salvarPedido(env,p); } const r6=await msg(L,'',foto('peitoril do jaco polido'));
conf((await T.lerPedido(env,101)).acabEm || /acabamento/.test(r6), '6 "peitoril do jaco polido" → acabamento | '+r6.replace(/\n/g,' ').slice(0,140));
// 7. foto do carro carregado "saindo pra entrega da Poliana" → não marca entregue
await reset(); const r7=await msg(G,'',foto('saindo pra entrega da Poliana'));
conf(!(await T.lerPedido(env,104)).entregueEm, '7 "saindo pra entrega" não dá baixa | '+r7.replace(/\n/g,' ').slice(0,140));
// 8. Fabrício "terminei" com uma tarefa só → pronto dela
await reset(); { const c=await T.lerPedido(env,102); c.fabResp='9'; await T.salvarPedido(env,c);} const r8=await msg(F,'',foto('terminei'));
conf((await T.lerPedido(env,101)).corteEm, '8 "terminei" com uma tarefa → Jacó | '+r8.replace(/\n/g,' ').slice(0,140));
// 9. "cortei os lavatório do cassio" → os 2 lavatórios
await reset(); const r9=await msg(F,'',foto('cortei os lavatório do cassio'));
conf((await T.lerPedido(env,102)).corteEm, '9 "cortei os lavatório do cassio" → corte do Cássio | '+r9.replace(/\n/g,' ').slice(0,140));
// 10. sem nenhum serviço aberto com ele e sem legenda → a foto vai ao dono e ele é avisado
await reset(); for (const id of [101,102]) { const p=await T.lerPedido(env,id); p.fabResp='9'; p.acabResp='9'; await T.salvarPedido(env,p); } const r10=await msg(L,'',foto(''));
conf(/Recebi a foto|qual serviço|cliente/.test(r10) && !/ponto\(s\)/.test(r10), '10 sem serviço com ele → pergunta/guarda | '+r10.replace(/\n/g,' ').slice(0,140));
console.log('ERROS:', erros); process.exit(0);
