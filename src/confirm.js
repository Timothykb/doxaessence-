import './site.js';
import './pages.css';

let n = 1;
try { n = Math.min(99, Math.max(1, Number(sessionStorage.getItem('doxa-preorder-qty')) || 1)); } catch {}
document.querySelector('[data-confirm-qty]').textContent = n;
const euro = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' });
document.querySelector('[data-confirm-sub]').textContent = euro.format((8995 * n) / 100);
document.querySelector('[data-confirm-total]').textContent = euro.format((8995 * n + 700) / 100);
