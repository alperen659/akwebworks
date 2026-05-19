let currentUser = null;
let socket = null;
let currentLobby = null;
let currentMatch = null;
let playerStateInterval = null;

const dom = {
  multiplayerButton: document.querySelector('#multiplayer-button'),
  multiplayerModal: document.querySelector('#multiplayer-modal'),
  closeMultiplayerButton: document.querySelector('#close-multiplayer-button'),

  connectionState: document.querySelector('#multiplayer-connect-state'),
  multiplayerFeedback: document.querySelector('#multiplayer-feedback'),

  startView: document.querySelector('#multiplayer-start-view'),
  lobbyView: document.querySelector('#lobby-view'),

  createLobbyButton: document.querySelector('#create-lobby-button'),
  joinLobbyForm: document.querySelector('#join-lobby-form'),
  joinLobbyCode: document.querySelector('#join-lobby-code'),

  lobbyCodeDisplay: document.querySelector('#lobby-code-display'),
  copyLobbyCodeButton: document.querySelector('#copy-lobby-code-button'),
  lobbyPlayerList: document.querySelector('#lobby-player-list'),

  toggleReadyButton: document.querySelector('#toggle-ready-button'),
  startMatchButton: document.querySelector('#start-match-button'),
  leaveLobbyButton: document.querySelector('#leave-lobby-button'),

  matchReadyModal: document.querySelector('#match-ready-modal'),
  matchPlayerPreview: document.querySelector('#match-player-preview'),
  enterMultiplayerMatchButton: document.querySelector('#enter-multiplayer-match-button'),
};

bindUi();
hydrateAuthState();

window.addEventListener('shotvara:auth-changed', (event) => {
  currentUser = event.detail?.authenticated ? event.detail.user : null;
  updateMultiplayerAvailability();

  if (!currentUser) {
    disconnectSocket();
    closeMultiplayerModal();
  }
});

window.addEventListener('shotvara:multiplayer-arena-entered', () => {
  startPlayerStateSync();
});

function bindUi() {
  dom.multiplayerButton?.addEventListener('click', openMultiplayerModal);
  dom.closeMultiplayerButton?.addEventListener('click', closeMultiplayerModal);

  dom.multiplayerModal?.addEventListener('click', (event) => {
    if (event.target === dom.multiplayerModal) {
      closeMultiplayerModal();
    }
  });

  dom.createLobbyButton?.addEventListener('click', createLobby);
  dom.joinLobbyForm?.addEventListener('submit', joinLobby);
  dom.leaveLobbyButton?.addEventListener('click', leaveLobby);
  dom.toggleReadyButton?.addEventListener('click', toggleReady);
  dom.startMatchButton?.addEventListener('click', startLobbyMatch);
  dom.copyLobbyCodeButton?.addEventListener('click', copyLobbyCode);

  dom.enterMultiplayerMatchButton?.addEventListener('click', () => {
    if (!currentMatch) {
      return;
    }

    dom.matchReadyModal?.classList.remove('visible');

    window.dispatchEvent(new CustomEvent('shotvara:multiplayer-enter-match', {
      detail: currentMatch,
    }));
  });

  dom.joinLobbyCode?.addEventListener('input', () => {
    dom.joinLobbyCode.value = dom.joinLobbyCode.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);
  });
}

async function hydrateAuthState() {
  try {
    const response = await fetch('/shotvara-api/api/auth/me', {
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });

    const data = await response.json();

    currentUser = response.ok && data?.authenticated
      ? data.user
      : null;
  } catch (error) {
    console.error('Multiplayer Auth-Abfrage fehlgeschlagen:', error);
    currentUser = null;
  }

  updateMultiplayerAvailability();
}

function updateMultiplayerAvailability() {
  if (!dom.multiplayerButton) {
    return;
  }

  dom.multiplayerButton.disabled = !currentUser;
  dom.multiplayerButton.textContent = currentUser
    ? 'Multiplayer'
    : 'Multiplayer nur mit Login';
}

function openMultiplayerModal() {
  if (!currentUser) {
    return;
  }

  dom.multiplayerModal?.classList.add('visible');
  clearFeedback();

  ensureSocketConnection();
}

