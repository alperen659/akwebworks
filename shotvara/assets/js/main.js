import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const PLAYER = {
  height: 1.72,
  radius: 0.42,
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
  floorY: 0,
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
  },
  sniper: {
    id: 'sniper',
    slot: '3',
    name: 'Sniper',
    damage: 100,
    magazineSize: 5,
    fireDelay: 0.92,
    reloadTime: 2.35,
    spread: 0.002,
    automatic: false,
    color: 0xff6b93,
  },
};

const TARGET_SPAWNS = [
  [-14, 2.5, -11],
  [-7, 2.8, -15],
  [2, 2.4, -15],
  [12, 2.7, -11],
  [16, 2.4, 0],
  [13, 2.7, 13],
  [4, 3.1, 15],
  [-7, 2.6, 14],
  [-16, 2.5, 6],
  [-13, 3.0, -1],
  [2, 2.8, 5],
  [8, 2.5, -2],
];

const TARGET_COUNT = 6;

const PICKUP_POSITIONS = {
  mg: [-16, 0.8, 0],
  sniper: [16, 0.8, -2],
  armor: [0, 0.8, -16],
};

const root = document.querySelector('#game-root');
const menu = document.querySelector('#menu');
const pauseMenu = document.querySelector('#pause-menu');
const startButton = document.querySelector('#start-button');
const resumeButton = document.querySelector('#resume-button');
const hudSpeed = document.querySelector('#hud-speed');
const hudState = document.querySelector('#hud-state');
const crosshair = document.querySelector('#crosshair');

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

const clock = new THREE.Clock();
const keys = new Set();

const velocity = new THREE.Vector3();
const moveVector = new THREE.Vector3();
const forwardVector = new THREE.Vector3();
const rightVector = new THREE.Vector3();

const shotDirection = new THREE.Vector3();
const shotRight = new THREE.Vector3();
const shotUp = new THREE.Vector3();

let verticalVelocity = 0;
let canJump = false;
let hasStarted = false;
let triggerHeld = false;
let lastShotTime = -999;
let reloadTimeout = null;

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
};

const colliders = [];
const animatedLights = [];
const raycastMeshes = [];
const targetMeshes = [];
const animatedTargets = [];
const impactEffects = [];
const pickups = [];

const raycaster = new THREE.Raycaster();
raycaster.far = 80;

const combatHud = createCombatHud();
const statusHud = createStatusHud();
const notification = createNotification();

createLighting();
createArena();
createProps();
createSpawnMarker();
spawnInitialTargets();
spawnPickups();
updateAllHud();

controls.addEventListener('lock', () => {
  document.body.classList.add('locked');
  menu.classList.remove('visible');
  pauseMenu.classList.remove('visible');

  combatHud.panel.style.display = 'block';
  statusHud.panel.style.display = 'block';

  hudState.textContent = hasStarted ? 'Arena aktiv' : 'Initialisiere';
  hasStarted = true;
});

controls.addEventListener('unlock', () => {
  document.body.classList.remove('locked');

  if (hasStarted) {
    pauseMenu.classList.add('visible');
    hudState.textContent = 'Pausiert';
  }

  triggerHeld = false;
  keys.clear();
});

startButton.addEventListener('click', () => controls.lock());
resumeButton.addEventListener('click', () => controls.lock());

window.addEventListener('keydown', (event) => {
  keys.add(event.code);

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
  if (event.button !== 0 || !controls.isLocked) {
    return;
  }

  triggerHeld = true;
  attemptShoot(clock.elapsedTime);
});

window.addEventListener('mouseup', (event) => {
  if (event.button === 0) {
    triggerHeld = false;
  }
});

window.addEventListener('resize', onResize);

