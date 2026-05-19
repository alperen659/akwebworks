import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const PLAYER = {
  height: 1.72,
  radius: 0.42,
  hitRadius: 0.62,
  walkSpeed: 7.6,
  acceleration: 28,
  damping: 11,
  jumpVelocity: 7.1,
  gravity: 21,
  maxHp: 100,
  maxArmor: 100,
};

const ARENA = {
  halfSize: 22,
  wallHeight: 5.4,
};

const WEAPONS = {
  pistol: {
    id: 'pistol',
    slot: '1',
    name: 'Pistole',
    damage: 34,
    magazineSize: 12,
    fireDelay: 0.34,
    reloadTime: 1.15,
    spread: 0.007,
    automatic: false,
    color: 0x7fdfff,
    modelPath: './models/weapons/pistol.glb',
  },
  mg: {
    id: 'mg',
    slot: '2',
    name: 'Maschinengewehr',
    damage: 18,
    magazineSize: 35,
    fireDelay: 0.095,
    reloadTime: 1.8,
    spread: 0.028,
    automatic: true,
    color: 0xffb35f,
    modelPath: './models/weapons/assault-rifle.glb',
  },
  sniper: {
    id: 'sniper',
    slot: '3',
    name: 'Sniper',
    damage: 100,
    magazineSize: 5,
    fireDelay: 0.92,
    reloadTime: 2.35,
    spread: 0.0015,
    automatic: false,
    color: 0xff6b93,
    modelPath: './models/weapons/sniper-rifle.glb',
  },
};

const ENEMY = {
  maxHp: 100,
  count: 5,
  scale: 0.5,
  patrolSpeed: 1.55,
  chaseSpeed: 2.55,
  respawnDelay: 3200,

  detectionRange: 15.5,
  attackRange: 13.5,
  preferredRange: 8.5,

  shotDamage: 16,
  shotSpread: 0.105,
  minShotDelay: 1.05,
  maxShotDelay: 1.8,

  collisionRadius: 0.42,
  modelPath: './models/characters/enemy-man.glb',
};

const PICKUP_POSITIONS = {
  mg: [-16, 0.72, 0],
  sniper: [16, 0.72, -2],
  armor: [0, 0.78, -16],
};

const ENEMY_ROUTES = [
  [
    [-17, -15],
    [-17, -6],
    [-17, 4],
    [-15, 13],
  ],
  [
    [17, -15],
    [17, -7],
    [17, 4],
    [15, 13],
  ],
  [
    [-12, -17],
    [-3, -17],
    [6, -17],
    [14, -16],
  ],
  [
    [-13, 17],
    [-4, 17],
    [6, 17],
    [14, 16],
  ],
  [
    [-6, -1],
    [-1, -6],
    [6, -4],
    [7, 5],
    [-2, 7],
  ],
];

const root = document.querySelector('#game-root');
const menu = document.querySelector('#menu');
const pauseMenu = document.querySelector('#pause-menu');
const startButton = document.querySelector('#start-button');
const resumeButton = document.querySelector('#resume-button');
const hudSpeed = document.querySelector('#hud-speed');
const hudState = document.querySelector('#hud-state');
const crosshair = document.querySelector('#crosshair');

const matchReadyModal = document.querySelector('#match-ready-modal');
const enterMultiplayerMatchButton = document.querySelector('#enter-multiplayer-match-button');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070c);
scene.fog = new THREE.Fog(0x05070c, 18, 62);

const camera = new THREE.PerspectiveCamera(
  76,
  window.innerWidth / window.innerHeight,
  0.1,
  180
);
camera.position.set(0, PLAYER.height, 13.5);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;
root.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, document.body);
controls.pointerSpeed = 0.86;
scene.add(camera);

const loader = new GLTFLoader();
const clock = new THREE.Clock();
const keys = new Set();

const velocity = new THREE.Vector3();
const moveVector = new THREE.Vector3();
const forwardVector = new THREE.Vector3();
const rightVector = new THREE.Vector3();

const shotDirection = new THREE.Vector3();
const shotRight = new THREE.Vector3();
const shotUp = new THREE.Vector3();

const enemyShootDirection = new THREE.Vector3();
const enemyShootRight = new THREE.Vector3();
const enemyShootUp = new THREE.Vector3();

const raycaster = new THREE.Raycaster();
raycaster.far = 90;

const visibilityRaycaster = new THREE.Raycaster();
visibilityRaycaster.far = 90;

let verticalVelocity = 0;
let canJump = false;
let hasStarted = false;
let triggerHeld = false;
let rightMouseHeld = false;
let sniperAiming = false;
let lastShotTime = -999;
let reloadTimeout = null;
let gameOver = false;

let multiplayerMatchPrepared = false;
let multiplayerMatchActive = false;
let multiplayerMatchData = null;

const remotePlayers = new Map();

const playerState = {
  hp: PLAYER.maxHp,
  armor: 0,
  currentWeaponId: 'pistol',
  unlockedWeapons: {
    pistol: true,
    mg: false,
    sniper: false,
  },
  ammo: {
    pistol: WEAPONS.pistol.magazineSize,
    mg: WEAPONS.mg.magazineSize,
    sniper: WEAPONS.sniper.magazineSize,
  },
  reloading: false,
};

const stats = {
  score: 0,
  shots: 0,
  hits: 0,
  kills: 0,
};

const colliders = [];
const staticRaycastMeshes = [];
const animatedLights = [];
const pickups = [];
const impactEffects = [];
const enemies = [];

const assets = {
  weapons: {},
  enemy: null,
};

const viewModelAnchor = new THREE.Group();
camera.add(viewModelAnchor);

const combatHud = createCombatHud();
const statusHud = createStatusHud();
const notification = createNotification();
const scopeOverlay = createScopeOverlay();
const damageOverlay = createDamageOverlay();
const gameOverOverlay = createGameOverOverlay();

let notificationTimer = null;
let damageOverlayTimer = null;

createLighting();
createArena();
createProps();
createSpawnMarker();
loadGameAssets();
updateAllHud();

controls.addEventListener('lock', () => {
  if (gameOver) {
    controls.unlock();
    return;
  }

  document.body.classList.add('locked');
  menu.classList.remove('visible');
  pauseMenu.classList.remove('visible');

  combatHud.panel.style.display = 'block';
  statusHud.panel.style.display = 'block';

  hudState.textContent = hasStarted ? 'Arena aktiv' : 'Initialisiere';

  if (multiplayerMatchPrepared) {
    multiplayerMatchActive = true;
    matchReadyModal?.classList.remove('visible');

    window.dispatchEvent(new CustomEvent('shotvara:multiplayer-arena-entered'));
  }

  hasStarted = true;
});

controls.addEventListener('unlock', () => {
  document.body.classList.remove('locked');

  if (hasStarted && !gameOver) {
    pauseMenu.classList.add('visible');
    hudState.textContent = 'Pausiert';
  }

  triggerHeld = false;
  rightMouseHeld = false;
  stopSniperAim();
  keys.clear();
});

