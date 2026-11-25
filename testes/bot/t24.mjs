// v339: aprovação da produção — funcionário registra → pendente (sem ponto, sem entrega) → dono aprova → pontos + pergunta da entrega
import {T,KV,env,msg,sent} from './sim.mjs';
import {d1} from './d1sqlite.mjs';
env.HR_DB=d1();
const now=Date.now(), F='5574900000001', D='5574991484460';
KV.set('ponto:cfg',JSON.stringify({funcs:[{id:'1',nome:'Fabrício Morais',tel:'74900000001'},{id:'5',nome:'Gibson Lima',tel:'74900000005'}]})); KV.set('equipe:numeros',JSON.stringify({fabrica:F,entrega:'5574900000005'}));
await T.salvarPedido(env,{id:401,nome:'Jacob da Mata',criado:now-86400000,status:'fechado',fichaEnviadaEm:now-3600e3,fabResp:'1',entResp:'5',entrega:{endereco:'Rua A'},resumoApp:{pedra:'Preto São Gabriel',itens:[{ambiente:'Peitoril',pecas:[{qtd:2,comp_cm:120,larg_cm:15}]}]}});
let E=0; const chk=(c,t)=>{ console.log(c?'ok ':'ERRO', t); if(!c) E++; };
const r1=await msg(F,'terminei o corte do Jacob'); console.log(r1);
let p=await T.lerPedido(env,401); const x=(p.prodLog||[]).find(y=>y.apId);
chk(x && x.ap===0,'etapa pendente');
chk(!/0005/.test(r1),'nada foi ao Gibson');
chk(/Para aprovar/.test(r1),'dono recebeu para aprovar');
chk(!/\+\d.*ponto/.test(r1.split('\n').filter(l=>l.includes('0001')).join(' ')),'sem +pontos ao funcionário');
const m0=await T.metasPontos(env,'2000-01-01','2100-01-01'); chk(!(m0['1']&&m0['1'].pts>0),'pontos não contam antes: '+JSON.stringify(m0['1']&&m0['1'].pts));
const r2=await msg(D,'',{type:'interactive',interactive:{type:'button_reply',button_reply:{id:`apv|401|${x.apId}|s`,title:'✅ Aprovar'}}}); console.log(r2);
const m1=await T.metasPontos(env,'2000-01-01','2100-01-01'); chk(m1['1']&&m1['1'].pts>0,'pontos contam depois: '+(m1['1']&&m1['1'].pts));
chk(/ponto/.test(r2)&&/0001/.test(r2),'funcionário avisado dos pontos');
chk(/Mando os dados da entrega/.test(r2),'pergunta ao dono se manda a entrega');
// dono registra direto → aprovado
const r3=await msg(D,'aprovar tudo'); console.log(r3);
console.log('ERROS:',E); process.exit(0);