animate();

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
  raycastMeshes.push(floor);

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
    raycastMeshes.push(column);

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
  raycastMeshes.push(wall);

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
  raycastMeshes.push(obstacle);

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
      Schießstand
    </div>
    <div>Punkte: <strong id="combat-score">0</strong></div>
    <div>Schüsse: <strong id="combat-shots">0</strong></div>
    <div>Treffer: <strong id="combat-hits">0</strong></div>
    <div>Quote: <strong id="combat-accuracy">0%</strong></div>
  `;

  document.body.appendChild(hud);

  return {
    panel: hud,
    score: hud.querySelector('#combat-score'),
    shots: hud.querySelector('#combat-shots'),
    hits: hud.querySelector('#combat-hits'),
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

let notificationTimer = null;

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

function spawnInitialTargets() {
  const availableSpawns = [...TARGET_SPAWNS];

  for (let i = 0; i < TARGET_COUNT; i++) {
    const index = Math.floor(Math.random() * availableSpawns.length);
    const spawn = availableSpawns.splice(index, 1)[0];
    spawnTarget(spawn);
  }
}

function spawnTarget(spawn = getFreeTargetSpawn()) {
  if (!spawn) {
    return;
  }

  const [x, y, z] = spawn;

  const material = new THREE.MeshStandardMaterial({
    color: 0xff4c6a,
    emissive: 0x7d1025,
    emissiveIntensity: 1.3,
    roughness: 0.34,
    metalness: 0.18,
  });

  const target = new THREE.Mesh(
    new THREE.SphereGeometry(0.58, 24, 24),
    material
  );

  target.position.set(x, y, z);
  target.castShadow = true;
  target.userData.isTarget = true;
  target.userData.spawnKey = `${x}|${y}|${z}`;
  target.userData.baseY = y;
  target.userData.offset = Math.random() * Math.PI * 2;
  target.userData.maxHp = 100;
  target.userData.hp = 100;

  scene.add(target);
  raycastMeshes.push(target);
  targetMeshes.push(target);
  animatedTargets.push(target);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.86, 0.045, 16, 48),
    new THREE.MeshBasicMaterial({
      color: 0xff8da0,
      transparent: true,
      opacity: 0.72,
    })
  );

  halo.position.copy(target.position);
  halo.userData.parentTarget = target;
  halo.userData.offset = target.userData.offset;
  target.userData.halo = halo;
  scene.add(halo);
}

function getFreeTargetSpawn() {
  const occupied = new Set(
    targetMeshes.map((target) => target.userData.spawnKey)
  );

  const freeSpawns = TARGET_SPAWNS.filter(([x, y, z]) => {
    const key = `${x}|${y}|${z}`;
    return !occupied.has(key);
  });

  if (freeSpawns.length === 0) {
    return null;
  }

  return freeSpawns[Math.floor(Math.random() * freeSpawns.length)];
}

function spawnPickups() {
  createWeaponPickup('mg', PICKUP_POSITIONS.mg);
  createWeaponPickup('sniper', PICKUP_POSITIONS.sniper);
  createArmorPickup(PICKUP_POSITIONS.armor);
}

function createWeaponPickup(weaponId, position) {
  const weapon = WEAPONS[weaponId];
  const [x, y, z] = position;

  const group = new THREE.Group();

  const core = new THREE.Mesh(
    new THREE.BoxGeometry(
      weaponId === 'sniper' ? 1.85 : 1.35,
      0.28,
      0.36
    ),
    new THREE.MeshStandardMaterial({
      color: weapon.color,
      emissive: weapon.color,
      emissiveIntensity: 0.72,
      roughness: 0.35,
      metalness: 0.3,
    })
  );

  const grip = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.48, 0.25),
    new THREE.MeshStandardMaterial({
      color: 0x202936,
      roughness: 0.8,
      metalness: 0.12,
    })
  );

  grip.position.set(0.12, -0.34, 0);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.0, 0.04, 14, 48),
    new THREE.MeshBasicMaterial({
      color: weapon.color,
      transparent: true,
      opacity: 0.7,
    })
  );

  ring.rotation.x = Math.PI / 2;

  group.add(core);
  group.add(grip);
  group.add(ring);
  group.position.set(x, y, z);

  scene.add(group);

  pickups.push({
    type: 'weapon',
    weaponId,
    object: group,
    baseY: y,
    radius: 1.35,
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
  playerState.currentWeaponId = weaponId;
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

  const spreadX = (Math.random() - 0.5) * weapon.spread;
  const spreadY = (Math.random() - 0.5) * weapon.spread;

  shotDirection
    .addScaledVector(shotRight, spreadX)
    .addScaledVector(shotUp, spreadY)
    .normalize();

  raycaster.set(camera.position, shotDirection);

  const intersections = raycaster.intersectObjects(raycastMeshes, false);
  const firstHit = intersections[0];

  const endPoint = firstHit
    ? firstHit.point.clone()
    : camera.position.clone().addScaledVector(shotDirection, 70);

  createImpactEffect(
    endPoint,
    firstHit?.object?.userData?.isTarget === true
  );

  pulseCrosshair();

  if (firstHit?.object?.userData?.isTarget === true) {
    registerTargetHit(firstHit.object, endPoint, weapon);
  }
}

function registerTargetHit(target, hitPoint, weapon) {
  stats.hits += 1;
  stats.score += weapon.damage;
  updateCombatHud();

  target.userData.hp -= weapon.damage;

  const hpRatio = Math.max(target.userData.hp / target.userData.maxHp, 0);
  target.material.emissiveIntensity = 0.6 + hpRatio * 0.8;

  createTargetBurst(hitPoint);

  if (target.userData.hp <= 0) {
    stats.score += 50;
    updateCombatHud();
    removeTarget(target);

    window.setTimeout(() => {
      spawnTarget();
    }, 650);
  }
}

function removeTarget(target) {
  const halo = target.userData.halo;

  scene.remove(target);
  scene.remove(halo);

  const raycastIndex = raycastMeshes.indexOf(target);
  if (raycastIndex !== -1) raycastMeshes.splice(raycastIndex, 1);

  const targetIndex = targetMeshes.indexOf(target);
  if (targetIndex !== -1) targetMeshes.splice(targetIndex, 1);

  const animatedIndex = animatedTargets.indexOf(target);
  if (animatedIndex !== -1) animatedTargets.splice(animatedIndex, 1);

  target.geometry.dispose();
  target.material.dispose();

  if (halo) {
    halo.geometry.dispose();
    halo.material.dispose();
  }
}

function createImpactEffect(position, isTargetHit) {
  const material = new THREE.MeshBasicMaterial({
    color: isTargetHit ? 0xff8da0 : 0x8de8ff,
    transparent: true,
    opacity: 0.95,
  });

  const impact = new THREE.Mesh(
    new THREE.SphereGeometry(isTargetHit ? 0.18 : 0.11, 14, 14),
    material
  );

  impact.position.copy(position);
  scene.add(impact);

  impactEffects.push({
    mesh: impact,
    life: 0.18,
    maxLife: 0.18,
    growth: isTargetHit ? 3.2 : 2.1,
  });
}

function createTargetBurst(position) {
  for (let i = 0; i < 6; i++) {
    const material = new THREE.MeshBasicMaterial({
      color: 0xff6f86,
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
  animateTargets(time);
  updateImpactEffects(delta);
  updatePlayer(delta);
  updatePickups(time);
  updateAutomaticFire(time);

  renderer.render(scene, camera);
}

function animateLights(time) {
  animatedLights.forEach(({ light, baseIntensity, offset }) => {
    light.intensity =
      baseIntensity + Math.sin(time * 1.7 + offset) * 0.18;
  });
}

function animateTargets(time) {
  animatedTargets.forEach((target) => {
    const floatOffset = Math.sin(time * 2.15 + target.userData.offset) * 0.16;
    target.position.y = target.userData.baseY + floatOffset;
    target.rotation.y += 0.012;
    target.rotation.x += 0.006;

    const halo = target.userData.halo;

    if (halo) {
      halo.position.copy(target.position);
      halo.lookAt(camera.position);
      halo.rotation.z += 0.015;
    }
  });
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

function updateAutomaticFire(time) {
  const weapon = WEAPONS[playerState.currentWeaponId];

  if (
    controls.isLocked &&
    triggerHeld &&
    weapon.automatic
  ) {
    attemptShoot(time);
  }
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
      playerState.ammo[pickup.weaponId] = WEAPONS[pickup.weaponId].magazineSize;
      playerState.currentWeaponId = pickup.weaponId;
      pickup.collected = true;
      pickup.object.visible = false;

      cancelReload();
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

function updatePlayer(delta) {
  if (!controls.isLocked) {
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

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
}