startButton.addEventListener('click', () => controls.lock());
resumeButton.addEventListener('click', () => controls.lock());

enterMultiplayerMatchButton?.addEventListener('click', () => {
  controls.lock();
});

window.addEventListener('keydown', (event) => {
  keys.add(event.code);

  if (gameOver) {
    return;
  }

  if (event.code === 'Space' && canJump && controls.isLocked) {
    verticalVelocity = PLAYER.jumpVelocity;
    canJump = false;
  }

  if (event.code === 'KeyR' && controls.isLocked) {
    reloadCurrentWeapon();
  }

  if (event.code === 'Digit1') {
    switchWeapon('pistol');
  }

  if (event.code === 'Digit2') {
    switchWeapon('mg');
  }

  if (event.code === 'Digit3') {
    switchWeapon('sniper');
  }
});

window.addEventListener('keyup', (event) => {
  keys.delete(event.code);
});

window.addEventListener('mousedown', (event) => {
  if (!controls.isLocked || gameOver) {
    return;
  }

  if (event.button === 0) {
    triggerHeld = true;
    attemptShoot(clock.elapsedTime);
  }

  if (event.button === 2) {
    rightMouseHeld = true;

    if (playerState.currentWeaponId === 'sniper') {
      startSniperAim();
    }
  }
});

window.addEventListener('mouseup', (event) => {
  if (event.button === 0) {
    triggerHeld = false;
  }

  if (event.button === 2) {
    rightMouseHeld = false;
    stopSniperAim();
  }
});

window.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

window.addEventListener('resize', onResize);

animate();

async function loadGameAssets() {
  try {
    showNotification('3D-Modelle werden geladen …');

    const [
      pistolAsset,
      mgAsset,
      sniperAsset,
      enemyAsset,
    ] = await Promise.all([
      loadModel(WEAPONS.pistol.modelPath),
      loadModel(WEAPONS.mg.modelPath),
      loadModel(WEAPONS.sniper.modelPath),
      loadModel(ENEMY.modelPath),
    ]);

    assets.weapons.pistol = pistolAsset;
    assets.weapons.mg = mgAsset;
    assets.weapons.sniper = sniperAsset;
    assets.enemy = enemyAsset;

    equipViewModel('pistol');
    spawnPickups();
    spawnEnemies();

    showNotification('Arena bereit.');
  } catch (error) {
    console.error('Fehler beim Laden der GLB-Modelle:', error);
    showNotification('Ein Modell konnte nicht geladen werden.');
  }
}

function loadModel(path) {
  return new Promise((resolve, reject) => {
    loader.load(
      path,
      (gltf) => resolve(gltf),
      undefined,
      (error) => reject(error)
    );
  });
}

function createLighting() {
  const hemisphere = new THREE.HemisphereLight(0x9ac7ff, 0x091018, 1.45);
  scene.add(hemisphere);

  const keyLight = new THREE.DirectionalLight(0xbce8ff, 1.8);
  keyLight.position.set(-7, 16, 9);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 60;
  keyLight.shadow.camera.left = -28;
  keyLight.shadow.camera.right = 28;
  keyLight.shadow.camera.top = 28;
  keyLight.shadow.camera.bottom = -28;
  scene.add(keyLight);

  addAccentLight(-14, 4.2, -10, 0x5ec8ff, 22, 2.4);
  addAccentLight(14, 4.2, 10, 0x946dff, 20, 2.15);
  addAccentLight(0, 4.6, 0, 0x4be4ff, 18, 1.8);
}

function addAccentLight(x, y, z, color, distance, intensity) {
  const light = new THREE.PointLight(color, intensity, distance, 2.2);
  light.position.set(x, y, z);
  scene.add(light);

  animatedLights.push({
    light,
    baseIntensity: intensity,
    offset: Math.random() * Math.PI * 2,
  });

  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 18, 18),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.6,
      roughness: 0.35,
    })
  );

  bulb.position.copy(light.position);
  scene.add(bulb);
}

function createArena() {
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x101722,
    roughness: 0.92,
    metalness: 0.08,
  });

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(
      ARENA.halfSize * 2,
      0.7,
      ARENA.halfSize * 2
    ),
    floorMaterial
  );

  floor.position.set(0, -0.35, 0);
  floor.receiveShadow = true;
  scene.add(floor);
  staticRaycastMeshes.push(floor);

  const grid = new THREE.GridHelper(
    ARENA.halfSize * 2,
    44,
    0x35526a,
    0x1b2838
  );

  grid.position.y = 0.01;
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  scene.add(grid);

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x162131,
    roughness: 0.82,
    metalness: 0.16,
  });

  addWall(
    0,
    ARENA.wallHeight / 2,
    -ARENA.halfSize,
    ARENA.halfSize * 2,
    ARENA.wallHeight,
    1.1,
    wallMaterial
  );

  addWall(
    0,
    ARENA.wallHeight / 2,
    ARENA.halfSize,
    ARENA.halfSize * 2,
    ARENA.wallHeight,
    1.1,
    wallMaterial
  );

  addWall(
    -ARENA.halfSize,
    ARENA.wallHeight / 2,
    0,
    1.1,
    ARENA.wallHeight,
    ARENA.halfSize * 2,
    wallMaterial
  );

  addWall(
    ARENA.halfSize,
    ARENA.wallHeight / 2,
    0,
    1.1,
    ARENA.wallHeight,
    ARENA.halfSize * 2,
    wallMaterial
  );

  const stripeMaterial = new THREE.MeshStandardMaterial({
    color: 0x274357,
    emissive: 0x0a1720,
    emissiveIntensity: 0.8,
  });

  [-1, 1].forEach((direction) => {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(
        ARENA.halfSize * 2 - 1.8,
        0.11,
        0.14
      ),
      stripeMaterial
    );

    stripe.position.set(0, 0.06, direction * 7.5);
    scene.add(stripe);
  });
}

function createProps() {
  const obstacleMaterial = new THREE.MeshStandardMaterial({
    color: 0x253244,
    roughness: 0.72,
    metalness: 0.22,
  });

  const highlightMaterial = new THREE.MeshStandardMaterial({
    color: 0x24394a,
    emissive: 0x0e3244,
    emissiveIntensity: 0.8,
    roughness: 0.68,
    metalness: 0.14,
  });

  addObstacle(-9, 1.5, -5, 4.4, 3, 2.2, obstacleMaterial);
  addObstacle(8, 1.35, 6, 3.2, 2.7, 4.2, obstacleMaterial);
  addObstacle(0, 1.1, -10, 5.5, 2.2, 2.2, highlightMaterial);
  addObstacle(1.5, 1.9, 2.5, 2.5, 3.8, 2.5, obstacleMaterial);
  addObstacle(-4, 0.75, 9.2, 5, 1.5, 1.8, highlightMaterial);

  const columnMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a2737,
    roughness: 0.85,
    metalness: 0.12,
  });

  [
    [-14, -14],
    [14, -14],
    [-14, 14],
    [14, 14],
  ].forEach(([x, z]) => {
    const column = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.72, 4.9, 20),
      columnMaterial
    );

    column.position.set(x, 2.45, z);
    column.castShadow = true;
    column.receiveShadow = true;
    scene.add(column);
    staticRaycastMeshes.push(column);

    registerCircularCollider(x, z, 0.9);
  });
}

