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
let verticalVelocity = 0;
let canJump = false;
let hasStarted = false;

const colliders = [];
const animatedLights = [];

createLighting();
createArena();
createProps();
createSpawnMarker();

controls.addEventListener('lock', () => {
  document.body.classList.add('locked');
  menu.classList.remove('visible');
  pauseMenu.classList.remove('visible');
  hudState.textContent = hasStarted ? 'Arena aktiv' : 'Initialisiere';
  hasStarted = true;
});

controls.addEventListener('unlock', () => {
  document.body.classList.remove('locked');
  if (hasStarted) {
    pauseMenu.classList.add('visible');
    hudState.textContent = 'Pausiert';
  }
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
});

window.addEventListener('keyup', (event) => {
  keys.delete(event.code);
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
  animatedLights.push({ light, baseIntensity: intensity, offset: Math.random() * Math.PI * 2 });

  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 18, 18),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.6, roughness: 0.35 })
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
  const floor = new THREE.Mesh(new THREE.BoxGeometry(ARENA.halfSize * 2, 0.7, ARENA.halfSize * 2), floorMaterial);
  floor.position.set(0, -0.35, 0);
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(ARENA.halfSize * 2, 44, 0x35526a, 0x1b2838);
  grid.position.y = 0.01;
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  scene.add(grid);

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x162131,
    roughness: 0.82,
    metalness: 0.16,
  });

  addWall(0, ARENA.wallHeight / 2, -ARENA.halfSize, ARENA.halfSize * 2, ARENA.wallHeight, 1.1, wallMaterial);
  addWall(0, ARENA.wallHeight / 2, ARENA.halfSize, ARENA.halfSize * 2, ARENA.wallHeight, 1.1, wallMaterial);
  addWall(-ARENA.halfSize, ARENA.wallHeight / 2, 0, 1.1, ARENA.wallHeight, ARENA.halfSize * 2, wallMaterial);
  addWall(ARENA.halfSize, ARENA.wallHeight / 2, 0, 1.1, ARENA.wallHeight, ARENA.halfSize * 2, wallMaterial);

  const stripeMaterial = new THREE.MeshStandardMaterial({ color: 0x274357, emissive: 0x0a1720, emissiveIntensity: 0.8 });
  [-1, 1].forEach((direction) => {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(ARENA.halfSize * 2 - 1.8, 0.11, 0.14), stripeMaterial);
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

  const columnMaterial = new THREE.MeshStandardMaterial({ color: 0x1a2737, roughness: 0.85, metalness: 0.12 });
  [[-14, -14], [14, -14], [-14, 14], [14, 14]].forEach(([x, z]) => {
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 4.9, 20), columnMaterial);
    column.position.set(x, 2.45, z);
    column.castShadow = true;
    column.receiveShadow = true;
    scene.add(column);
    registerCircularCollider(x, z, 0.9);
  });
}

function createSpawnMarker() {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.2, 1.55, 48),
    new THREE.MeshBasicMaterial({ color: 0x5ec8ff, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.025, 13.5);
  scene.add(ring);
}

function addWall(x, y, z, width, height, depth, material) {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  wall.position.set(x, y, z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);
  registerBoxCollider(x, z, width, depth);
}

function addObstacle(x, y, z, width, height, depth, material) {
  const obstacle = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  obstacle.position.set(x, y, z);
  obstacle.castShadow = true;
  obstacle.receiveShadow = true;
  scene.add(obstacle);
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
  colliders.push({ type: 'circle', x, z, radius });
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);

  animateLights(clock.elapsedTime);
  updatePlayer(delta);
  renderer.render(scene, camera);
}

function animateLights(time) {
  animatedLights.forEach(({ light, baseIntensity, offset }) => {
    light.intensity = baseIntensity + Math.sin(time * 1.7 + offset) * 0.18;
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
  camera.position.z = resolveAxisCollision(camera.position.x, proposedZ, 'z');
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
