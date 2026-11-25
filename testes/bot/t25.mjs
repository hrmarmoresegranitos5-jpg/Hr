// v340: a Helena busca no app inteiro (rascunho/aceito/entregue, peças, agenda, produção)
import {T,KV,env} from './sim.mjs';
const H=[
 {id:'1',orcNum:'ORC-0101',cliente:'Poliano dos Anjos',projeto:'Cozinha',material:'Preto São Gabriel',m2:3.2,valor:2800,status:'aprovado',secao:'aceito',data:'2026-11-10',tel:'74900000020',amb:'Cozinha: 250x60 bancada, 2x 60x10 frontão [s_reta,reb_n]',job:{etapa:'producao',ini:'2026-11-12',fim:'2026-11-28',valor:2800,pago:1400,feito:0,instala:1,desc:'Cozinha Poliano'}},
 {id:'2',orcNum:'ORC-0102',cliente:'Poliano dos Anjos',projeto:'Banheiro',material:'Branco Itaúnas',m2:1.1,valor:900,status:'pendente',secao:'pendente',data:'2026-11-11'},
 {id:'3',orcNum:'ORC-0103',cliente:'Tontoi da Churrascaria',projeto:'Nicho',material:'Preto São Gabriel',valor:629.21,status:'pendente',secao:'rascunho',data:'2026-11-24',amb:'Nicho: 2x 47x14 base, 2x 30x14 lateral'},
 {id:'4',orcNum:'ORC-0090',cliente:'Ésio Caveira',projeto:'Lavatórios',material:'Branco Itaúnas',valor:1500,status:'entregue',secao:'entregue',data:'2026-11-01',job:{etapa:'entregue',valor:1500,pago:1500,feito:1}},
];
KV.set('hist:completo',JSON.stringify({ts:Date.now(),clientes:[],orcamentos:H}));
for (const k of ['hist:completo','cfg:historico','historico']) KV.set(k,JSON.stringify({ts:Date.now(),clientes:[],orcamentos:H}));
const show=async(n,a)=>{ const r=await (n==='b'?T.appBuscarTool:T.appDetalheTool)(env,a); console.log('\n##',JSON.stringify(a),'\n'+r.texto); return r.texto; };
let E=0; const ok=(c,t)=>{console.log(c?'ok':'ERRO',t); if(!c)E++;};
ok(/2 resultado/.test(await show('b',{texto:'poliano'})),'poliano 2');
ok(/rascunho/.test(await show('b',{secao:'rascunho'})),'rascunho');
ok(/Ésio|Esio/.test(await show('b',{secao:'entregue'})),'entregue');
ok(/Poliano/.test(await show('b',{texto:'preto sao gabriel cozinha'})),'pedra+peça');
ok(/falta R\$ 1\.400/.test(await show('b',{secao:'abertos'})),'abertos com saldo');
ok(/ATENÇÃO: 2/.test(await show('d',{cliente:'Poliano'})),'avisa 2 projetos');
ok(/250x60/.test(await show('d',{cliente:'Poliano',projeto:'cozinha'})),'peças da cozinha');
ok(/47x14/.test(await show('d',{cliente:'tontoi'})),'nicho tontoi');
KV.set('liv:jail1',JSON.stringify({id:'jail1',cliente:'Jailton (papinha)',desc:'Cozinha+Cozinha',valor:4675.4,entregaEm:'2026-11-24',pagamentos:[{valor:2000,forma:'dinheiro',data:'2026-11-24'}]}));
ok(/Jailton \(papinha\).*ENTREGUE.*falta R\$ 2\.675/.test(await show('b',{texto:'Jailton',secao:'entregue'})),'entregue no livro');
ok(/Jailton/.test(await show('d',{cliente:'Jailton'})),'ficha pelo livro');
console.log((await T.appResumoPrompt(env)).slice(0,400));
console.log('ERROS:',E); process.exit(0);
