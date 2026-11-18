import './style.css';
import './future.css';
import {formatDispatch} from '../shared/preorder.js';
const state=document.getElementById('order-state'),button=document.getElementById('check-payment');
const reference=new URLSearchParams(location.search).get('reference');
const messages={paid:'Thank you. Your payment has been confirmed and your order has been received. Confirmation emails will be sent to you and Doxa Essence.',open:'Your payment is not complete yet.',pending:'Your payment is being processed. Please check again shortly.',authorized:'Your payment is awaiting confirmation.',failed:'Your payment was not completed. Contact us if you need help.',canceled:'Your payment was canceled.',expired:'Your payment has expired.',creating:'Your payment is being prepared. Please check again shortly.'};
async function check(){button.disabled=true;try{
 if(!/^[0-9a-f-]{36}$/i.test(reference||''))throw Error('Open the order link from your payment.');
 const token=sessionStorage.getItem('doxa-checkout/'+reference);if(!token)throw Error('For your privacy, open this page in the same browser used for checkout. Contact us if you need help.');
 const response=await fetch('/api/checkout/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:reference,token})});const result=await response.json();if(!response.ok)throw Error(result.error||'Could not check your payment.');
 state.textContent=(result.test_mode?'TEST PAYMENT — No money was charged. ':'')+(messages[result.state]||'We are checking your payment.');
 if(result.sale_mode==='preorder'&&result.dispatch_date)state.textContent+=' This is a pre-order. Expected dispatch from '+formatDispatch(result.dispatch_date)+'.';
 if(result.order_id)document.getElementById('order-reference').textContent='Order reference: '+result.order_id;
 }catch(error){state.textContent=error.message;}finally{button.disabled=false;}}
button.addEventListener('click',check);check();
