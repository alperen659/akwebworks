
(() => {
  const topbar = document.getElementById('navbar');
  const toggle = document.querySelector('.nav-toggle');
  const mobilePanel = document.querySelector('.mobile-panel');
  const mobileLinks = document.querySelectorAll('.mobile-links a');

  const setScrolled = () => {
    if (topbar) topbar.classList.toggle('scrolled', window.scrollY > 18);
  };
  setScrolled();
  window.addEventListener('scroll', setScrolled, { passive: true });

  if (topbar && toggle && mobilePanel) {
    toggle.addEventListener('click', () => {
      const open = topbar.classList.toggle('menu-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    });

    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        topbar.classList.remove('menu-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Menü öffnen');
      });
    });
  }

  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealItems.length) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealItems.forEach(item => observer.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add('is-visible'));
  }

  const form = document.getElementById('bookingForm');
  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const formData = new FormData(form);
      const payload = {
        name: formData.get('name'),
        unternehmen: formData.get('unternehmen'),
        email: formData.get('email'),
        telefon: formData.get('telefon'),
        paket: formData.get('paket'),
        nachricht: formData.get('nachricht'),
        _gotcha: formData.get('_gotcha')
      };

      const submit = form.querySelector('.form-submit');
      const original = submit ? submit.innerHTML : '';
      if (submit) {
        submit.disabled = true;
        submit.textContent = 'Wird gesendet...';
      }

      try {
        const response = await fetch('/api/kontakt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Serverfehler');

        const wrap = document.getElementById('formWrap');
        const success = document.getElementById('formSuccess');
        if (wrap) wrap.style.display = 'none';
        if (success) success.style.display = 'block';
      } catch (error) {
        if (submit) {
          submit.disabled = false;
          submit.innerHTML = original || 'Anfrage senden <span class="arrow">→</span>';
        }
        alert('Es ist ein Fehler aufgetreten. Bitte versuche es später nochmal oder schreib mir direkt eine E-Mail.');
      }
    });
  }
})();
