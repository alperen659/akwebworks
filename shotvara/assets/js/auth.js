const API_BASE = '/shotvara-api/api/auth';

const dom = {
  authLoading: document.querySelector('#auth-loading'),
  authGuest: document.querySelector('#auth-guest'),
  authUser: document.querySelector('#auth-user'),
  accountUsername: document.querySelector('#account-username'),
  accountEmail: document.querySelector('#account-email'),
  accountFeedback: document.querySelector('#account-feedback'),

  openLoginButton: document.querySelector('#open-login-button'),
  openRegisterButton: document.querySelector('#open-register-button'),
  logoutButton: document.querySelector('#logout-button'),

  loginModal: document.querySelector('#login-modal'),
  registerModal: document.querySelector('#register-modal'),
  closeAuthButtons: document.querySelectorAll('[data-close-auth]'),

  loginForm: document.querySelector('#login-form'),
  loginIdentifier: document.querySelector('#login-identifier'),
  loginPassword: document.querySelector('#login-password'),
  loginSubmitButton: document.querySelector('#login-submit-button'),
  loginFeedback: document.querySelector('#login-feedback'),

  registerForm: document.querySelector('#register-form'),
  registerUsername: document.querySelector('#register-username'),
  registerEmail: document.querySelector('#register-email'),
  registerPassword: document.querySelector('#register-password'),
  registerPasswordRepeat: document.querySelector('#register-password-repeat'),
  registerSubmitButton: document.querySelector('#register-submit-button'),
  registerFeedback: document.querySelector('#register-feedback'),
};

bindAuthUi();
loadCurrentUser();

function bindAuthUi() {
  dom.openLoginButton?.addEventListener('click', () => {
    openModal(dom.loginModal);
    clearFeedback(dom.loginFeedback);
    dom.loginIdentifier?.focus();
  });

  dom.openRegisterButton?.addEventListener('click', () => {
    openModal(dom.registerModal);
    clearFeedback(dom.registerFeedback);
    dom.registerUsername?.focus();
  });

  dom.closeAuthButtons?.forEach((button) => {
    button.addEventListener('click', closeAllAuthModals);
  });

  dom.loginModal?.addEventListener('click', (event) => {
    if (event.target === dom.loginModal) {
      closeAllAuthModals();
    }
  });

  dom.registerModal?.addEventListener('click', (event) => {
    if (event.target === dom.registerModal) {
      closeAllAuthModals();
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeAllAuthModals();
    }
  });

  dom.loginForm?.addEventListener('submit', handleLogin);
  dom.registerForm?.addEventListener('submit', handleRegister);
  dom.logoutButton?.addEventListener('click', handleLogout);
}

async function loadCurrentUser() {
  setAuthState('loading');
  clearFeedback(dom.accountFeedback);

  try {
    const response = await fetch(`${API_BASE}/me`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });

    const data = await safeJson(response);

    if (response.ok && data?.authenticated && data?.user) {
      setAuthenticatedUser(data.user);
      return;
    }

    setAuthState('guest');
  } catch (error) {
    console.error('Account-Status konnte nicht geladen werden:', error);
    setAuthState('guest');
    showFeedback(
      dom.accountFeedback,
      'Account-System konnte gerade nicht erreicht werden.',
      'error'
    );
  }
}

async function handleRegister(event) {
  event.preventDefault();
  clearFeedback(dom.registerFeedback);

  const username = dom.registerUsername.value.trim();
  const email = dom.registerEmail.value.trim();
  const password = dom.registerPassword.value;
  const passwordRepeat = dom.registerPasswordRepeat.value;

  if (password !== passwordRepeat) {
    showFeedback(dom.registerFeedback, 'Die Passwörter stimmen nicht überein.', 'error');
    return;
  }

  setButtonLoading(dom.registerSubmitButton, true, 'Konto wird erstellt …');

  try {
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        username,
        email,
        password,
      }),
    });

    const data = await safeJson(response);

    if (!response.ok) {
      showFeedback(
        dom.registerFeedback,
        data?.error || 'Registrierung fehlgeschlagen.',
        'error'
      );
      return;
    }

    dom.registerForm.reset();
    closeAllAuthModals();
    setAuthenticatedUser(data.user);

    showFeedback(
      dom.accountFeedback,
      `Willkommen bei SHOTVARA, ${data.user.username}.`,
      'success'
    );
  } catch (error) {
    console.error('Registrierung fehlgeschlagen:', error);
    showFeedback(
      dom.registerFeedback,
      'Registrierung aktuell nicht möglich.',
      'error'
    );
  } finally {
    setButtonLoading(dom.registerSubmitButton, false, 'Konto erstellen');
  }
}

