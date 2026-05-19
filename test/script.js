/* AK WebWorks — script.js */
(function () {
  'use strict';

  /* Nav shadow on scroll */
  const nav = document.querySelector('.nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });
  }

  /* Mobile drawer */
  const toggle = document.querySelector('.nav__toggle');
  const drawer = document.querySelector('.nav__drawer');
  if (toggle && drawer) {
    toggle.addEventListener('click', () => {
      const open = toggle.classList.toggle('open');
      drawer.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
    drawer.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        toggle.classList.remove('open');
        drawer.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* Contact form */
  const form = document.getElementById('bookingForm');
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      const btn  = form.querySelector('.form-submit');
      btn.disabled    = true;
      btn.textContent = 'Wird gesendet…';

      try {
        const res = await fetch('/api/kontakt', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(data)
        });
        if (res.ok) {
          document.getElementById('formWrap').style.display    = 'none';
          document.getElementById('formSuccess').style.display = 'block';
        } else throw new Error();
      } catch {
        btn.disabled  = false;
        btn.innerHTML = 'Anfrage senden <span class="arr">→</span>';
        alert('Etwas ist schiefgelaufen. Schreib mir direkt: info@akwebworks.de');
      }
    });
  }

})();