function createSpawnMarker() {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.2, 1.55, 48),
    new THREE.MeshBasicMaterial({
      color: 0x5ec8ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    })
  );

  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.025, 13.5);
  scene.add(ring);
}

function addWall(x, y, z, width, height, depth, material) {
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    material
  );

  wall.position.set(x, y, z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);
  staticRaycastMeshes.push(wall);

  registerBoxCollider(x, z, width, depth);
}

function addObstacle(x, y, z, width, height, depth, material) {
  const obstacle = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    material
  );

  obstacle.position.set(x, y, z);
  obstacle.castShadow = true;
  obstacle.receiveShadow = true;
  scene.add(obstacle);
  staticRaycastMeshes.push(obstacle);

  registerBoxCollider(x, z, width, depth);
}

function registerBoxCollider(x, z, width, depth) {
  colliders.push({
    type: 'box',
    minX: x - width / 2,
    maxX: x + width / 2,
    minZ: z - depth / 2,
    maxZ: z + depth / 2,
  });
}

function registerCircularCollider(x, z, radius) {
  colliders.push({
    type: 'circle',
    x,
    z,
    radius,
  });
}

function createCombatHud() {
  const hud = document.createElement('div');

  hud.style.display = 'none';
  hud.style.position = 'fixed';
  hud.style.top = '24px';
  hud.style.right = '24px';
  hud.style.zIndex = '20';
  hud.style.minWidth = '180px';
  hud.style.padding = '14px 16px';
  hud.style.border = '1px solid rgba(120, 185, 255, 0.24)';
  hud.style.borderRadius = '16px';
  hud.style.background = 'rgba(6, 11, 20, 0.72)';
  hud.style.backdropFilter = 'blur(14px)';
  hud.style.color = '#eaf4ff';
  hud.style.fontFamily = 'inherit';
  hud.style.fontSize = '14px';
  hud.style.lineHeight = '1.55';
  hud.style.boxShadow = '0 18px 45px rgba(0, 0, 0, 0.22)';

  hud.innerHTML = `
    <div style="font-size:12px; letter-spacing:0.12em; text-transform:uppercase; opacity:0.7; margin-bottom:6px;">
      Kampfstatus
    </div>
    <div>Punkte: <strong id="combat-score">0</strong></div>
    <div>Schüsse: <strong id="combat-shots">0</strong></div>
    <div>Treffer: <strong id="combat-hits">0</strong></div>
    <div>Kills: <strong id="combat-kills">0</strong></div>
    <div>Quote: <strong id="combat-accuracy">0%</strong></div>
  `;

  document.body.appendChild(hud);

  return {
    panel: hud,
    score: hud.querySelector('#combat-score'),
    shots: hud.querySelector('#combat-shots'),
    hits: hud.querySelector('#combat-hits'),
    kills: hud.querySelector('#combat-kills'),
    accuracy: hud.querySelector('#combat-accuracy'),
  };
}

function createStatusHud() {
  const hud = document.createElement('div');

  hud.style.display = 'none';
  hud.style.position = 'fixed';
  hud.style.left = '24px';
  hud.style.bottom = '24px';
  hud.style.zIndex = '20';
  hud.style.minWidth = '310px';
  hud.style.padding = '16px 18px';
  hud.style.border = '1px solid rgba(120, 185, 255, 0.24)';
  hud.style.borderRadius = '18px';
  hud.style.background = 'rgba(6, 11, 20, 0.78)';
  hud.style.backdropFilter = 'blur(14px)';
  hud.style.color = '#eaf4ff';
  hud.style.fontFamily = 'inherit';
  hud.style.fontSize = '14px';
  hud.style.lineHeight = '1.5';
  hud.style.boxShadow = '0 18px 45px rgba(0, 0, 0, 0.22)';

  hud.innerHTML = `
    <div style="font-size:12px; letter-spacing:0.12em; text-transform:uppercase; opacity:0.7; margin-bottom:8px;">
      Ausrüstung
    </div>
    <div style="display:flex; justify-content:space-between; gap:18px;">
      <span>HP</span>
      <strong id="status-hp">100 / 100</strong>
    </div>
    <div style="display:flex; justify-content:space-between; gap:18px;">
      <span>Schutz</span>
      <strong id="status-armor">0 / 100</strong>
    </div>
    <div style="height:10px;"></div>
    <div style="display:flex; justify-content:space-between; gap:18px;">
      <span>Waffe</span>
      <strong id="status-weapon">Pistole</strong>
    </div>
    <div style="display:flex; justify-content:space-between; gap:18px;">
      <span>Magazin</span>
      <strong id="status-ammo">12 / 12</strong>
    </div>
    <div style="display:flex; justify-content:space-between; gap:18px;">
      <span>Status</span>
      <strong id="status-reload">Bereit</strong>
    </div>
    <div style="height:10px;"></div>
    <div id="status-inventory" style="font-size:13px; opacity:0.9;">
      1 Pistole · 2 — · 3 —
    </div>
  `;

  document.body.appendChild(hud);

  return {
    panel: hud,
    hp: hud.querySelector('#status-hp'),
    armor: hud.querySelector('#status-armor'),
    weapon: hud.querySelector('#status-weapon'),
    ammo: hud.querySelector('#status-ammo'),
    reload: hud.querySelector('#status-reload'),
    inventory: hud.querySelector('#status-inventory'),
  };
}

function createNotification() {
  const note = document.createElement('div');

  note.style.position = 'fixed';
  note.style.left = '50%';
  note.style.bottom = '130px';
  note.style.transform = 'translateX(-50%)';
  note.style.zIndex = '30';
  note.style.padding = '12px 18px';
  note.style.borderRadius = '999px';
  note.style.background = 'rgba(8, 14, 24, 0.9)';
  note.style.border = '1px solid rgba(130, 200, 255, 0.28)';
  note.style.color = '#eef7ff';
  note.style.fontFamily = 'inherit';
  note.style.fontSize = '14px';
  note.style.opacity = '0';
  note.style.transition = 'opacity 180ms ease, transform 180ms ease';
  note.style.pointerEvents = 'none';

  document.body.appendChild(note);

  return note;
}

