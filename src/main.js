import './style.css';
import './storefront.css';
import './signup.css';
import './launch.css';
import { initSignup } from './signup.js';
import { initActiveNavigation } from './navigation.js';
import { supabase } from './supabase.js';

const menu = document.querySelector('.mobile-menu');
const navigation = document.querySelector('#navigation');
function closeMenu() { navigation.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Open menu'); }
menu.addEventListener('click', () => { const open = navigation.classList.toggle('open'); menu.setAttribute('aria-expanded', String(open)); menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); });
navigation.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
initActiveNavigation(navigation);
initSignup(supabase);
