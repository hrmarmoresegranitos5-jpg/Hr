// v342: ficha técnica de qualquer orçamento (rascunho do Tontoi)
import {T,KV,env,sent} from './sim.mjs';
import fs from 'fs';
const H=[{id:'3',orcNum:'ORC-0103',cliente:'Tontoi da Churrascaria',projeto:'Nicho',material:'Preto São Gabriel',valor:541.92,status:'pendente',secao:'rascunho',data:'2026-11-24',amb:'🔲 Nicho: 2x 57x12 laterais (caixa) ×2, 2x 47x14 base, 2x 30x14 lateral, 47x30 fundo [s_45] | Cozinha: 250x60 bancada, 2x 60x10 frontão [s_reta,reb_n,frontao] cuba Tramontina'}];
KV.set('cfg:historico',JSON.stringify({ts:Date.now(),clientes:[],orcamentos:H}));
const it=T.appPecasDoAmb(H[0].amb); console.log(JSON.stringify(it));
const r=await T.fichaTecnicaTool(env,'5574991484460',{cliente:'tontoi'}); console.log(r.texto);
console.log(sent.map(s=>JSON.stringify(s).slice(0,200)).join('\n'));
const pdf=T.fichaCortePdf({titulo:'FICHA TÉCNICA — NICHO',cliente:'Tontoi',pedra:'Preto São Gabriel',geradoEm:'hoje',itens:it}); fs.writeFileSync('/tmp/ficha.pdf',Buffer.from(pdf));
let E=0; if(!/JÁ ENVIADA/.test(r.texto))E++; if(it.length!==2||it[0].pecas.length!==4||it[0].ambiente!=='Nicho'||it[0].pecas[0].nome!=='laterais (caixa)')E++; if(Buffer.from(pdf).toString('latin1').includes('??'))E++; console.log('ERROS:',E); process.exit(0);