function createScopeOverlay() {
  const overlay = document.createElement('div');

  overlay.style.display = 'none';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.zIndex = '25';
  overlay.style.pointerEvents = 'none';
  overlay.style.background = `
    radial-gradient(
      circle at center,
      rgba(0,0,0,0) 0%,
      rgba(0,0,0,0) 24%,
      rgba(0,0,0,0.82) 25%,
      rgba(0,0,0,0.95) 100%
    )
  `;

  overlay.innerHTML = `
    <div style="
      position:absolute;
      left:50%;
      top:50%;
      width:46vh;
      height:46vh;
      max-width:620px;
      max-height:620px;
      min-width:320px;
      min-height:320px;
      transform:translate(-50%, -50%);
      border:2px solid rgba(255,255,255,0.65);
      border-radius:50%;
      box-shadow:0 0 0 9999px rgba(0,0,0,0.22);
    ">
      <div style="position:absolute; left:50%; top:0; bottom:0; width:1px; background:rgba(255,255,255,0.55);"></div>
      <div style="position:absolute; top:50%; left:0; right:0; height:1px; background:rgba(255,255,255,0.55);"></div>
    </div>
  `;

  document.body.appendChild(overlay);
  return overlay;
}

function createDamageOverlay() {
  const overlay = document.createElement('div');

  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.zIndex = '28';
  overlay.style.pointerEvents = 'none';
  overlay.style.opacity = '0';
  overlay.style.transition = 'opacity 140ms ease';
  overlay.style.background = `
    radial-gradient(
      circle at center,
      rgba(255, 0, 0, 0) 25%,
      rgba(255, 0, 0, 0.12) 60%,
      rgba(255, 0, 0, 0.58) 100%
    )
  `;

  document.body.appendChild(overlay);
  return overlay;
}

