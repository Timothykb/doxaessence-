import './site.js';
import './pages.css';

let n = 1;
try { n = Math.min(99, Math.max(1, Number(sessionStorage.getItem('doxa-preorder-qty')) || 1)); } catch {}
document.querySelector('[data-confirm-qty]').textContent = n;
document.querySelector('[data-confirm-sub]').textContent = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(89.95 * n);
