import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.184.0/examples/jsm/controls/PointerLockControls.js';

const CONFIG = {
  playerHeight: 1.7,
  playerRadius: 0.42,
  moveSpeed: 7.2,
  sprintSpeed: 10.2,
  gravity: 28,
  jumpStrength: 9.2,
  arenaHalfSize: 22,
  floorY: 0,
};

const dom = {
  overlay: document.getElementById('overlay'),
  enterButton: document.getElementById('enter-arena'),
  pausePanel: document.getElementById('pause-panel'),
  resumeButton: document.getElementById('resume-arena'),
  crosshair: document.getElementById('crosshair'),
  statusText: document.getElementById('status-text'),
  speedText: document.getElementById('speed-text'),
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x090d18);
scene.fog = new THREE.Fog(0x090d18, 26, 72);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, CONFIG.playerHeight, 14);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, document.body);
scene.add(camera);

const clock = new THREE.Clock();

const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false,
};

const velocity = new THREE.Vector3();
let verticalVelocity = 0;
let canJump = false;

const colliders = [];

buildLighting();
buildArena();

dom.enterButton.addEventListener('click', () => {
  controls.lock();
});

dom.resumeButton.addEventListener('click', () => {
  controls.lock();
});

controls.addEventListener('lock', () => {
  dom.overlay.classList.add('hidden');
  dom.pausePanel.classList.add('hidden');
  dom.crosshair.classList.remove('hidden');
  dom.statusText.textContent = 'Arena aktiv';
});

controls.addEventListener('unlock', () => {
  dom.crosshair.classList.add('hidden');

  if (!dom.overlay.classList.contains('hidden')) {
    return;
  }

  dom.pausePanel.classList.remove('hidden');
  dom.statusText.textContent = 'Pausiert';
});

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

window.addEventListener('resize', onResize);

animate();

function onKeyDown(event) {
  switch (event.code) {
    case 'KeyW':
      keys.forward = true;
      break;
    case 'KeyS':
      keys.backward = true;
      break;
    case 'KeyA':
      keys.left = true;
      break;
    case 'KeyD':
      keys.right = true;
      break;
    case 'ShiftLeft':
    case 'ShiftRight':
      keys.sprint = true;
      break;
    case 'Space':
      if (controls.isLocked && canJump) {
        verticalVelocity = CONFIG.jumpStrength;
        canJump = false;
      }
      break;
  }
}

function onKeyUp(event) {
  switch (event.code) {
    case 'KeyW':
      keys.forward = false;
      break;
    case 'KeyS':
      keys.backward = false;
      break;
    case 'KeyA':
      keys.left = false;
      break;
    case 'KeyD':
      keys.right = false;
      break;
    case 'ShiftLeft':
    case 'ShiftRight':
      keys.sprint = false;
      break;
  }
}

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);

  if (controls.isLocked) {
    updatePlayer(delta);
  }

  renderer.render(scene, camera);
}

function updatePlayer(delta) {
  const input = new THREE.Vector3();

  if (keys.forward) input.z -= 1;
  if (keys.backward) input.z += 1;
  if (keys.left) input.x -= 1;
  if (keys.right) input.x += 1;

  if (input.lengthSq() > 0) {
    input.normalize();

    const direction = new THREE.Vector3();
    controls.getDirection(direction);

    direction.y = 0;
    direction.normalize();

    const right = new THREE.Vector3()
      .crossVectors(direction, camera.up)
      .normalize();

    const moveDirection = new THREE.Vector3();

    moveDirection.addScaledVector(direction, -input.z);
    moveDirection.addScaledVector(right, input.x);
    moveDirection.normalize();

    const speed = keys.sprint ? CONFIG.sprintSpeed : CONFIG.moveSpeed;

    velocity.x = moveDirection.x * speed;
    velocity.z = moveDirection.z * speed;
  } else {
    velocity.x = 0;
    velocity.z = 0;
  }

  const nextX = camera.position.x + velocity.x * delta;
  const nextZ = camera.position.z + velocity.z * delta;

  if (!collidesAt(nextX, camera.position.z)) {
    camera.position.x = nextX;
  }

  if (!collidesAt(camera.position.x, nextZ)) {
    camera.position.z = nextZ;
  }

  verticalVelocity -= CONFIG.gravity * delta;
  camera.position.y += verticalVelocity * delta;

  if (camera.position.y <= CONFIG.playerHeight) {
    camera.position.y = CONFIG.playerHeight;
    verticalVelocity = 0;
    canJump = true;
  }

  dom.speedText.textContent = `${Math.round(
    Math.hypot(velocity.x, velocity.z)
  )} m/s`;
}