function createGameOverOverlay() {
  const overlay = document.createElement('div');

  overlay.style.display = 'none';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.zIndex = '60';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.background = 'rgba(2, 5, 12, 0.86)';
  overlay.style.backdropFilter = 'blur(16px)';

  overlay.innerHTML = `
    <div style="
      width:min(520px, calc(100vw - 40px));
      padding:34px;
      border-radius:28px;
      border:1px solid rgba(150, 195, 255, 0.24);
      background:rgba(8, 14, 24, 0.94);
      color:#eef7ff;
      box-shadow:0 30px 100px rgba(0,0,0,0.5);
      text-align:center;
      font-family:inherit;
    ">
      <div style="
        font-size:13px;
        letter-spacing:0.22em;
        text-transform:uppercase;
        opacity:0.72;
        margin-bottom:12px;
      ">
        SHOTVARA
      </div>
      <h2 style="
        margin:0 0 14px;
        font-size:42px;
        line-height:1;
      ">
        Eliminiert
      </h2>
      <p style="
        margin:0 0 24px;
        color:rgba(238,247,255,0.78);
        font-size:16px;
      ">
        Deine HP sind auf 0 gefallen.
      </p>
      <button id="restart-game-button" style="
        border:0;
        border-radius:999px;
        padding:15px 28px;
        cursor:pointer;
        font-size:15px;
        font-weight:700;
        color:#06111f;
        background:#8fdfff;
      ">
        Neu starten
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#restart-game-button').addEventListener('click', () => {
    window.location.reload();
  });

  return overlay;
}

function showNotification(text) {
  notification.textContent = text;
  notification.style.opacity = '1';
  notification.style.transform = 'translateX(-50%) translateY(-4px)';

  window.clearTimeout(notificationTimer);

  notificationTimer = window.setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(-50%) translateY(0)';
  }, 1600);
}

function showDamageFlash() {
  damageOverlay.style.opacity = '1';

  window.clearTimeout(damageOverlayTimer);

  damageOverlayTimer = window.setTimeout(() => {
    damageOverlay.style.opacity = '0';
  }, 180);
}

function updateAllHud() {
  updateCombatHud();
  updateStatusHud();
}

function updateCombatHud() {
  const accuracy = stats.shots === 0
    ? 0
    : Math.round((stats.hits / stats.shots) * 100);

  combatHud.score.textContent = stats.score;
  combatHud.shots.textContent = stats.shots;
  combatHud.hits.textContent = stats.hits;
  combatHud.kills.textContent = stats.kills;
  combatHud.accuracy.textContent = `${accuracy}%`;
}

function updateStatusHud() {
  const weapon = WEAPONS[playerState.currentWeaponId];
  const currentAmmo = playerState.ammo[playerState.currentWeaponId];

  statusHud.hp.textContent = `${playerState.hp} / ${PLAYER.maxHp}`;
  statusHud.armor.textContent = `${playerState.armor} / ${PLAYER.maxArmor}`;
  statusHud.weapon.textContent = weapon.name;
  statusHud.ammo.textContent = `${currentAmmo} / ${weapon.magazineSize}`;
  statusHud.reload.textContent = playerState.reloading ? 'Lädt nach …' : 'Bereit';

  statusHud.inventory.textContent = [
    '1 Pistole',
    playerState.unlockedWeapons.mg ? '2 Maschinengewehr' : '2 —',
    playerState.unlockedWeapons.sniper ? '3 Sniper' : '3 —',
  ].join(' · ');
}

function spawnPickups() {
  createWeaponPickup('mg', PICKUP_POSITIONS.mg);
  createWeaponPickup('sniper', PICKUP_POSITIONS.sniper);
  createArmorPickup(PICKUP_POSITIONS.armor);
}

function createWeaponPickup(weaponId, position) {
  const asset = assets.weapons[weaponId];

  if (!asset) {
    return;
  }

  const weapon = WEAPONS[weaponId];
  const [x, y, z] = position;

  const group = new THREE.Group();
  const model = asset.scene.clone(true);

  preparePickupWeaponModel(model, weaponId);
  group.add(model);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.045, 14, 48),
    new THREE.MeshBasicMaterial({
      color: weapon.color,
      transparent: true,
      opacity: 0.78,
    })
  );

  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  group.position.set(x, y, z);
  scene.add(group);

  pickups.push({
    type: 'weapon',
    weaponId,
    object: group,
    baseY: y,
    radius: 1.45,
    collected: false,
    offset: Math.random() * Math.PI * 2,
  });
}

function createArmorPickup(position) {
  const [x, y, z] = position;

  const group = new THREE.Group();

  const plate = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.62, 0),
    new THREE.MeshStandardMaterial({
      color: 0x59a9ff,
      emissive: 0x1a4b88,
      emissiveIntensity: 1.1,
      roughness: 0.28,
      metalness: 0.24,
    })
  );

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.0, 0.045, 14, 48),
    new THREE.MeshBasicMaterial({
      color: 0x8acbff,
      transparent: true,
      opacity: 0.8,
    })
  );

  ring.rotation.x = Math.PI / 2;

  group.add(plate);
  group.add(ring);
  group.position.set(x, y, z);

  scene.add(group);

  pickups.push({
    type: 'armor',
    object: group,
    baseY: y,
    radius: 1.35,
    collected: false,
    respawnAt: 0,
    offset: Math.random() * Math.PI * 2,
  });
}

function preparePickupWeaponModel(model, weaponId) {
  centerObject(model);

  const desiredLength =
    weaponId === 'sniper'
      ? 2.15
      : weaponId === 'mg'
        ? 1.7
        : 0.85;

  scaleObjectToLargestDimension(model, desiredLength);

  model.rotation.set(0, Math.PI / 2, 0);
  model.position.y += 0.15;

  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

function equipViewModel(weaponId) {
  viewModelAnchor.clear();

  const asset = assets.weapons[weaponId];

  if (!asset) {
    return;
  }

  const weaponModel = asset.scene.clone(true);
  centerObject(weaponModel);

  const viewSettings = {
    pistol: {
      size: 0.95,
      position: [0.42, -0.39, -0.72],
      rotation: [-0.05, Math.PI / 2, 0.02],
    },
    mg: {
      size: 1.65,
      position: [0.56, -0.48, -0.92],
      rotation: [-0.06, Math.PI / 2, 0.02],
    },
    sniper: {
      size: 1.95,
      position: [0.62, -0.52, -1.02],
      rotation: [-0.05, Math.PI / 2, 0.02],
    },
  };

  const settings = viewSettings[weaponId];

  scaleObjectToLargestDimension(weaponModel, settings.size);
  weaponModel.position.set(...settings.position);
  weaponModel.rotation.set(...settings.rotation);

  weaponModel.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = false;
      child.receiveShadow = false;
    }
  });

  viewModelAnchor.add(weaponModel);
}

function switchWeapon(weaponId) {
  if (!playerState.unlockedWeapons[weaponId]) {
    if (weaponId !== 'pistol') {
      showNotification('Diese Waffe wurde noch nicht eingesammelt.');
    }
    return;
  }

  if (playerState.currentWeaponId === weaponId) {
    return;
  }

  cancelReload();
  stopSniperAim();

  playerState.currentWeaponId = weaponId;
  equipViewModel(weaponId);
  updateStatusHud();
  showNotification(`${WEAPONS[weaponId].name} ausgerüstet.`);
}

function cancelReload() {
  if (reloadTimeout) {
    window.clearTimeout(reloadTimeout);
    reloadTimeout = null;
  }

  playerState.reloading = false;
}

function reloadCurrentWeapon() {
  if (playerState.reloading) {
    return;
  }

  const weapon = WEAPONS[playerState.currentWeaponId];
  const currentAmmo = playerState.ammo[playerState.currentWeaponId];

  if (currentAmmo >= weapon.magazineSize) {
    showNotification('Magazin ist bereits voll.');
    return;
  }

  playerState.reloading = true;
  updateStatusHud();
  showNotification(`${weapon.name} lädt nach …`);

  reloadTimeout = window.setTimeout(() => {
    playerState.ammo[playerState.currentWeaponId] = weapon.magazineSize;
    playerState.reloading = false;
    reloadTimeout = null;
    updateStatusHud();
    showNotification(`${weapon.name} nachgeladen.`);
  }, weapon.reloadTime * 1000);
}

function attemptShoot(time) {
  const weapon = WEAPONS[playerState.currentWeaponId];

  if (playerState.reloading) {
    return;
  }

  if (time - lastShotTime < weapon.fireDelay) {
    return;
  }

  if (playerState.ammo[playerState.currentWeaponId] <= 0) {
    showNotification('Magazin leer – R zum Nachladen.');
    return;
  }

  lastShotTime = time;
  playerState.ammo[playerState.currentWeaponId] -= 1;

  stats.shots += 1;
  updateAllHud();

  shootWithWeapon(weapon);
}

function shootWithWeapon(weapon) {
  camera.getWorldDirection(shotDirection);

  shotRight.set(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
  shotUp.set(0, 1, 0).applyQuaternion(camera.quaternion).normalize();

  const spreadFactor =
    weapon.id === 'sniper' && sniperAiming
      ? weapon.spread * 0.2
      : weapon.spread;

  const spreadX = (Math.random() - 0.5) * spreadFactor;
  const spreadY = (Math.random() - 0.5) * spreadFactor;

  shotDirection
    .addScaledVector(shotRight, spreadX)
    .addScaledVector(shotUp, spreadY)
    .normalize();

  raycaster.set(camera.position, shotDirection);

  const enemyRoots = enemies
    .filter((enemy) => enemy.alive)
    .map((enemy) => enemy.root);

  const intersections = raycaster.intersectObjects(
    [...staticRaycastMeshes, ...enemyRoots],
    true
  );

  const firstHit = intersections[0];

  const endPoint = firstHit
    ? firstHit.point.clone()
    : camera.position.clone().addScaledVector(shotDirection, 80);

  const enemy = firstHit ? findEnemyFromObject(firstHit.object) : null;

  createImpactEffect(endPoint, Boolean(enemy));
  pulseCrosshair();

  if (enemy) {
    registerEnemyHit(enemy, endPoint, weapon);
  }
}

function findEnemyFromObject(object) {
  let current = object;

  while (current) {
    if (current.userData?.enemyEntity) {
      return current.userData.enemyEntity;
    }

    current = current.parent;
  }

  return null;
}

function spawnEnemies() {
  for (let i = 0; i < ENEMY.count; i++) {
    spawnEnemy(i);
  }
}

function spawnEnemy(routeIndex = 0) {
  if (!assets.enemy) {
    return;
  }

  const route = ENEMY_ROUTES[routeIndex % ENEMY_ROUTES.length];
  const start = route[0];

  const rootGroup = new THREE.Group();
  rootGroup.position.set(start[0], 0, start[1]);

  const enemyModel = SkeletonUtils.clone(assets.enemy.scene);
  prepareEnemyModel(enemyModel);
  rootGroup.add(enemyModel);

  const enemy = {
    root: rootGroup,
    model: enemyModel,
    hp: ENEMY.maxHp,
    maxHp: ENEMY.maxHp,
    alive: true,
    route,
    routeIndex: 1,
    state: 'patrol',
    speed: ENEMY.patrolSpeed + Math.random() * 0.2,
    mixer: null,
    walkAction: null,
    deathAction: null,
    nextShotAt: clock.elapsedTime + randomEnemyShotDelay(),
  };

  enemyModel.traverse((child) => {
    if (child.isMesh) {
      child.userData.enemyEntity = enemy;
    }
  });

  rootGroup.userData.enemyEntity = enemy;

  scene.add(rootGroup);
  enemies.push(enemy);

  setupEnemyAnimations(enemy);
}

function prepareEnemyModel(model) {
  model.scale.setScalar(ENEMY.scale);
  model.position.set(0, 0, 0);
  model.rotation.set(0, 0, 0);

  model.traverse((child) => {
    if (child.isMesh) {
      child.visible = true;
      child.castShadow = true;
      child.receiveShadow = true;
      child.frustumCulled = false;

      if (child.material) {
        child.material.transparent = false;
        child.material.opacity = 1;
        child.material.needsUpdate = true;
      }
    }
  });
}

function setupEnemyAnimations(enemy) {
  const animations = assets.enemy?.animations ?? [];

  if (!animations.length) {
    return;
  }

  enemy.mixer = new THREE.AnimationMixer(enemy.model);

  const walkClip =
    animations.find((clip) => /walk|run/i.test(clip.name)) ??
    animations[0];

  const deathClip =
    animations.find((clip) => /death|die|dead/i.test(clip.name)) ??
    null;

  if (walkClip) {
    enemy.walkAction = enemy.mixer.clipAction(walkClip);
    enemy.walkAction.play();
  }

  if (deathClip) {
    enemy.deathAction = enemy.mixer.clipAction(deathClip);
    enemy.deathAction.setLoop(THREE.LoopOnce, 1);
    enemy.deathAction.clampWhenFinished = true;
  }
}

function registerEnemyHit(enemy, hitPoint, weapon) {
  if (!enemy.alive) {
    return;
  }

  stats.hits += 1;
  stats.score += weapon.damage;
  updateCombatHud();

  enemy.hp -= weapon.damage;

  createBloodBurst(hitPoint);

  if (enemy.hp <= 0) {
    killEnemy(enemy);
  }
}

function killEnemy(enemy) {
  enemy.alive = false;
  enemy.state = 'dead';

  stats.kills += 1;
  stats.score += 100;
  updateCombatHud();

  if (enemy.walkAction) {
    enemy.walkAction.stop();
  }

  if (enemy.deathAction) {
    enemy.deathAction.reset().play();
  } else {
    enemy.root.rotation.z = -Math.PI / 2;
  }

  window.setTimeout(() => {
    scene.remove(enemy.root);

    const index = enemies.indexOf(enemy);
    if (index !== -1) {
      enemies.splice(index, 1);
    }

    if (!multiplayerMatchActive) {
      spawnEnemy(Math.floor(Math.random() * ENEMY_ROUTES.length));
    }
  }, ENEMY.respawnDelay);
}

function updateEnemies(delta, time) {
  if (!hasStarted || !controls.isLocked || gameOver || multiplayerMatchActive) {
    return;
  }

  enemies.forEach((enemy) => {
    if (enemy.mixer) {
      enemy.mixer.update(delta);
    }

    if (!enemy.alive) {
      return;
    }

    const enemyPosition = enemy.root.position;
    const dx = camera.position.x - enemyPosition.x;
    const dz = camera.position.z - enemyPosition.z;
    const distanceToPlayer = Math.hypot(dx, dz);

    const canSeePlayer =
      distanceToPlayer <= ENEMY.detectionRange &&
      hasLineOfSightToPlayer(enemy);

    if (canSeePlayer) {
      enemy.state = 'combat';
      updateCombatEnemy(enemy, delta, time, dx, dz, distanceToPlayer);
    } else {
      enemy.state = 'patrol';
      updatePatrolEnemy(enemy, delta);
    }
  });
}

function updatePatrolEnemy(enemy, delta) {
  const target = enemy.route[enemy.routeIndex];

  const dx = target[0] - enemy.root.position.x;
  const dz = target[1] - enemy.root.position.z;
  const distance = Math.hypot(dx, dz);

  if (distance < 0.35) {
    enemy.routeIndex = (enemy.routeIndex + 1) % enemy.route.length;
    return;
  }

  const nx = dx / distance;
  const nz = dz / distance;

  moveEnemy(enemy, nx, nz, enemy.speed, delta);
  enemy.root.rotation.y = Math.atan2(nx, nz);
}

function updateCombatEnemy(enemy, delta, time, dx, dz, distanceToPlayer) {
  const nx = dx / distanceToPlayer;
  const nz = dz / distanceToPlayer;

  enemy.root.rotation.y = Math.atan2(nx, nz);

  if (distanceToPlayer > ENEMY.preferredRange) {
    moveEnemy(enemy, nx, nz, ENEMY.chaseSpeed, delta);
  }

  if (
    distanceToPlayer <= ENEMY.attackRange &&
    time >= enemy.nextShotAt &&
    hasLineOfSightToPlayer(enemy)
  ) {
    enemyShoot(enemy);
    enemy.nextShotAt = time + randomEnemyShotDelay();
  }
}

function moveEnemy(enemy, nx, nz, speed, delta) {
  const nextX = enemy.root.position.x + nx * speed * delta;
  const nextZ = enemy.root.position.z + nz * speed * delta;

  if (!enemyCollidesAt(nextX, enemy.root.position.z)) {
    enemy.root.position.x = nextX;
  }

  if (!enemyCollidesAt(enemy.root.position.x, nextZ)) {
    enemy.root.position.z = nextZ;
  }
}

function enemyCollidesAt(x, z) {
  for (const collider of colliders) {
    if (collider.type === 'box') {
      const nearestX = THREE.MathUtils.clamp(
        x,
        collider.minX,
        collider.maxX
      );

      const nearestZ = THREE.MathUtils.clamp(
        z,
        collider.minZ,
        collider.maxZ
      );

      const dx = x - nearestX;
      const dz = z - nearestZ;

      if (
        dx * dx + dz * dz <
        ENEMY.collisionRadius * ENEMY.collisionRadius
      ) {
        return true;
      }
    }

    if (collider.type === 'circle') {
      const dx = x - collider.x;
      const dz = z - collider.z;
      const minDistance = ENEMY.collisionRadius + collider.radius;

      if (dx * dx + dz * dz < minDistance * minDistance) {
        return true;
      }
    }
  }

  return false;
}

function hasLineOfSightToPlayer(enemy) {
  const origin = enemy.root.position.clone();
  origin.y = 1.2;

  const target = camera.position.clone();
  const direction = target.clone().sub(origin);
  const distance = direction.length();

  direction.normalize();

  visibilityRaycaster.set(origin, direction);
  visibilityRaycaster.far = distance - 0.25;

  const intersections = visibilityRaycaster.intersectObjects(
    staticRaycastMeshes,
    true
  );

  return intersections.length === 0;
}

function enemyShoot(enemy) {
  if (gameOver) {
    return;
  }

  const origin = enemy.root.position.clone();
  origin.y = 1.25;

  const playerCenter = camera.position.clone();

  enemyShootDirection.copy(playerCenter).sub(origin).normalize();

  enemyShootRight.set(1, 0, 0);
  enemyShootUp.set(0, 1, 0);

  const spreadX = (Math.random() - 0.5) * ENEMY.shotSpread;
  const spreadY = (Math.random() - 0.5) * ENEMY.shotSpread;

  enemyShootDirection
    .addScaledVector(enemyShootRight, spreadX)
    .addScaledVector(enemyShootUp, spreadY)
    .normalize();

  const toPlayer = playerCenter.clone().sub(origin);
  const projectionLength = toPlayer.dot(enemyShootDirection);

  if (projectionLength <= 0) {
    return;
  }

  const closestPoint = origin
    .clone()
    .addScaledVector(enemyShootDirection, projectionLength);

  const missDistance = closestPoint.distanceTo(playerCenter);

  if (missDistance <= PLAYER.hitRadius) {
    applyPlayerDamage(ENEMY.shotDamage);
    createPlayerHitImpact();
  }
}

function applyPlayerDamage(damage) {
  let remainingDamage = damage;

  if (playerState.armor > 0) {
    const absorbed = Math.min(playerState.armor, remainingDamage);
    playerState.armor -= absorbed;
    remainingDamage -= absorbed;
  }

  if (remainingDamage > 0) {
    playerState.hp = Math.max(0, playerState.hp - remainingDamage);
  }

  showDamageFlash();
  updateStatusHud();

  if (playerState.hp <= 0) {
    triggerGameOver();
  }
}

function createPlayerHitImpact() {
  const material = new THREE.MeshBasicMaterial({
    color: 0xff4a63,
    transparent: true,
    opacity: 0.8,
  });

  const effect = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 12, 12),
    material
  );

  effect.position.copy(camera.position);
  effect.position.add(
    new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.3
    )
  );

  scene.add(effect);

  impactEffects.push({
    mesh: effect,
    life: 0.14,
    maxLife: 0.14,
    growth: 2.6,
  });
}

function triggerGameOver() {
  gameOver = true;
  triggerHeld = false;
  rightMouseHeld = false;
  stopSniperAim();

  controls.unlock();

  pauseMenu.classList.remove('visible');
  gameOverOverlay.style.display = 'flex';
  hudState.textContent = 'Eliminiert';
}

function randomEnemyShotDelay() {
  return THREE.MathUtils.lerp(
    ENEMY.minShotDelay,
    ENEMY.maxShotDelay,
    Math.random()
  );
}

function updatePickups(time) {
  pickups.forEach((pickup) => {
    if (pickup.collected) {
      if (
        pickup.type === 'armor' &&
        pickup.respawnAt > 0 &&
        time >= pickup.respawnAt
      ) {
        pickup.collected = false;
        pickup.object.visible = true;
        pickup.respawnAt = 0;
      }

      return;
    }

    pickup.object.position.y =
      pickup.baseY + Math.sin(time * 2 + pickup.offset) * 0.14;

    pickup.object.rotation.y += 0.018;

    const dx = camera.position.x - pickup.object.position.x;
    const dz = camera.position.z - pickup.object.position.z;
    const distance = Math.hypot(dx, dz);

    if (distance <= pickup.radius) {
      collectPickup(pickup, time);
    }
  });
}

function collectPickup(pickup, time) {
  if (pickup.type === 'weapon') {
    if (!playerState.unlockedWeapons[pickup.weaponId]) {
      playerState.unlockedWeapons[pickup.weaponId] = true;
      playerState.ammo[pickup.weaponId] =
        WEAPONS[pickup.weaponId].magazineSize;
      playerState.currentWeaponId = pickup.weaponId;

      pickup.collected = true;
      pickup.object.visible = false;

      cancelReload();
      stopSniperAim();
      equipViewModel(pickup.weaponId);
      updateStatusHud();
      showNotification(`${WEAPONS[pickup.weaponId].name} eingesammelt.`);
    }

    return;
  }

  if (pickup.type === 'armor') {
    if (playerState.armor >= PLAYER.maxArmor) {
      return;
    }

    playerState.armor = PLAYER.maxArmor;
    pickup.collected = true;
    pickup.object.visible = false;
    pickup.respawnAt = time + 20;

    updateStatusHud();
    showNotification('Rüstung aufgenommen: 100 Schutz.');
  }
}

function startSniperAim() {
  if (playerState.currentWeaponId !== 'sniper') {
    return;
  }

  sniperAiming = true;
  scopeOverlay.style.display = 'block';
  crosshair.style.opacity = '0';
}

function stopSniperAim() {
  sniperAiming = false;
  scopeOverlay.style.display = 'none';
  crosshair.style.opacity = '1';
}

function createImpactEffect(position, enemyHit) {
  const material = new THREE.MeshBasicMaterial({
    color: enemyHit ? 0xff647c : 0x8de8ff,
    transparent: true,
    opacity: 0.95,
  });

  const impact = new THREE.Mesh(
    new THREE.SphereGeometry(enemyHit ? 0.18 : 0.11, 14, 14),
    material
  );

  impact.position.copy(position);
  scene.add(impact);

  impactEffects.push({
    mesh: impact,
    life: 0.18,
    maxLife: 0.18,
    growth: enemyHit ? 3.2 : 2.1,
  });
}

function createBloodBurst(position) {
  for (let i = 0; i < 6; i++) {
    const material = new THREE.MeshBasicMaterial({
      color: 0xff556c,
      transparent: true,
      opacity: 0.92,
    });

    const particle = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 10, 10),
      material
    );

    particle.position.copy(position);
    scene.add(particle);

    const direction = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.2,
      Math.random() - 0.5
    ).normalize();

    impactEffects.push({
      mesh: particle,
      life: 0.32,
      maxLife: 0.32,
      growth: 0.3,
      velocity: direction.multiplyScalar(4 + Math.random() * 2.5),
    });
  }
}

function pulseCrosshair() {
  if (!crosshair) {
    return;
  }

  crosshair.style.transform = 'translate(-50%, -50%) scale(1.18)';

  window.setTimeout(() => {
    crosshair.style.transform = 'translate(-50%, -50%) scale(1)';
  }, 70);
}

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;

  animateLights(time);
  updatePlayer(delta);
  updatePickups(time);
  updateAutomaticFire(time);
  updateImpactEffects(delta);
  updateEnemies(delta, time);
  updateCameraZoom(delta);

  renderer.render(scene, camera);
}

function animateLights(time) {
  animatedLights.forEach(({ light, baseIntensity, offset }) => {
    light.intensity =
      baseIntensity + Math.sin(time * 1.7 + offset) * 0.18;
  });
}

function updateAutomaticFire(time) {
  const weapon = WEAPONS[playerState.currentWeaponId];

  if (
    controls.isLocked &&
    triggerHeld &&
    weapon.automatic &&
    !gameOver
  ) {
    attemptShoot(time);
  }
}

function updateImpactEffects(delta) {
  for (let i = impactEffects.length - 1; i >= 0; i--) {
    const effect = impactEffects[i];

    effect.life -= delta;

    if (effect.velocity) {
      effect.mesh.position.addScaledVector(effect.velocity, delta);
    }

    const lifeRatio = Math.max(effect.life / effect.maxLife, 0);
    effect.mesh.material.opacity = lifeRatio;

    const scale = 1 + (1 - lifeRatio) * effect.growth;
    effect.mesh.scale.setScalar(scale);

    if (effect.life <= 0) {
      scene.remove(effect.mesh);
      effect.mesh.geometry.dispose();
      effect.mesh.material.dispose();
      impactEffects.splice(i, 1);
    }
  }
}

function updateCameraZoom(delta) {
  const targetFov = sniperAiming ? 28 : 76;
  camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 12, delta);
  camera.updateProjectionMatrix();

  const targetViewX = sniperAiming ? 0.04 : 0;
  const targetViewY = sniperAiming ? -0.04 : 0;

  viewModelAnchor.position.x = THREE.MathUtils.damp(
    viewModelAnchor.position.x,
    targetViewX,
    9,
    delta
  );

  viewModelAnchor.position.y = THREE.MathUtils.damp(
    viewModelAnchor.position.y,
    targetViewY,
    9,
    delta
  );
}

function updatePlayer(delta) {
  if (!controls.isLocked || gameOver) {
    hudSpeed.textContent = '0.0 m/s';
    return;
  }

  controls.getDirection(forwardVector);
  forwardVector.y = 0;
  forwardVector.normalize();

  rightVector.crossVectors(forwardVector, camera.up).normalize();

  moveVector.set(0, 0, 0);

  if (keys.has('KeyW')) moveVector.add(forwardVector);
  if (keys.has('KeyS')) moveVector.sub(forwardVector);
  if (keys.has('KeyD')) moveVector.add(rightVector);
  if (keys.has('KeyA')) moveVector.sub(rightVector);

  if (moveVector.lengthSq() > 0) {
    moveVector.normalize().multiplyScalar(PLAYER.walkSpeed);

    velocity.x = THREE.MathUtils.damp(
      velocity.x,
      moveVector.x,
      PLAYER.acceleration,
      delta
    );

    velocity.z = THREE.MathUtils.damp(
      velocity.z,
      moveVector.z,
      PLAYER.acceleration,
      delta
    );
  } else {
    velocity.x = THREE.MathUtils.damp(
      velocity.x,
      0,
      PLAYER.damping,
      delta
    );

    velocity.z = THREE.MathUtils.damp(
      velocity.z,
      0,
      PLAYER.damping,
      delta
    );
  }

  verticalVelocity -= PLAYER.gravity * delta;

  const proposedX = camera.position.x + velocity.x * delta;
  const proposedZ = camera.position.z + velocity.z * delta;

  if (!collidesAt(proposedX, camera.position.z)) {
    camera.position.x = proposedX;
  } else {
    velocity.x = 0;
  }

  if (!collidesAt(camera.position.x, proposedZ)) {
    camera.position.z = proposedZ;
  } else {
    velocity.z = 0;
  }

  camera.position.y += verticalVelocity * delta;

  if (camera.position.y <= PLAYER.height) {
    camera.position.y = PLAYER.height;
    verticalVelocity = 0;
    canJump = true;
  }

  const horizontalSpeed = Math.hypot(velocity.x, velocity.z);
  hudSpeed.textContent = `${horizontalSpeed.toFixed(1)} m/s`;
}

function collidesAt(x, z) {
  for (const collider of colliders) {
    if (collider.type === 'box') {
      const nearestX = THREE.MathUtils.clamp(
        x,
        collider.minX,
        collider.maxX
      );

      const nearestZ = THREE.MathUtils.clamp(
        z,
        collider.minZ,
        collider.maxZ
      );

      const dx = x - nearestX;
      const dz = z - nearestZ;

      if (dx * dx + dz * dz < PLAYER.radius * PLAYER.radius) {
        return true;
      }
    }

    if (collider.type === 'circle') {
      const dx = x - collider.x;
      const dz = z - collider.z;
      const minDistance = PLAYER.radius + collider.radius;

      if (dx * dx + dz * dz < minDistance * minDistance) {
        return true;
      }
    }
  }

  return false;
}

function centerObject(object) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  object.position.sub(center);
}

function scaleObjectToLargestDimension(object, targetSize) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const largest = Math.max(size.x, size.y, size.z);

  if (largest <= 0) {
    return;
  }

  const scale = targetSize / largest;
  object.scale.multiplyScalar(scale);
}

/* -------------------------------------------------------------------------- */
/*                              MULTIPLAYER HOOKS                             */
/* -------------------------------------------------------------------------- */

window.addEventListener('shotvara:multiplayer-match-prepared', (event) => {
  multiplayerMatchPrepared = true;
  multiplayerMatchData = event.detail;

  clearEnemiesForMultiplayer();
});

window.addEventListener('shotvara:multiplayer-enter-match', (event) => {
  multiplayerMatchPrepared = true;
  multiplayerMatchData = event.detail;

  const ownPlayer = multiplayerMatchData?.players?.find((player) => {
    return player.userId === getOwnMultiplayerUserId();
  });

  if (ownPlayer?.spawn) {
    camera.position.set(
      ownPlayer.spawn.x,
      ownPlayer.spawn.y,
      ownPlayer.spawn.z
    );

    camera.rotation.set(0, ownPlayer.spawn.yaw, 0);
  }

  playerState.hp = PLAYER.maxHp;
  playerState.armor = 0;

  playerState.currentWeaponId = 'pistol';
  playerState.unlockedWeapons.pistol = true;
  playerState.unlockedWeapons.mg = false;
  playerState.unlockedWeapons.sniper = false;
  playerState.ammo.pistol = WEAPONS.pistol.magazineSize;
  playerState.ammo.mg = WEAPONS.mg.magazineSize;
  playerState.ammo.sniper = WEAPONS.sniper.magazineSize;

  equipViewModel('pistol');
  updateStatusHud();

  clearEnemiesForMultiplayer();
});

function clearEnemiesForMultiplayer() {
  enemies.forEach((enemy) => {
    scene.remove(enemy.root);
  });

  enemies.length = 0;
}

function getOwnMultiplayerUserId() {
  const accountUsername = document.querySelector('#account-username');
  const ownName = accountUsername?.textContent?.trim();

  const ownPlayer = multiplayerMatchData?.players?.find((player) => {
    return player.username === ownName;
  });

  return ownPlayer?.userId ?? null;
}

function getLocalMultiplayerState() {
  if (!multiplayerMatchActive || !controls.isLocked) {
    return null;
  }

  const direction = new THREE.Vector3();
  controls.getDirection(direction);

  return {
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z,
    yaw: Math.atan2(direction.x, direction.z),
    weaponId: playerState.currentWeaponId,
  };
}

function upsertRemotePlayer(playerStatePayload) {
  if (!multiplayerMatchActive || !assets.enemy) {
    return;
  }

  const ownUserId = getOwnMultiplayerUserId();

  if (playerStatePayload.userId === ownUserId) {
    return;
  }

  let remotePlayer = remotePlayers.get(playerStatePayload.userId);

  if (!remotePlayer) {
    const root = new THREE.Group();
    const model = SkeletonUtils.clone(assets.enemy.scene);

    prepareEnemyModel(model);
    root.add(model);

    scene.add(root);

    remotePlayer = {
      root,
      model,
    };

    remotePlayers.set(playerStatePayload.userId, remotePlayer);
  }

  remotePlayer.root.position.set(
    playerStatePayload.x,
    0,
    playerStatePayload.z
  );

  remotePlayer.root.rotation.y = playerStatePayload.yaw;
}

function removeRemotePlayer(userId) {
  const remotePlayer = remotePlayers.get(userId);

  if (!remotePlayer) {
    return;
  }

  scene.remove(remotePlayer.root);
  remotePlayers.delete(userId);
}

window.SHOTVARA_GAME = {
  getLocalMultiplayerState,
  upsertRemotePlayer,
  removeRemotePlayer,
};

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
}
