// v329: diário de erros — "não entendi", reclamação e sem resposta vão para helena_falhas; "erros da helena" lista
import {T,KV,env,msg} from './sim.mjs';
const ins=[]; const st={bind(...a){this.a=a;return this},async run(){ if(/INSERT INTO helena_falhas/.test(this.sql)) ins.push(this.a); return {meta:{changes:1}}},async all(){ return {results: /FROM helena_falhas/.test(this.sql)? ins.map(a=>({ts:a[0],quem:a[2],entrada:a[4],resposta:a[5],tipo:a[6],nota:a[7]})):[]}},async first(){return null}};
env.HR_DB={prepare(sql){return Object.assign(Object.create(st),{sql})},batch:async()=>[]};
KV.set('ponto:cfg',JSON.stringify({funcs:[{id:'1',nome:'Fabrício Morais',tel:'74999990011'}]}));
KV.set('equipe:numeros',JSON.stringify({fabrica:'5574999990011'}));
await msg('5574999990011','soleira de branco itaunas já cortado');
await msg('5574999990011','não foi isso, você errou meus pontos');
console.log('gravadas:', ins.map(a=>a[6]+' | '+a[4]).join('\n'));
console.log(await msg('5574991484460','erros da helena'));
process.exit(0);
