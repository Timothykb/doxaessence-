export function initSignup(client) {
  const form = document.querySelector('#signup-form');
  const button = form.querySelector('[type=submit]');
  const status = document.querySelector('#signup-status');
  const originalButtonText = button.textContent;
  let busy = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    const values = new FormData(form);
    const newsletter = form.elements.newsletter ? values.has('newsletter') : form.dataset.consentOnSubmit === 'true';
    const firstName = String(values.get('first_name') || '').trim();
    const email = String(values.get('email') || '').trim();
    const fields = [form.elements.first_name, form.elements.email, form.elements.newsletter].filter(Boolean);
    fields.forEach(field => field.removeAttribute('aria-invalid'));
    let invalid, message;
    if (!firstName || firstName.length > 100) { invalid = fields[0]; message = 'Please enter your first name (up to 100 characters).'; }
    else if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { invalid = fields[1]; message = 'Please enter a valid email address, such as you@example.com.'; }
    else if (!newsletter) { invalid = form.elements.newsletter || button; message = 'Please tick the consent box to receive the newsletter and launch updates.'; }
    if (invalid) { status.textContent = message; invalid.setAttribute('aria-invalid','true'); invalid.focus(); return; }
    if (values.get('website')) return;
    busy = true; button.disabled = true; button.textContent = 'SIGNING YOU UP…';
    status.textContent = ''; form.setAttribute('aria-busy', 'true');
    try {
      const response = await fetch('/api/newsletter/signup', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,first_name:firstName,consent:newsletter}),signal:AbortSignal.timeout(15000)});
      if (!response.ok) throw Error('Signup not confirmed');
      status.textContent = 'Thank you! You are on the launch list.';
      form.reset();
      try { sessionStorage.setItem('doxa-signup-complete','yes'); } catch {}
      location.assign('/thank-you/');
    } catch {
      status.textContent = 'We could not save your signup. Please try again or email info@doxaessence.com.';
    } finally {
      busy = false; button.disabled = false; button.textContent = originalButtonText; form.removeAttribute('aria-busy');
    }
  });
}
