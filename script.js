(() => {
  const topbar = document.querySelector('.topbar');
  const navToggle = document.querySelector('.nav-toggle');
  const mobilePanel = document.querySelector('.mobile-panel');

  const syncTopbar = () => {
    if (topbar) topbar.classList.toggle('scrolled', window.scrollY > 18);
  };
  syncTopbar();
  window.addEventListener('scroll', syncTopbar, { passive: true });

  if (navToggle && mobilePanel) {
    navToggle.addEventListener('click', () => {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!expanded));
      mobilePanel.classList.toggle('open', !expanded);
    });
    mobilePanel.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navToggle.setAttribute('aria-expanded', 'false');
        mobilePanel.classList.remove('open');
      });
    });
  }

  document.querySelectorAll('.faq-item').forEach(item => {
    const button = item.querySelector('.faq-button');
    const panel = item.querySelector('.faq-panel');
    if (!button || !panel) return;
    button.addEventListener('click', () => {
      const open = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(other => {
        if (other === item) return;
        other.classList.remove('open');
        const otherButton = other.querySelector('.faq-button');
        const otherPanel = other.querySelector('.faq-panel');
        if (otherButton) otherButton.setAttribute('aria-expanded', 'false');
        if (otherPanel) otherPanel.style.maxHeight = null;
      });
      item.classList.toggle('open', !open);
      button.setAttribute('aria-expanded', String(!open));
      panel.style.maxHeight = !open ? `${panel.scrollHeight}px` : null;
    });
  });

  const revealTargets = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealTargets.length) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.14 });
    revealTargets.forEach(el => observer.observe(el));
  } else {
    revealTargets.forEach(el => el.classList.add('visible'));
  }

  const bookingForm = document.getElementById('bookingForm');
  if (bookingForm) {
    bookingForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const submit = bookingForm.querySelector('button[type="submit"]');
      const success = document.getElementById('formSuccess');
      const wrap = document.getElementById('formWrap');
      const formData = new FormData(bookingForm);
      const payload = {
        name: formData.get('name'),
        unternehmen: formData.get('unternehmen'),
        email: formData.get('email'),
        telefon: formData.get('telefon'),
        paket: formData.get('paket'),
        nachricht: formData.get('nachricht'),
        _gotcha: formData.get('_gotcha')
      };

      if (submit) {
        submit.disabled = true;
        submit.textContent = 'Wird gesendet …';
      }

      try {
        const response = await fetch('/api/kontakt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Request failed');

        if (wrap) wrap.style.display = 'none';
        if (success) success.style.display = 'block';
      } catch (error) {
        if (submit) {
          submit.disabled = false;
          submit.innerHTML = 'Anfrage senden <span class="arrow">→</span>';
        }
        window.alert('Es ist ein Fehler aufgetreten. Bitte versuche es später erneut oder schreibe direkt eine E-Mail.');
      }
    });
  }
})();