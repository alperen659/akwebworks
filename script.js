/* AK WebWorks — script.js */

(function () {
  'use strict';

  /* ── Nav scroll shadow ── */
  const nav = document.querySelector('.nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  /* ── Mobile nav toggle ── */
  const toggle = document.querySelector('.nav__toggle');
  const drawer = document.querySelector('.nav__drawer');
  if (toggle && drawer) {
    toggle.addEventListener('click', () => {
      const open = toggle.classList.toggle('open');
      drawer.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open);
    });

    // Close on drawer link click
    drawer.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        toggle.classList.remove('open');
        drawer.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ── Scroll reveal ── */
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.07 });
    revealEls.forEach(el => observer.observe(el));
  }

  /* ── Contact form ── */
  const form = document.getElementById('bookingForm');
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      const btn = form.querySelector('.form-submit');
      btn.disabled = true;
      btn.textContent = 'Wird gesendet…';

      try {
        const res = await fetch('/api/kontakt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (res.ok) {
          document.getElementById('formWrap').style.display = 'none';
          document.getElementById('formSuccess').style.display = 'block';
        } else throw new Error();
      } catch {
        btn.disabled = false;
        btn.innerHTML = 'Anfrage senden <span class="arrow">→</span>';
        alert('Es ist ein Fehler aufgetreten. Bitte schreib uns direkt an info@akwebworks.de');
      }
    });
  }

})();
