export function initActiveNavigation(navigation) {
  const links = [...navigation.querySelectorAll('a[href^="#"]')];
  const sections = links.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
  let frame = 0;
  function activate(id) {
    links.forEach(link => {
      const selected = link.hash === `#${id}`;
      link.classList.toggle('nav-pill', selected);
      if (selected) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function sync() {
    frame = 0;
    const line = document.querySelector('.header').getBoundingClientRect().bottom + 90;
    const ordered = [...sections].sort((a,b) => a.offsetTop-b.offsetTop);
    let current = ordered[0];
    for (const section of ordered) if (section.getBoundingClientRect().top <= line) current = section;
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 3) current = ordered.at(-1);
    if (current) activate(current.id);
  }
  navigation.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const section = document.querySelector(link.hash);
    if (!section) return;
    // Jump directly so menu state and visible content always agree.
    event.preventDefault();
    history.pushState(null, '', link.hash);
    const top = section.getBoundingClientRect().top + scrollY - document.querySelector('.header').offsetHeight - 16;
    window.scrollTo({top, behavior:'instant'});
    activate(section.id);
  });
  const schedule = () => { if (!frame) frame = requestAnimationFrame(sync); };
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('popstate', schedule);
  sync();
}