function collidesAt(x, z) {
  const limit = CONFIG.arenaHalfSize - CONFIG.playerRadius;

  if (x < -limit || x > limit || z < -limit || z > limit) {
    return true;
  }

  for (const collider of colliders) {
    const nearestX = Math.max(
      collider.minX,
      Math.min(x, collider.maxX)
    );

    const nearestZ = Math.max(
      collider.minZ,
      Math.min(z, collider.maxZ)
    );

    const dx = x - nearestX;
    const dz = z - nearestZ;

    if (dx * dx + dz * dz < CONFIG.playerRadius * CONFIG.playerRadius) {
      return true;
    }
  }

  return false;
}

function buildLighting() {
  const ambient = new THREE.AmbientLight(0x93a4c7, 1.35);
  scene.add(ambient);

  const moonLight = new THREE.DirectionalLight(0xdfe9ff, 2.3);
  moonLight.position.set(14, 28, 12);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.width = 2048;
  moonLight.shadow.mapSize.height = 2048;
  moonLight.shadow.camera.near = 0.5;
  moonLight.shadow.camera.far = 80;
  moonLight.shadow.camera.left = -35;
  moonLight.shadow.camera.right = 35;
  moonLight.shadow.camera.top = 35;
  moonLight.shadow.camera.bottom = -35;
  scene.add(moonLight);

  const accentLightA = new THREE.PointLight(0x3e6cff, 26, 22, 2);
  accentLightA.position.set(-11, 4.2, -7);
  scene.add(accentLightA);

  const accentLightB = new THREE.PointLight(0x8b5cff, 24, 22, 2);
  accentLightB.position.set(11, 4.2, 8);
  scene.add(accentLightB);
}

function buildArena() {
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.86,
    metalness: 0.12,
  });

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(CONFIG.arenaHalfSize * 2, 0.5, CONFIG.arenaHalfSize * 2),
    floorMaterial
  );
  floor.position.y = -0.25;
  floor.receiveShadow = true;
  scene.add(floor);

  addGridLines();
  addWall(0, -CONFIG.arenaHalfSize, CONFIG.arenaHalfSize * 2, 1.2, 0);
  addWall(0, CONFIG.arenaHalfSize, CONFIG.arenaHalfSize * 2, 1.2, 0);
  addWall(-CONFIG.arenaHalfSize, 0, 1.2, CONFIG.arenaHalfSize * 2, 0);
  addWall(CONFIG.arenaHalfSize, 0, 1.2, CONFIG.arenaHalfSize * 2, 0);

  addWall(-8, -5, 9, 1.1, 0x172134);
  addWall(7, 4, 10, 1.1, 0x172134);
  addWall(-4, 9, 1.1, 9, 0x172134);
  addWall(12, -9, 1.1, 8, 0x172134);

  addCrate(-11, 8, 2.4, 2.4, 2.4);
  addCrate(-9, 8, 2.4, 2.4, 2.4);
  addCrate(4, -10, 3.2, 3.2, 2.8);
  addCrate(10, 11, 2.6, 2.6, 2.6);
  addCrate(11.8, 11, 2.6, 2.6, 2.6);

  addPillar(-14, -12);
  addPillar(14, -12);
  addPillar(-14, 12);
  addPillar(14, 12);
}

function addGridLines() {
  const helper = new THREE.GridHelper(
    CONFIG.arenaHalfSize * 2,
    44,
    0x2f4777,
    0x1e293b
  );
  helper.position.y = 0.01;
  scene.add(helper);
}

function addWall(x, z, width, depth, color = 0x1b263a) {
  const wallHeight = 4.2;

  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(width, wallHeight, depth),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.82,
      metalness: 0.18,
    })
  );

  wall.position.set(x, wallHeight / 2, z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);

  colliders.push({
    minX: x - width / 2,
    maxX: x + width / 2,
    minZ: z - depth / 2,
    maxZ: z + depth / 2,
  });
}

function addCrate(x, z, width, depth, height) {
  const crate = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({
      color: 0x384155,
      roughness: 0.74,
      metalness: 0.26,
    })
  );

  crate.position.set(x, height / 2, z);
  crate.castShadow = true;
  crate.receiveShadow = true;
  scene.add(crate);

  colliders.push({
    minX: x - width / 2,
    maxX: x + width / 2,
    minZ: z - depth / 2,
    maxZ: z + depth / 2,
  });
}

function addPillar(x, z) {
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.15, 5.2, 18),
    new THREE.MeshStandardMaterial({
      color: 0x202b3d,
      roughness: 0.78,
      metalness: 0.2,
    })
  );

  pillar.position.set(x, 2.6, z);
  pillar.castShadow = true;
  pillar.receiveShadow = true;
  scene.add(pillar);

  colliders.push({
    minX: x - 1.15,
    maxX: x + 1.15,
    minZ: z - 1.15,
    maxZ: z + 1.15,
  });
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