function closeMultiplayerModal() {
  dom.multiplayerModal?.classList.remove('visible');
}

function ensureSocketConnection() {
  if (socket?.connected) {
    setConnectionState('Verbunden', 'connected');
    return;
  }

  if (socket) {
    socket.connect();
    return;
  }

  if (typeof window.io !== 'function') {
    setConnectionState('Socket.IO Client fehlt', 'error');
    showFeedback('Realtime-Verbindung konnte nicht initialisiert werden.', 'error');
    return;
  }

  setConnectionState('Verbindung wird aufgebaut …');

  socket = window.io({
    path: '/shotvara-api/socket.io',
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    setConnectionState('Verbunden', 'connected');
    clearFeedback();
  });

  socket.on('connect_error', (error) => {
    console.error('Socket Verbindung fehlgeschlagen:', error);
    setConnectionState('Verbindung fehlgeschlagen', 'error');

    if (String(error?.message).includes('UNAUTHENTICATED')) {
      showFeedback('Bitte melde dich erneut an.', 'error');
    } else {
      showFeedback('Multiplayer-Verbindung konnte nicht aufgebaut werden.', 'error');
    }
  });

  socket.on('disconnect', () => {
    setConnectionState('Verbindung getrennt', 'error');
    stopPlayerStateSync();
  });

  socket.on('socket:ready', () => {
    setConnectionState('Verbunden', 'connected');
  });

  socket.on('lobby:state', (lobby) => {
    currentLobby = lobby;
    renderLobby(lobby);
  });

  socket.on('match:start', (match) => {
    currentMatch = match;
    closeMultiplayerModal();
    renderMatchReady(match);

    dom.matchReadyModal?.classList.add('visible');

    window.dispatchEvent(new CustomEvent('shotvara:multiplayer-match-prepared', {
      detail: match,
    }));
  });

  socket.on('match:player-state', (playerState) => {
    window.SHOTVARA_GAME?.upsertRemotePlayer?.(playerState);
  });

  socket.on('match:player-left', ({ userId }) => {
    window.SHOTVARA_GAME?.removeRemotePlayer?.(userId);
  });
}

function disconnectSocket() {
  stopPlayerStateSync();

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  currentLobby = null;
  currentMatch = null;
  showStartView();
}

function createLobby() {
  if (!socket?.connected) {
    showFeedback('Keine Multiplayer-Verbindung verfügbar.', 'error');
    return;
  }

  socket.emit('lobby:create', {}, (response) => {
    if (!response?.ok) {
      showFeedback(response?.error || 'Lobby konnte nicht erstellt werden.', 'error');
      return;
    }

    currentLobby = response.lobby;
    renderLobby(response.lobby);
    showFeedback('Lobby erstellt.', 'success');
  });
}

function joinLobby(event) {
  event.preventDefault();

  const code = dom.joinLobbyCode.value.trim().toUpperCase();

  if (!code) {
    showFeedback('Bitte gib einen Lobby-Code ein.', 'error');
    return;
  }

  if (!socket?.connected) {
    showFeedback('Keine Multiplayer-Verbindung verfügbar.', 'error');
    return;
  }

  socket.emit('lobby:join', { code }, (response) => {
    if (!response?.ok) {
      showFeedback(response?.error || 'Lobby-Beitritt fehlgeschlagen.', 'error');
      return;
    }

    currentLobby = response.lobby;
    dom.joinLobbyForm.reset();
    renderLobby(response.lobby);
    showFeedback('Lobby beigetreten.', 'success');
  });
}

function leaveLobby() {
  if (!socket?.connected) {
    showFeedback('Keine Multiplayer-Verbindung verfügbar.', 'error');
    return;
  }

  socket.emit('lobby:leave', {}, (response) => {
    if (!response?.ok) {
      showFeedback(response?.error || 'Lobby konnte nicht verlassen werden.', 'error');
      return;
    }

    currentLobby = null;
    showStartView();
    showFeedback('Lobby verlassen.', 'success');
  });
}

function toggleReady() {
  if (!socket?.connected || !currentLobby) {
    return;
  }

  socket.emit('lobby:toggle-ready', {}, (response) => {
    if (!response?.ok) {
      showFeedback(response?.error || 'Bereit-Status konnte nicht geändert werden.', 'error');
    }
  });
}

