import './site.js';
import './pages.css';

const PRICE_CENTS = 8995;
const SHIPPING_CENTS = 700; // flat rate, Netherlands only
const euro = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' });
const qty = document.querySelector('#qty');
const clampQty = value => Math.min(99, Math.max(1, Math.round(Number(value) || 1)));
function render() {
  const n = clampQty(qty.value);
  const subtotal = euro.format((PRICE_CENTS * n) / 100);
  document.querySelector('[data-sum-qty]').textContent = n;
  document.querySelector('[data-sum-sub]').textContent = subtotal;
  document.querySelector('[data-sum-total]').textContent = euro.format((PRICE_CENTS * n + SHIPPING_CENTS) / 100);
  try { sessionStorage.setItem('doxa-preorder-qty', String(n)); } catch {}
}
document.querySelectorAll('[data-qty]').forEach(button => button.addEventListener('click', () => {
  qty.value = clampQty(Number(qty.value) + Number(button.dataset.qty)); render();
}));
qty.addEventListener('input', render);
qty.addEventListener('change', () => { qty.value = clampQty(qty.value); render(); });
// No order can be placed until checkout is connected; never simulate a purchase.
document.querySelector('#preorder-form').addEventListener('submit', event => event.preventDefault());
render();
