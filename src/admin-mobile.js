const toggle = document.getElementById('admin-menu-toggle');
const sidebar = document.querySelector('#studio aside');
function closeMenu() {
 sidebar.classList.remove('menu-open');
 toggle.setAttribute('aria-expanded', 'false');
 toggle.textContent = 'Menu openen';
}
toggle.addEventListener('click', () => {
 const open = sidebar.classList.toggle('menu-open');
 toggle.setAttribute('aria-expanded', String(open));
 toggle.textContent = open ? 'Menu sluiten' : 'Menu openen';
});
sidebar.querySelector('nav').addEventListener('click', event => {
 if (!event.target.closest('a')) return;
 closeMenu();
 if (matchMedia('(max-width:850px)').matches) {
  document.getElementById('page-title').setAttribute('tabindex', '-1');
  document.getElementById('page-title').focus({preventScroll:true});
  window.scrollTo({top:0,behavior:'instant'});
 }
});
document.addEventListener('keydown', event => {
 if (event.key === 'Escape' && sidebar.classList.contains('menu-open')) {
  closeMenu(); toggle.focus();
 }
});
// Keep labels in sync with tables populated asynchronously by the dashboard.
function labelTables() {
 document.querySelectorAll('.table-wrap table').forEach(table => {
  const headings = [...table.querySelectorAll('thead th')].map(th => th.textContent.trim());
  table.querySelectorAll('tbody tr').forEach(row => {
   [...row.children].forEach((cell, index) => {
    const label = headings[index] || '';
    if (cell.dataset.label !== label) cell.dataset.label = label;
   });
  });
 });
}
labelTables();
new MutationObserver(labelTables).observe(document.getElementById('studio'), {childList:true,subtree:true});
