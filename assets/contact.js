/* Contact form: sends the message to the contact Worker at /api/contact */
(() => {
  const form = document.getElementById('contact-form');
  if (!form) return;
  const status = form.querySelector('.form-status');
  const button = form.querySelector('button[type="submit"]');
  const say = (text, kind = '') => { status.textContent = text; status.className = 'form-status ' + kind; };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (!data.name.trim() || !data.email.trim() || !data.message.trim()) return say('Please fill in your name, email and message.', 'err');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) return say('That email address doesn\'t look right.', 'err');
    if (!data['cf-turnstile-response']) return say('Please complete the check above the button.', 'err');

    button.disabled = true;
    button.textContent = 'Sending…';
    say('');
    try {
      const res = await fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) throw new Error(body.error || 'The message couldn\'t be sent right now.');
      form.innerHTML = '<div class="form-done"><h3>Message sent</h3><p class="muted">Thanks for writing. I\'ll get back to you by email.</p></div>';
    } catch (err) {
      const msg = err instanceof TypeError ? 'The message couldn\'t be sent right now.' : err.message;
      say(`${msg} You can also email me directly.`, 'err');
      button.disabled = false;
      button.textContent = 'Send message';
      if (window.turnstile) window.turnstile.reset();
    }
  });
})();