async function handleLogin(event) {
  event.preventDefault();
  clearFeedback(dom.loginFeedback);

  const login = dom.loginIdentifier.value.trim();
  const password = dom.loginPassword.value;

  setButtonLoading(dom.loginSubmitButton, true, 'Anmeldung läuft …');

  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        login,
        password,
      }),
    });

    const data = await safeJson(response);

    if (!response.ok) {
      showFeedback(
        dom.loginFeedback,
        data?.error || 'Anmeldung fehlgeschlagen.',
        'error'
      );
      return;
    }

    dom.loginForm.reset();
    closeAllAuthModals();
    setAuthenticatedUser(data.user);

    showFeedback(
      dom.accountFeedback,
      `Erfolgreich angemeldet als ${data.user.username}.`,
      'success'
    );
  } catch (error) {
    console.error('Login fehlgeschlagen:', error);
    showFeedback(
      dom.loginFeedback,
      'Anmeldung aktuell nicht möglich.',
      'error'
    );
  } finally {
    setButtonLoading(dom.loginSubmitButton, false, 'Anmelden');
  }
}

async function handleLogout() {
  clearFeedback(dom.accountFeedback);
  setButtonLoading(dom.logoutButton, true, 'Logout …');

  try {
    const response = await fetch(`${API_BASE}/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      showFeedback(dom.accountFeedback, 'Logout fehlgeschlagen.', 'error');
      return;
    }

    setAuthState('guest');
    showFeedback(dom.accountFeedback, 'Du wurdest ausgeloggt.', 'success');
  } catch (error) {
    console.error('Logout fehlgeschlagen:', error);
    showFeedback(dom.accountFeedback, 'Logout aktuell nicht möglich.', 'error');
  } finally {
    setButtonLoading(dom.logoutButton, false, 'Logout');
  }
}

function setAuthenticatedUser(user) {
  dom.accountUsername.textContent = user.username || 'Unbekannt';
  dom.accountEmail.textContent = user.email || '—';
  setAuthState('user');

  window.dispatchEvent(new CustomEvent('shotvara:auth-changed', {
    detail: {
      authenticated: true,
      user,
    },
  }));
}

function setAuthState(state) {
  dom.authLoading?.classList.toggle('visible', state === 'loading');
  dom.authGuest?.classList.toggle('visible', state === 'guest');
  dom.authUser?.classList.toggle('visible', state === 'user');

  if (state === 'guest') {
    window.dispatchEvent(new CustomEvent('shotvara:auth-changed', {
      detail: {
        authenticated: false,
        user: null,
      },
    }));
  }
}

function openModal(modal) {
  closeAllAuthModals();
  modal?.classList.add('visible');
}

function closeAllAuthModals() {
  dom.loginModal?.classList.remove('visible');
  dom.registerModal?.classList.remove('visible');
}

function showFeedback(element, text, type) {
  if (!element) return;

  element.textContent = text;
  element.classList.remove('success', 'error');

  if (type) {
    element.classList.add(type);
  }
}

function clearFeedback(element) {
  if (!element) return;

  element.textContent = '';
  element.classList.remove('success', 'error');
}

function setButtonLoading(button, loading, loadingText) {
  if (!button) return;

  if (loading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
    return;
  }

  button.textContent = button.dataset.originalText || loadingText;
  button.disabled = false;
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
