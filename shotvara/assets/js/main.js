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

let verticalVelocity = 0;
let canJump = false;
let hasStarted = false;

const colliders = [];
const animatedLights = [];

const raycaster = new THREE.Raycaster();
raycaster.far = 80;

const raycastMeshes = [];
const targetMeshes = [];
const animatedTargets = [];
const impactEffects = [];

const shotDirection = new THREE.Vector3();

const stats = {
  score: 0,
  shots: 0,
  hits: 0,
};

const combatHud = createCombatHud();

createLighting();
createArena();
createProps();
createSpawnMarker();
spawnInitialTargets();

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

window.addEventListener('mousedown', (event) => {
  if (event.button === 0 && controls.isLocked) {
    shoot();
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

  hud.style.position = 'fixed';
  hud.style.top = '24px';
  hud.style.right = '24px';
  hud.style.zIndex = '20';
  hud.style.minWidth = '170px';
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
    score: hud.querySelector('#combat-score'),
    shots: hud.querySelector('#combat-shots'),
    hits: hud.querySelector('#combat-hits'),
    accuracy: hud.querySelector('#combat-accuracy'),
  };
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

function shoot() {
  stats.shots += 1;
  updateCombatHud();

  camera.getWorldDirection(shotDirection);
  raycaster.set(camera.position, shotDirection);

  const intersections = raycaster.intersectObjects(raycastMeshes, false);
  const firstHit = intersections[0];

  const endPoint = firstHit
    ? firstHit.point.clone()
    : camera.position.clone().addScaledVector(shotDirection, 70);

  createTracer(camera.position.clone(), endPoint);
  createImpactEffect(endPoint, firstHit?.object?.userData?.isTarget === true);
  pulseCrosshair();

  if (firstHit?.object?.userData?.isTarget === true) {
    registerTargetHit(firstHit.object, endPoint);
  }
}

function registerTargetHit(target, hitPoint) {
  stats.hits += 1;
  stats.score += 100;
  updateCombatHud();

  createTargetBurst(hitPoint);
  removeTarget(target);

  window.setTimeout(() => {
    spawnTarget();
  }, 650);
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

function createTracer(start, end) {
  const direction = end.clone().sub(start).normalize();
  const tracerStart = start.clone().addScaledVector(direction, 0.55);

  const geometry = new THREE.BufferGeometry().setFromPoints([
    tracerStart,
    end,
  ]);

  const material = new THREE.LineBasicMaterial({
    color: 0x92e8ff,
    transparent: true,
    opacity: 0.95,
  });

  const tracer = new THREE.Line(geometry, material);
  scene.add(tracer);

  window.setTimeout(() => {
    scene.remove(tracer);
    geometry.dispose();
    material.dispose();
  }, 70);
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

  animateLights(clock.elapsedTime);
  animateTargets(clock.elapsedTime);
  updateImpactEffects(delta);
  updatePlayer(delta);

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
