(function() {
  const RESPONSES = [
    {
      keywords: ['preis', 'kosten', 'kostet', 'paket', 'pakete', 'basis', 'plus', 'individuell', 'angebot', 'günstig', 'teuer', 'euro', '€'],
      answer: `Wir bieten drei transparente Festpreispakete an:\n\n• <strong>Basis – 599 €</strong> einmalig: Startseite + bis zu 4 Unterseiten, mobiloptimiertes Design, Kontaktformular, Impressum & Datenschutz inklusive.\n\n• <strong>Website Plus – 999 €</strong> einmalig (beliebteste Wahl): Alles aus Basis + 5+ Unterseiten, Galerie/FAQ, lokales SEO-Setup, Google Maps & Premium-Support.\n\n• <strong>Individuell – ab 1.599 €</strong>: Maßgeschneidert für größere Projekte mit Sonderfunktionen oder mehreren Standorten.\n\nAlle Preise zzgl. MwSt. Ratenzahlung ist möglich. Möchten Sie mehr zu einem bestimmten Paket wissen?`
    },
    {
      keywords: ['rate', 'ratenzahlung', 'zahlung', 'bezahlen', 'anzahlung', 'rechnung'],
      answer: `Ratenzahlung ist selbstverständlich möglich. Die Standardregelung lautet: 50 % bei Beauftragung, 50 % bei Fertigstellung. Bei größeren Projekten sind auch drei Raten möglich – ohne Aufpreis. Haben Sie weitere Fragen zur Zahlung?`
    },
    {
      keywords: ['pflege', 'wartung', 'monat', 'monatlich', 'abo', 'updates', 'änderungen'],
      answer: `Pflege ist optional und jederzeit kündbar – kein Vertrag, keine Mindestlaufzeit.\n\n• <strong>Basis-Pflege – 29 €/Monat</strong>\n• <strong>Plus-Pflege – 59 €/Monat</strong>\n• <strong>Individuelle Pflege</strong> – nach Aufwand\n\nSie können Änderungen natürlich auch einzeln beauftragen. Möchten Sie mehr wissen?`
    },
    {
      keywords: ['ablauf', 'prozess', 'wie läuft', 'schritte', 'vorgehen', 'wie funktioniert', 'wie geht'],
      answer: `Der Ablauf ist klar strukturiert und dauert in der Regel <strong>7–14 Werktage</strong>:\n\n1. <strong>Gespräch</strong> (Tag 1): 30 Min. kostenlos & unverbindlich\n2. <strong>Konzept</strong> (Tag 2–4): Struktur, Texte, Bilder\n3. <strong>Entwicklung</strong> (Tag 5–10): Sauberer Code, Zwischenstände\n4. <strong>Live-Schaltung</strong> (Tag 10–14): Domain verbunden, alles getestet\n\nKeine Vorkenntnisse nötig – wir erarbeiten alles gemeinsam. Klingt das gut?`
    },
    {
      keywords: ['dauer', 'wie lange', 'zeit', 'wochen', 'tage', 'fertig', 'wann'],
      answer: `In der Regel ist Ihre Website innerhalb von <strong>7–14 Werktagen</strong> fertig und online. Bei größeren Projekten etwas länger – Sie erhalten immer einen verbindlichen Zeitplan vorab. Haben Sie einen bestimmten Wunschtermin?`
    },
    {
      keywords: ['text', 'texte', 'inhalt', 'bild', 'bilder', 'foto', 'fotos', 'keine'],
      answer: `Kein Problem – Sie benötigen keine eigenen Texte oder Bilder. Texte erarbeiten wir gemeinsam im Gespräch, und für Bilder können lizenzfreie Quellen genutzt werden. Auf Wunsch vermitteln wir auch einen Fotografen. Sie müssen also nichts vorbereiten.`
    },
    {
      keywords: ['gehört', 'eigentümer', 'owner', 'mein', 'besitz', 'lock', 'abhängig', 'lizenz'],
      answer: `Nach Fertigstellung gehört Ihnen alles – Domain, Inhalte und Code. Es gibt keinen Lock-in, keine Lizenzgebühren und keine monatliche Mietfalle. Ihre Website ist zu 100 % Ihr Eigentum.`
    },
    {
      keywords: ['dsgvo', 'datenschutz', 'impressum', 'rechtlich', 'konform', 'legal', 'cookie'],
      answer: `Alle Websites werden von Anfang an DSGVO-konform gebaut – mit korrektem Impressum, Datenschutzerklärung und einem ordnungsgemäßen Kontaktformular. Cookie-Hinweis wird eingebaut, sofern nötig. Kein nachträgliches Flicken.`
    },
    {
      keywords: ['seo', 'google', 'gefunden', 'suchmaschine', 'ranking', 'suche'],
      answer: `Im Paket Website Plus ist ein lokales SEO-Setup inklusive – damit Ihr Unternehmen bei Google in Ihrer Region besser gefunden wird. Dazu gehören Google Maps Integration, korrekte Meta-Daten und eine saubere Seitenstruktur. Möchten Sie mehr dazu wissen?`
    },
    {
      keywords: ['wer', 'alperen', 'über', 'inhaber', 'person', 'fachinformatiker', 'bielefeld'],
      answer: `Hinter AK WebWorks steht <strong>Alperen Ali Kati</strong>, 29 Jahre, gelernter Fachinformatiker aus Bielefeld. Seit 2022 baut er hochwertige Websites für lokale Unternehmen – ohne Baukasten, ohne Templates, mit echtem Code und persönlicher Betreuung. Über 40 Projekte wurden bisher erfolgreich umgesetzt.`
    },
    {
      keywords: ['hosting', 'server', 'domain', 'kosten laufend', 'laufend'],
      answer: `Die laufenden Kosten sind überschaubar:\n\n• <strong>Domain</strong>: ca. 10–15 €/Jahr (tragen Sie selbst)\n• <strong>Hosting</strong>: ab ca. 5 €/Monat (Empfehlung & Einrichtung kostenlos)\n\nPflege durch uns ist optional. Sonst entstehen durch AK WebWorks keine weiteren Kosten.`
    },
    {
      keywords: ['shop', 'onlineshop', 'buchung', 'buchungssystem', 'reservierung', 'e-commerce'],
      answer: `Online-Shop und Buchungssysteme sind als Zusatzmodul auf Anfrage möglich. Sprechen Sie uns gerne im kostenlosen Erstgespräch darauf an – wir finden die passende Lösung für Sie.`
    },
    {
      keywords: ['beratung', 'gespräch', 'termin', 'erstgespräch', 'anfrage', 'kontakt', 'buchen', 'anrufen', 'schreiben', 'mail', 'email'],
      answer: `Sehr gerne! Das kostenlose Erstgespräch dauert ca. 30 Minuten und ist völlig unverbindlich. Sie können uns auf drei Wegen erreichen:\n\n• <strong>Kontaktformular</strong>: <a href="kontakt.html" style="color:#1D5BD4;">Zur Kontaktseite</a>\n• <strong>E-Mail</strong>: <a href="mailto:info@akwebworks.de" style="color:#1D5BD4;">info@akwebworks.de</a>\n• <strong>Telefon</strong>: <a href="tel:+4915123456789" style="color:#1D5BD4;">+49 151 234 56789</a>\n\nWir antworten meist innerhalb von 24 Stunden – auch abends und samstags.`
    },
    {
      keywords: ['hallo', 'hi', 'hey', 'guten tag', 'guten morgen', 'guten abend', 'servus', 'moin'],
      answer: `Herzlich willkommen bei AK WebWorks! Schön, dass Sie da sind. Ich helfe Ihnen gerne weiter – ob es um Preise, den Ablauf oder eine Beratung geht. Womit kann ich Ihnen helfen?`
    },
    {
      keywords: ['danke', 'vielen dank', 'super', 'toll', 'perfekt', 'prima', 'gut'],
      answer: `Sehr gerne! Ich freue mich, wenn ich Ihnen helfen konnte. Falls Sie weitere Fragen haben oder ein kostenloses Erstgespräch buchen möchten, stehe ich jederzeit zur Verfügung.`
    }
  ];

  const FALLBACK = `Zu dieser Frage kann ich Ihnen leider keine direkte Antwort geben. Für detaillierte Informationen empfehle ich Ihnen, das <a href="kontakt.html" style="color:#1D5BD4;">Kontaktformular</a> zu nutzen oder uns direkt zu kontaktieren:\n\n• <strong>E-Mail</strong>: <a href="mailto:info@akwebworks.de" style="color:#1D5BD4;">info@akwebworks.de</a>\n• <strong>Telefon</strong>: <a href="tel:+4915123456789" style="color:#1D5BD4;">+49 151 234 56789</a>\n\nWir antworten innerhalb von 24 Stunden.`;

  function findResponse(text) {
    const lower = text.toLowerCase();
    for (const r of RESPONSES) {
      if (r.keywords.some(k => lower.includes(k))) return r.answer;
    }
    return FALLBACK;
  }

  function getTime() {
    return new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }

  const style = document.createElement('style');
  style.textContent = `
    #akwb-toggle{position:fixed;bottom:28px;right:28px;width:56px;height:56px;border-radius:50%;background:#1D5BD4;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(29,91,212,0.35);z-index:9999;transition:transform .2s,background .2s}
    #akwb-toggle:hover{background:#3B77F0;transform:scale(1.07)}
    #akwb-toggle svg{width:26px;height:26px;color:#fff}
    #akwb-window{position:fixed;bottom:96px;right:28px;width:360px;max-height:540px;background:#fff;border:1px solid #D6DAE8;border-radius:18px;display:flex;flex-direction:column;z-index:9998;overflow:hidden;box-shadow:0 8px 40px rgba(15,22,40,0.13);font-family:"IBM Plex Sans",system-ui,sans-serif;transition:opacity .2s,transform .2s}
    #akwb-window.akwb-hidden{opacity:0;pointer-events:none;transform:translateY(12px) scale(0.97)}
    .akwb-header{background:#0F1623;padding:14px 18px;display:flex;align-items:center;gap:10px;flex-shrink:0}
    .akwb-avatar{width:36px;height:36px;border-radius:8px;background:transparent;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;border:none}
    .akwb-hinfo{flex:1}
    .akwb-hname{color:#F0F2F7;font-size:14px;font-weight:600}
    .akwb-hstatus{color:rgba(240,242,247,0.5);font-size:12px;display:flex;align-items:center;gap:5px}
    .akwb-dot{width:7px;height:7px;border-radius:50%;background:#16A34A;display:inline-block}
    .akwb-close{background:none;border:none;cursor:pointer;color:rgba(240,242,247,0.4);padding:4px;border-radius:6px;display:flex;align-items:center}
    .akwb-close:hover{color:#F0F2F7;background:rgba(255,255,255,0.08)}
    .akwb-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;background:#EFF1F8;min-height:0}
    .akwb-msg{display:flex;flex-direction:column;max-width:86%}
    .akwb-msg.akwb-bot{align-self:flex-start}
    .akwb-msg.akwb-user{align-self:flex-end}
    .akwb-bubble{padding:10px 14px;border-radius:14px;font-size:14px;line-height:1.6}
    .akwb-bot .akwb-bubble{background:#fff;border:1px solid #D6DAE8;color:#0F1623;border-bottom-left-radius:4px}
    .akwb-user .akwb-bubble{background:#1D5BD4;color:#fff;border-bottom-right-radius:4px}
    .akwb-time{font-size:11px;color:#7A8499;margin-top:4px}
    .akwb-user .akwb-time{text-align:right}
    .akwb-typing{display:flex;align-items:center;gap:5px;padding:10px 14px;background:#fff;border:1px solid #D6DAE8;border-radius:14px;border-bottom-left-radius:4px;width:fit-content}
    .akwb-tdot{width:7px;height:7px;border-radius:50%;background:#7A8499;animation:akwb-bounce 1.2s ease infinite}
    .akwb-tdot:nth-child(2){animation-delay:.2s}
    .akwb-tdot:nth-child(3){animation-delay:.4s}
    @keyframes akwb-bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
    .akwb-qrs{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
    .akwb-qr{background:#fff;border:1px solid #1D5BD4;color:#1D5BD4;padding:5px 11px;border-radius:999px;font-size:12.5px;cursor:pointer;transition:all .15s;font-family:"IBM Plex Sans",system-ui,sans-serif}
    .akwb-qr:hover{background:#1D5BD4;color:#fff}
    .akwb-input-area{padding:12px 14px;background:#fff;border-top:1px solid #D6DAE8;display:flex;gap:8px;align-items:flex-end;flex-shrink:0}
    .akwb-input{flex:1;border:1.5px solid #D6DAE8;border-radius:10px;padding:9px 12px;font-size:14px;resize:none;outline:none;font-family:"IBM Plex Sans",system-ui,sans-serif;color:#0F1623;background:#EFF1F8;line-height:1.5;max-height:100px;transition:border-color .2s}
    .akwb-input:focus{border-color:#1D5BD4;background:#fff}
    .akwb-input::placeholder{color:#7A8499}
    .akwb-send{width:38px;height:38px;border-radius:10px;background:#1D5BD4;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s}
    .akwb-send:hover{background:#3B77F0}
    .akwb-send:disabled{background:#D6DAE8;cursor:not-allowed}
    .akwb-send svg{width:17px;height:17px;color:#fff}
    .akwb-footer{padding:7px;text-align:center;font-size:11px;color:#7A8499;background:#fff;border-top:1px solid #D6DAE8}
    @media(max-width:420px){#akwb-window{width:calc(100vw - 32px);right:16px;bottom:88px}#akwb-toggle{right:16px;bottom:16px}}
  `;
  document.head.appendChild(style);

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'akwb-toggle';
  toggleBtn.setAttribute('aria-label', 'Chat öffnen');
  toggleBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;

  const chatWin = document.createElement('div');
  chatWin.id = 'akwb-window';
  chatWin.classList.add('akwb-hidden');
  chatWin.innerHTML = `
    <div class="akwb-header">
      <div class="akwb-avatar"><img src="favicon.png" alt="AK WebWorks" style="width:36px;height:36px;object-fit:cover;border-radius:8px;display:block;"></div>
      <div class="akwb-hinfo">
        <div class="akwb-hname">AK WebBot</div>
        <div class="akwb-hstatus"><span class="akwb-dot"></span> Online · AK WebWorks</div>
      </div>
      <button class="akwb-close" id="akwb-close" aria-label="Schließen">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="akwb-msgs" id="akwb-msgs"></div>
    <div class="akwb-input-area">
      <textarea class="akwb-input" id="akwb-input" placeholder="Nachricht schreiben..." rows="1"></textarea>
      <button class="akwb-send" id="akwb-send" aria-label="Senden">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
    <div class="akwb-footer">AK WebWorks · akwebworks.de</div>
  `;

  document.body.appendChild(toggleBtn);
  document.body.appendChild(chatWin);

  const msgsEl = document.getElementById('akwb-msgs');
  const inputEl = document.getElementById('akwb-input');
  const sendBtnEl = document.getElementById('akwb-send');
  let isOpen = false;

  function scrollBottom() {
    setTimeout(() => { msgsEl.scrollTop = msgsEl.scrollHeight; }, 50);
  }

  function addMsg(role, html) {
    const div = document.createElement('div');
    div.className = 'akwb-msg akwb-' + role;
    div.innerHTML = `<div class="akwb-bubble">${html}</div><div class="akwb-time">${getTime()}</div>`;
    msgsEl.appendChild(div);
    scrollBottom();
    return div;
  }

  function addQuickReplies(parent, items) {
    const qr = document.createElement('div');
    qr.className = 'akwb-qrs';
    items.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'akwb-qr';
      btn.textContent = item;
      btn.onclick = () => { document.querySelectorAll('.akwb-qrs').forEach(e => e.remove()); sendMsg(item); };
      qr.appendChild(btn);
    });
    parent.appendChild(qr);
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'akwb-msg akwb-bot';
    div.id = 'akwb-typing';
    div.innerHTML = `<div class="akwb-typing"><div class="akwb-tdot"></div><div class="akwb-tdot"></div><div class="akwb-tdot"></div></div>`;
    msgsEl.appendChild(div);
    scrollBottom();
  }

  function sendMsg(text) {
    if (!text) return;
    document.querySelectorAll('.akwb-qrs').forEach(e => e.remove());
    addMsg('user', text);
    showTyping();
    setTimeout(() => {
      document.getElementById('akwb-typing')?.remove();
      const reply = findResponse(text);
      const msgEl = addMsg('bot', reply);
      if (!text.toLowerCase().includes('kontakt') && !text.toLowerCase().includes('beratung')) {
        addQuickReplies(msgEl, ['Beratung buchen', 'Preise ansehen', 'Ablauf erklären']);
      }
    }, 700 + Math.random() * 500);
  }

  toggleBtn.addEventListener('click', () => {
    isOpen = !isOpen;
    chatWin.classList.toggle('akwb-hidden', !isOpen);
    toggleBtn.innerHTML = isOpen
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="26" height="26"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
    if (isOpen && msgsEl.children.length === 0) {
      const welcome = addMsg('bot', 'Hallo! Ich bin AK WebBot, der digitale Assistent von AK WebWorks. 👋<br><br>Ich beantworte gerne Ihre Fragen rund um unsere Webdesign-Leistungen, Pakete und den Ablauf. Womit kann ich Ihnen helfen?');
      addQuickReplies(welcome, ['Was kostet eine Website?', 'Wie läuft ein Projekt ab?', 'Über AK WebWorks', 'Beratung buchen']);
    }
    if (isOpen) inputEl.focus();
  });

  document.getElementById('akwb-close').addEventListener('click', () => {
    isOpen = false;
    chatWin.classList.add('akwb-hidden');
    toggleBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="26" height="26"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  });

  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const t = inputEl.value.trim();
      if (t) { inputEl.value = ''; inputEl.style.height = 'auto'; sendMsg(t); }
    }
  });

  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
  });

  sendBtnEl.addEventListener('click', () => {
    const t = inputEl.value.trim();
    if (t) { inputEl.value = ''; inputEl.style.height = 'auto'; sendMsg(t); }
  });
})();
