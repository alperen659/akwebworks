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
};

const ARENA = {
  halfSize: 22,
  wallHeight: 5.4,
  floorY: 0,
};

const root = document.querySelector('#game-root');
const menu = document.querySelector('#menu');
const pauseMenu = document.querySelector('#pause-menu');
const startButton = document.querySelector('#start-button');
const resumeButton = document.querySelector('#resume-button');
const hudSpeed = document.querySelector('#hud-speed');
const hudState = document.querySelector('#hud-state');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070c);
scene.fog = new THREE.Fog(0x05070c, 18, 62);

const camera = new THREE.PerspectiveCamera(76, window.innerWidth / window.innerHeight, 0.1, 180);
camera.position.set(0, PLAYER.height, 13.5);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
root.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(camera);

const clock = new THREE.Clock();
const keys = new Set();
const velocity = new THREE.Vector3();
const moveVector = new THREE.Vector3();
const forwardVector = new THREE.Vector3();
const rightVector = new THREE.Vector3();

let verticalVelocity = 0;
let canJump = false;
let hasStarted = false;

const colliders = [];

buildLighting();
buildArena();
buildDecorativeAccents();

startButton.addEventListener('click', () => {
  hasStarted = true;
  controls.lock();
});

resumeButton.addEventListener('click', () => {
  controls.lock();
});

controls.addEventListener('lock', () => {
  menu.classList.add('is-hidden');
  pauseMenu.classList.add('is-hidden');
  hudState.textContent = 'Arena aktiv';
});

controls.addEventListener('unlock', () => {
  if (hasStarted) {
    pauseMenu.classList.remove('is-hidden');
    hudState.textContent = 'Pausiert';
  }
});

document.addEventListener('keydown', (event) => {
  keys.add(event.code);

  if (event.code === 'Space' && controls.isLocked && canJump) {
    verticalVelocity = PLAYER.jumpVelocity;
    canJump = false;
  }
});

document.addEventListener('keyup', (event) => {
  keys.delete(event.code);
});

window.addEventListener('resize', onResize);

animate();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);
  updatePlayer(delta);

  renderer.render(scene, camera);
}

function buildLighting() {
  const ambientLight = new THREE.HemisphereLight(0xaec5ff, 0x06080e, 1.45);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xdde9ff, 2.25);
  keyLight.position.set(14, 24, 8);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.left = -32;
  keyLight.shadow.camera.right = 32;
  keyLight.shadow.camera.top = 32;
  keyLight.shadow.camera.bottom = -32;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 80;
  scene.add(keyLight);

  const bluePulse = new THREE.PointLight(0x3769ff, 28, 24, 2);
  bluePulse.position.set(-10, 4.6, -8);
  scene.add(bluePulse);

  const violetPulse = new THREE.PointLight(0x8f5dff, 24, 22, 2);
  violetPulse.position.set(11, 4.2, 7);
  scene.add(violetPulse);
}

function buildArena() {
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x0d1422,
    roughness: 0.84,
    metalness: 0.1,
  });

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(ARENA.halfSize * 2, 0.45, ARENA.halfSize * 2),
    floorMaterial
  );
  floor.position.y = -0.225;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(ARENA.halfSize * 2, 44, 0x31518c, 0x182439);
  grid.position.y = 0.02;
  scene.add(grid);

  addWall(0, -ARENA.halfSize, ARENA.halfSize * 2, 1.2);
  addWall(0, ARENA.halfSize, ARENA.halfSize * 2, 1.2);
  addWall(-ARENA.halfSize, 0, 1.2, ARENA.halfSize * 2);
  addWall(ARENA.halfSize, 0, 1.2, ARENA.halfSize * 2);

  addWall(-8, -5.5, 9.5, 1.15, 0x172135);
  addWall(7.4, 4.8, 10.5, 1.15, 0x172135);
  addWall(-4.6, 9.2, 1.15, 9.4, 0x172135);
  addWall(12.4, -9, 1.15, 8.4, 0x172135);

  addCrate(-11.6, 8.2, 2.6, 2.6, 2.7);
  addCrate(-8.6, 8.2, 2.6, 2.6, 2.7);
  addCrate(4.4, -10.2, 3.2, 3.2, 2.85);
  addCrate(10.4, 11.2, 2.55, 2.55, 2.55);
  addCrate(13.05, 11.2, 2.55, 2.55, 2.55);

  addPillar(-14, -12);
  addPillar(14, -12);
  addPillar(-14, 12);
  addPillar(14, 12);

  addSpawnPlatform();
}

function buildDecorativeAccents() {
  const stripMaterial = new THREE.MeshBasicMaterial({
    color: 0x4f7cff,
  });

  const strips = [
    [-20.8, 0.06, -14.5, 0.12, 0.12, 9],
    [20.8, 0.06, 12.5, 0.12, 0.12, 11],
    [-4.6, 0.06, 4.4, 0.12, 0.12, 7.6],
  ];

  strips.forEach(([x, y, z, width, height, depth]) => {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      stripMaterial
    );
    strip.position.set(x, y, z);
    scene.add(strip);
  });
}

