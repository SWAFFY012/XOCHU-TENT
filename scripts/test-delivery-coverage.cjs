const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');const ts=require(process.cwd()+'/node_modules/typescript');
function load(file,mocks){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:n=>{if(n in mocks)return mocks[n];throw Error(n)},process:{env:{},cwd:()=>"/tmp/mock-delivery"},console,Error,setTimeout,URLSearchParams,Buffer,Date,Map,Set,Promise});return exports;}
const geo=load('lib/delivery/coverage.ts',{});assert.equal(geo.pointSearchRadius({lat:55.75,lon:37.62}),300);assert.equal(geo.pointSearchRadius({lat:59.94,lon:30.32}),300);assert.equal(geo.pointSearchRadius({lat:55.83,lon:37.39}),300);assert.equal(geo.pointSearchRadius({lat:55.79,lon:49.12}),25);assert(geo.pointDistance({lat:55.75,lon:37.62},{lat:56.75,lon:37.62})>100);
console.log('Coverage boundaries OK');
const {matchesPointQuery}=load('lib/delivery/point-search.ts',{});
const sadovaya={name:'Пункт Ozon',address:'Россия, Московская Область, Красногорск, Путилково, Садовая улица, 19'};
assert(matchesPointQuery(sadovaya,'Путилково Садовая 19'));
assert(matchesPointQuery(sadovaya,'19, садовая ПУТИЛКОВО'));
assert(!matchesPointQuery(sadovaya,'Путилково Садовая 20'));
console.log('PVZ search ignores commas and word order');

(async()=>{
const calls=[];const cities={Москва:{code:44,city:'Москва',region_code:81,latitude:55.75,longitude:37.62},Красногорск:{code:520,city:'Красногорск',region_code:9,latitude:55.82,longitude:37.33},'Санкт-Петербург':{code:137,city:'Санкт-Петербург',region_code:82,latitude:59.94,longitude:30.32},Всеволожск:{code:999,city:'Всеволожск',region_code:10,latitude:60.02,longitude:30.65}};
const office=(id,city_code=520)=>({code:id,name:id,location:{city_code,address:'Садовая, 19',address_full:'Путилково, Садовая, 19',latitude:55.84,longitude:37.4}});
const http={memo:()=>async(k,f)=>f(),daysRange:()=>'',fetchJson:async(url,init)=>{calls.push(url);const u=new URL(url);if(u.pathname.endsWith('/oauth/token'))return {access_token:'test',expires_in:3600};if(u.pathname.endsWith('/location/cities'))return [cities[u.searchParams.get('city')]].filter(Boolean);if(u.pathname.endsWith('/deliverypoints'))return [office(u.searchParams.get('region_code')||'pvz')];if(u.pathname.endsWith('/calculator/tarifflist')){assert.equal(JSON.parse(init.body).to_location.code,520);return {tariff_codes:[]}};throw Error(url)}};
const c=load('lib/delivery/cdek.ts',{'server-only':{},'@/lib/site':{shipFrom:{city:'СПб'}},'./coverage':geo,'./http':http,'./parcels':{}}).cdek;
for(const name of ['Москва','Санкт-Петербург']){const p=await c.points({city:name,parcels:[]});assert.equal(p.length,2)};
assert(calls.some(x=>x.includes('region_code=9')));assert(calls.some(x=>x.includes('region_code=10')));
await c.calculate({city:'Москва',pointId:'pvz',parcels:[]});console.log('CDEK region coverage and selected-PVZ city OK');
let listCalls=0,refresh=0,infoCalls=0;const tokenR={access_token:'fake',expires_in:3600};const httpO={...http,fetchJson:async(url,init)=>{if(url.includes('oauth/token')){refresh++;return tokenR;}if(url.endsWith('/v1/delivery/point/list')){if(++listCalls===1)throw Error('api-seller.ozon.ru 401: expired');return {points:Array.from({length:3101},(_,i)=>({map_point_id:i+1,coordinate:{lat:55.75, long:37.62}}))};}if(url.endsWith('/v1/delivery/point/info') && ++infoCalls===1)throw Error('api-seller.ozon.ru 429: rate limit');if(url.endsWith('/v1/delivery/point/info'))return {points:JSON.parse(init.body).map_point_ids.map(id=>({enabled:true,delivery_method:{map_point_id:id,name:'ПВЗ',address:'Адрес',coordinates:{lat:55.75,long:37.62}}}))};if(url.endsWith('/v2/order/create'))throw Error('api-seller.ozon.ru 401: expired');throw Error(url)}};
const oz=load('lib/delivery/ozon.ts',{'server-only':{},'node:fs/promises':{readFile:async()=>JSON.stringify({refreshToken:'mock',seller:'mock',scope:[]}),mkdir:async()=>{},writeFile:async()=>{}},'node:path':{default:require('path')},'@/lib/site':{site:{url:'https://example.org'}},'./cdek':{cityCenter:async()=>({lat:55.75,lon:37.62})},'./coverage':geo,'./ozon-match':{},'./http':httpO});
const points=await oz.ozon.points({city:'Москва',parcels:[]});assert.equal(points.length,3101);assert.equal(refresh,2);assert.equal(listCalls,2);assert(infoCalls>31);const prev=refresh;await assert.rejects(()=>oz.sellerApi('/v2/order/create',{}),/401/);assert.equal(refresh,prev);console.log('Ozon >3000 points, 401 refresh, 429 retry and NO create-order retry OK');

let quotes=0;let quoteAvailable=true;
const builder=load('lib/orders/build.ts',{'server-only':{},'@/lib/fabric-cut':load('lib/fabric-cut.ts',{}),'@/lib/catalog':{getSummary:()=>({slug:'tent-oxford',title:'Тент',options:['Стандарт'],colors:['Серый']}),findVariant:()=>({price:2750,weight:2,box:[28,23,6]})},'@/lib/delivery':{toParcels:()=>[],quoteDelivery:async()=>{quotes++;return quoteAvailable?[{mode:'pvz',cost:226}]:[]}},'@/lib/format':{},'@/lib/site':{deliveryServices:[{id:'ozon',modes:['pvz']},{id:'cdek',modes:['pvz','door']}],isQuoteOnly:()=>false,deliveryPayment:'on_receipt'},'./source':{cleanVisit:()=>undefined}});
const body={intent:'pay',name:'Тест Проверка',phone:'+79000000001',email:'test@example.org',consent:true,offer:true,delivery:'carrier',mode:'pvz',city:'Москва',address:'Адрес текстом',items:[{slug:'tent-oxford',option:'Стандарт',color:'Серый',size:'2,5х2,8',qty:2,custom:false}]};
for(const service of ['cdek','ozon']){
 await assert.rejects(()=>builder.buildOrder({...body,service},'test'),/Выберите пункт выдачи/);
 assert.equal(quotes,0);
}
await builder.buildOrder({...body,service:'ozon',pointId:'440843'},'test');
quoteAvailable=false;
await assert.rejects(()=>builder.buildOrder({...body,service:'ozon',pointId:'440843'},'test'),/Не удалось подтвердить доставку/);
console.log('Checkout rejects missing PVZ and unavailable API before order creation; selected PVZ passes');
})().catch(e=>{console.error(e);process.exitCode=1});
