import {preorderReady} from '../shared/preorder.js';
export function launchChecks({settings,connections,product,live}) {
 return [
  {label:'Verkoopprijs ingevuld',ready:Number.isInteger(product?.price_cents)&&product.price_cents>0},
  {label:'The Genesis actief en op voorraad',ready:product?.status==='active'&&product.stock>0},
  {label:'Verzendkosten ingevuld (gratis mag ook)',ready:Number.isInteger(settings.shipping_cents)&&settings.shipping_cents>=0},
  {label:'E-mailadres voor bestelmeldingen ingevuld',ready:Boolean(settings.merchant_email)},
  {label:'Betaal-, database- en e-mailkoppeling ingesteld',ready:Boolean(connections.mollie&&connections.database&&connections.mail)},
  {label:'Afrekenen ingeschakeld',ready:settings.enabled===true},
  {label:'Volledige website gepubliceerd',ready:live===true},
  ...(settings.sale_mode==='preorder'?[{label:'Pre-order: verzenddatum, productgegevens, retourinformatie en geurtekst bevestigd',ready:preorderReady(settings)}]:[]),
 ];
}
export function welcomeState(job,now=Date.now()) {
 if(job.accepted_at)return 'Aangenomen door de e-maildienst';
 if(!job.first_attempt_at)return 'Wacht op verzending';
 if(now-Date.parse(job.first_attempt_at)>=23*3600000)return 'Controle nodig — automatisch opnieuw proberen gestopt';
 return 'Nog niet bevestigd — wordt automatisch opnieuw geprobeerd';
}
export function realOrderSummary(orders){
 const real=orders.filter(order=>!order.test_mode);
 return {count:real.length,total:real.filter(order=>order.status!=='cancelled').reduce((sum,order)=>sum+order.quantity*order.unit_price_cents+(order.shipping_cents||0),0)};
}
