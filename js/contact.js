/* =========================================
   Contact form: GDPR gating + async submit
   - button enabled only when GDPR is checked
   - async submit with fetch; fallback to normal POST if fetch fails
   ========================================= */

(function () {
  const form = document.querySelector('form[data-formspree]');
  if (!form) return;

  const gdpr = form.querySelector('#gdpr');
  const submitBtn = form.querySelector('[data-submit]');
  const statusEl = form.querySelector('.form__status');

  const setStatus = (msg) => {
    if (statusEl) statusEl.textContent = msg;
  };

  const syncSubmitState = () => {
    const ok = !!(gdpr && gdpr.checked);
    if (submitBtn) submitBtn.disabled = !ok;
  };

  // Initial state
  syncSubmitState();

  // Toggle submit enabled based on GDPR
  if (gdpr) {
    gdpr.addEventListener('change', syncSubmitState);
  }

  // Async submit with fallback
  form.addEventListener('submit', async (e) => {
    // If GDPR not checked, block submission (safety)
    if (submitBtn && submitBtn.disabled) {
      e.preventDefault();
      setStatus('Te rugăm să confirmi acordul GDPR pentru a trimite mesajul.');
      return;
    }

    // Prefer async
    e.preventDefault();
    setStatus('');

    const action = form.getAttribute('action');
    if (!action || action.includes('XXXXXXX')) {
      setStatus('Formularul nu este încă configurat. Te rugăm să înlocuiești endpointul Formspree.');
      return;
    }

    const formData = new FormData(form);

    try {
      const res = await fetch(action, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      });

      if (res.ok) {
        form.reset();
        syncSubmitState();
        setStatus('Mulțumim! Am primit mesajul și revenim în cel mai scurt timp.');
      } else {
        setStatus('A apărut o problemă. Te rugăm să încerci din nou sau să ne scrii direct pe email.');
      }
    } catch (err) {
      // Fallback to classic POST
      try {
        form.removeEventListener('submit', () => {});
        form.submit();
      } catch (_) {
        setStatus('A apărut o problemă. Te rugăm să încerci din nou sau să ne scrii direct pe email.');
      }
    }
  });
})();