function addSpawnPlatform() {
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(3.25, 3.25, 0.18, 32),
    new THREE.MeshStandardMaterial({
      color: 0x132039,
      roughness: 0.55,
      metalness: 0.35,
      emissive: 0x07142e,
      emissiveIntensity: 0.8,
    })
  );

  platform.position.set(0, 0.09, 13.5);
  platform.receiveShadow = true;
  scene.add(platform);
}

function addWall(x, z, width, depth, color = 0x111a2a) {
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(width, ARENA.wallHeight, depth),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.82,
      metalness: 0.16,
    })
  );

  wall.position.set(x, ARENA.wallHeight / 2, z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);

  colliders.push({
    type: 'box',
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
      color: 0x34415a,
      roughness: 0.68,
      metalness: 0.22,
    })
  );

  crate.position.set(x, height / 2, z);
  crate.castShadow = true;
  crate.receiveShadow = true;
  scene.add(crate);

  colliders.push({
    type: 'box',
    minX: x - width / 2,
    maxX: x + width / 2,
    minZ: z - depth / 2,
    maxZ: z + depth / 2,
  });
}

function addPillar(x, z) {
  const radius = 1.18;

  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 5.4, 22),
    new THREE.MeshStandardMaterial({
      color: 0x202d42,
      roughness: 0.75,
      metalness: 0.22,
    })
  );

  pillar.position.set(x, 2.7, z);
  pillar.castShadow = true;
  pillar.receiveShadow = true;
  scene.add(pillar);

  colliders.push({
    type: 'circle',
    x,
    z,
    radius,
  });
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
    velocity.x = THREE.MathUtils.damp(velocity.x, moveVector.x, PLAYER.acceleration, delta);
    velocity.z = THREE.MathUtils.damp(velocity.z, moveVector.z, PLAYER.acceleration, delta);
  } else {
    velocity.x = THREE.MathUtils.damp(velocity.x, 0, PLAYER.damping, delta);
    velocity.z = THREE.MathUtils.damp(velocity.z, 0, PLAYER.damping, delta);
  }

  verticalVelocity -= PLAYER.gravity * delta;

  const current = camera.position.clone();
  const proposedX = current.x + velocity.x * delta;
  const proposedZ = current.z + velocity.z * delta;

  camera.position.x = resolveAxisCollision(proposedX, current.z, 'x');
  camera.position.z = resolveAxisCollision(proposedZ, camera.position.x, 'z');
  camera.position.y += verticalVelocity * delta;

  if (camera.position.y <= PLAYER.height) {
    camera.position.y = PLAYER.height;
    verticalVelocity = 0;
    canJump = true;
  }

  const horizontalSpeed = Math.hypot(velocity.x, velocity.z);
  hudSpeed.textContent = `${horizontalSpeed.toFixed(1)} m/s`;
}

function resolveAxisCollision(candidateValue, otherAxisValue, axis) {
  let resolved = candidateValue;

  for (const collider of colliders) {
    if (collider.type === 'box') {
      const testX = axis === 'x' ? resolved : camera.position.x;
      const testZ = axis === 'z' ? resolved : otherAxisValue;

      const nearestX = THREE.MathUtils.clamp(testX, collider.minX, collider.maxX);
      const nearestZ = THREE.MathUtils.clamp(testZ, collider.minZ, collider.maxZ);
      const dx = testX - nearestX;
      const dz = testZ - nearestZ;
      const overlap = dx * dx + dz * dz < PLAYER.radius * PLAYER.radius;

      if (overlap) {
        if (axis === 'x') {
          resolved = testX < (collider.minX + collider.maxX) / 2
            ? collider.minX - PLAYER.radius
            : collider.maxX + PLAYER.radius;
          velocity.x = 0;
        } else {
          resolved = testZ < (collider.minZ + collider.maxZ) / 2
            ? collider.minZ - PLAYER.radius
            : collider.maxZ + PLAYER.radius;
          velocity.z = 0;
        }
      }
    }

    if (collider.type === 'circle') {
      const testX = axis === 'x' ? resolved : camera.position.x;
      const testZ = axis === 'z' ? resolved : otherAxisValue;
      const dx = testX - collider.x;
      const dz = testZ - collider.z;
      const minDistance = PLAYER.radius + collider.radius;
      const distanceSq = dx * dx + dz * dz;

      if (distanceSq < minDistance * minDistance) {
        const distance = Math.max(Math.sqrt(distanceSq), 0.0001);
        const nx = dx / distance;
        const nz = dz / distance;

        if (axis === 'x') {
          resolved = collider.x + nx * minDistance;
          velocity.x = 0;
        } else {
          resolved = collider.z + nz * minDistance;
          velocity.z = 0;
        }
      }
    }
  }

  return resolved;
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
}