function startLobbyMatch() {
  if (!socket?.connected || !currentLobby) {
    return;
  }

  socket.emit('lobby:start', {}, (response) => {
    if (!response?.ok) {
      showFeedback(response?.error || 'Match-Start nicht möglich.', 'error');
      return;
    }

    showFeedback(response?.message || 'Match wird gestartet.', 'success');
  });
}

async function copyLobbyCode() {
  if (!currentLobby?.code) {
    return;
  }

  try {
    await navigator.clipboard.writeText(currentLobby.code);
    showFeedback('Lobby-Code kopiert.', 'success');
  } catch (error) {
    console.error('Kopieren fehlgeschlagen:', error);
    showFeedback(`Lobby-Code: ${currentLobby.code}`, 'success');
  }
}

function renderLobby(lobby) {
  showLobbyView();

  dom.lobbyCodeDisplay.textContent = lobby.code || '—';
  dom.lobbyPlayerList.innerHTML = '';

  lobby.players.forEach((player) => {
    const card = document.createElement('div');
    card.className = 'lobby-player-card';

    const name = document.createElement('strong');
    name.textContent = player.username;

    const meta = document.createElement('div');
    meta.className = 'lobby-player-meta';

    if (player.isHost) {
      meta.appendChild(createBadge('Host', 'host'));
    }

    meta.appendChild(
      createBadge(player.ready ? 'Bereit' : 'Wartet', player.ready ? 'ready' : 'waiting')
    );

    card.appendChild(name);
    card.appendChild(meta);
    dom.lobbyPlayerList.appendChild(card);
  });

  const ownLobbyPlayer = lobby.players.find((player) => player.userId === currentUser?.id);
  dom.toggleReadyButton.textContent = ownLobbyPlayer?.ready
    ? 'Nicht bereit'
    : 'Bereit';

  const isHost = lobby.hostUserId === currentUser?.id;
  dom.startMatchButton.style.display = isHost ? 'inline-flex' : 'none';
}

function renderMatchReady(match) {
  dom.matchPlayerPreview.innerHTML = '';

  match.players.forEach((player) => {
    const row = document.createElement('div');

    const name = document.createElement('strong');
    name.textContent = player.username;

    const role = document.createElement('span');
    role.textContent = player.isHost ? 'Host' : 'Mitspieler';

    row.appendChild(name);
    row.appendChild(role);
    dom.matchPlayerPreview.appendChild(row);
  });
}

function startPlayerStateSync() {
  stopPlayerStateSync();

  playerStateInterval = window.setInterval(() => {
    if (!socket?.connected || !currentMatch) {
      return;
    }

    const state = window.SHOTVARA_GAME?.getLocalMultiplayerState?.();

    if (!state) {
      return;
    }

    socket.emit('match:player-state', state);
  }, 80);
}

function stopPlayerStateSync() {
  if (playerStateInterval) {
    window.clearInterval(playerStateInterval);
    playerStateInterval = null;
  }
}

function createBadge(text, variant) {
  const badge = document.createElement('span');
  badge.className = `lobby-badge ${variant}`;
  badge.textContent = text;
  return badge;
}

function showStartView() {
  dom.startView?.classList.add('visible');
  dom.lobbyView?.classList.remove('visible');
  dom.lobbyCodeDisplay.textContent = '—';
  dom.lobbyPlayerList.innerHTML = '';
}

function showLobbyView() {
  dom.startView?.classList.remove('visible');
  dom.lobbyView?.classList.add('visible');
}

function setConnectionState(text, variant = '') {
  dom.connectionState.textContent = text;
  dom.connectionState.classList.remove('connected', 'error');

  if (variant) {
    dom.connectionState.classList.add(variant);
  }
}

function showFeedback(text, variant = '') {
  dom.multiplayerFeedback.textContent = text;
  dom.multiplayerFeedback.classList.remove('success', 'error');

  if (variant) {
    dom.multiplayerFeedback.classList.add(variant);
  }
}

function clearFeedback() {
  dom.multiplayerFeedback.textContent = '';
  dom.multiplayerFeedback.classList.remove('success', 'error');
}
