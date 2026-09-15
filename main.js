import * as THREE from 'three';
import confetti from 'canvas-confetti';

/* ==========================================================================
   AUDIO SYNTHESIZER (WEB AUDIO API)
   ========================================================================== */
class SoftSoundSynth {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  playChime(notes = [523.25, 659.25, 783.99, 1046.5], duration = 0.6) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        
        gain.gain.setValueAtTime(0.001, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.09 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.09 + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + duration + 0.05);
      });
    } catch (e) {
      console.warn('Audio chime error:', e);
    }
  }

  playGentlePing() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.07, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } catch (e) {
      console.warn('Ping audio error:', e);
    }
  }
}

const synth = new SoftSoundSynth();

/* ==========================================================================
   PROCEDURAL ENVIRONMENT GENERATOR
   Creates studio reflection map for realistic physical glass and silky petals
   ========================================================================== */
function createStudioEnvironment(renderer) {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#FFFFFF');
  grad.addColorStop(0.35, '#F3EBFB');
  grad.addColorStop(0.7, '#DFCEF1');
  grad.addColorStop(1, '#C5ADE1');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  const spot1 = ctx.createRadialGradient(150, 90, 5, 150, 90, 130);
  spot1.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  spot1.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = spot1;
  ctx.fillRect(0, 0, 512, 256);

  const spot2 = ctx.createRadialGradient(370, 70, 5, 370, 70, 110);
  spot2.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  spot2.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = spot2;
  ctx.fillRect(0, 0, 512, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  const envMap = pmremGenerator.fromEquirectangular(texture).texture;
  pmremGenerator.dispose();
  texture.dispose();
  return envMap;
}

/* ==========================================================================
   PROCEDURAL DAISY PETAL TEXTURES (VIBRANT PURPLE & LILAC)
   ========================================================================== */
function createDaisyPetalTexture(isDeep = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 512, 0, 0);
  if (isDeep) {
    grad.addColorStop(0, '#3E1463');
    grad.addColorStop(0.18, '#5F2791');
    grad.addColorStop(0.42, '#874AB8');
    grad.addColorStop(0.72, '#AA73D4');
    grad.addColorStop(0.92, '#C798EB');
    grad.addColorStop(1, '#D8AFF4');
  } else {
    grad.addColorStop(0, '#4E1F78');
    grad.addColorStop(0.18, '#7135A4');
    grad.addColorStop(0.42, '#9858CA');
    grad.addColorStop(0.72, '#B882E0');
    grad.addColorStop(0.92, '#D2A5F1');
    grad.addColorStop(1, '#E1BDF8');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 512);

  ctx.strokeStyle = isDeep ? 'rgba(55, 16, 92, 0.65)' : 'rgba(70, 24, 115, 0.55)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(64, 512);
  ctx.lineTo(64, 30);
  ctx.stroke();

  ctx.strokeStyle = isDeep ? 'rgba(75, 26, 120, 0.4)' : 'rgba(90, 35, 140, 0.35)';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(64, 470);
  ctx.quadraticCurveTo(44, 270, 48, 65);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(64, 470);
  ctx.quadraticCurveTo(84, 270, 80, 65);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/* ==========================================================================
   PROCEDURAL DAISY CENTER DISK TEXTURE
   ========================================================================== */
function createDaisyCenterTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  grad.addColorStop(0, '#150A22');
  grad.addColorStop(0.65, '#221133');
  grad.addColorStop(0.85, '#321A4B');
  grad.addColorStop(1, '#130920');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#422463';
  for (let i = 0; i < 220; i++) {
    const a = i * 2.39996;
    const r = Math.sqrt(i / 220) * 72;
    ctx.beginPath();
    ctx.arc(128 + Math.cos(a) * r, 128 + Math.sin(a) * r, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#F59E0B';
  for (let s = 0; s < 48; s++) {
    const sa = (s / 48) * Math.PI * 2;
    const sr = 82 + (Math.random() - 0.5) * 6;
    ctx.beginPath();
    ctx.arc(128 + Math.cos(sa) * sr, 128 + Math.sin(sa) * sr, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/* ==========================================================================
   THREE.JS 3D SCENE: WIDE-CANVAS FLOWER IMPOSING DIRECTLY ON TYPOGRAPHY
   ========================================================================== */
class FlowerVaseScene {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.flowerGroup = null;
    this.daisyHead = null;

    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.rotationVelocity = { x: 0, y: 0.002 };
    this.idleTimer = 0;

    this.init();
  }

  init() {
    // Wide canvas view allowing petals to spread across "FA" and "RLY"
    const width = this.container.clientWidth || 520;
    const height = this.container.clientHeight || 520;

    this.scene = new THREE.Scene();

    // Camera framed so flower blossom overlaps outward by ~75px into both sides
    this.camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    this.camera.position.set(0, 0.05, 4.3);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    const envMap = createStudioEnvironment(this.renderer);
    this.scene.environment = envMap;

    this.setupLighting();
    this.buildModel();
    this.bindEvents();

    this.clock = new THREE.Clock();
    this.animate();
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0xf2e8fa, 1.1);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.7);
    keyLight.position.set(2, 3, 4);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xcaa5e8, 1.2);
    fillLight.position.set(-3, 1, 3);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xecd8fa, 1.2);
    rimLight.position.set(0, 2, -3);
    this.scene.add(rimLight);
  }

  buildModel() {
    this.flowerGroup = new THREE.Group();

    // 1. Sleek Minimalist Glass Cylinder Vase
    const vaseHeight = 0.95;
    const vaseRadius = 0.24;
    const vaseGeometry = new THREE.CylinderGeometry(vaseRadius, vaseRadius, vaseHeight, 48, 1, false);
    
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.96,
      opacity: 1,
      transparent: true,
      roughness: 0.03,
      ior: 1.52,
      thickness: 0.8,
      specularIntensity: 1.0,
      specularColor: new THREE.Color(0xffffff),
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      attenuationColor: new THREE.Color(0xe6dcf5),
      attenuationDistance: 2.5
    });

    const vaseMesh = new THREE.Mesh(vaseGeometry, glassMaterial);
    vaseMesh.position.set(0, -0.88, 0);
    this.flowerGroup.add(vaseMesh);

    // Water inside cylinder vase
    const waterHeight = 0.65;
    const waterGeometry = new THREE.CylinderGeometry(vaseRadius - 0.015, vaseRadius - 0.015, waterHeight, 36);
    const waterMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xede4f7,
      transmission: 0.92,
      transparent: true,
      opacity: 0.85,
      roughness: 0.02,
      ior: 1.333
    });
    const waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
    waterMesh.position.set(0, -1.02, 0);
    this.flowerGroup.add(waterMesh);

    // 2. Slender Botanical Green Stem
    const stemGeometry = new THREE.CylinderGeometry(0.032, 0.034, 2.05, 24);
    const stemMaterial = new THREE.MeshStandardMaterial({
      color: 0x5a7a56,
      roughness: 0.42,
      metalness: 0.04
    });
    const stemMesh = new THREE.Mesh(stemGeometry, stemMaterial);
    stemMesh.position.set(0, -0.30, 0);
    this.flowerGroup.add(stemMesh);

    // 3. Flower Blossom (Positioned at y = 0.72, facing camera)
    this.daisyHead = new THREE.Group();
    this.daisyHead.position.set(0, 0.72, 0);
    this.daisyHead.rotation.set(0, 0, 0);

    // Calyx receptacle on back of flower
    const calyxGeom = new THREE.ConeGeometry(0.14, 0.16, 16);
    const calyxMat = new THREE.MeshStandardMaterial({ color: 0x486b4f, roughness: 0.5 });
    const calyx = new THREE.Mesh(calyxGeom, calyxMat);
    calyx.rotation.x = Math.PI / 2;
    calyx.position.z = -0.06;
    this.daisyHead.add(calyx);

    // Center disk florets with dark navy/purple & golden stamen ring
    const diskTexture = createDaisyCenterTexture();
    const diskGeom = new THREE.SphereGeometry(0.26, 36, 20);
    diskGeom.scale(1, 1, 0.45);
    const diskMat = new THREE.MeshStandardMaterial({
      map: diskTexture,
      roughness: 0.55,
      metalness: 0.08
    });
    const centerDisk = new THREE.Mesh(diskGeom, diskMat);
    centerDisk.position.z = 0.04;
    this.daisyHead.add(centerDisk);

    // 4. Radiating Rich Purple Daisy Petals (Lush Spread)
    const numPetals = 24;
    const petalTextureMain = createDaisyPetalTexture(false);
    const petalTextureDeep = createDaisyPetalTexture(true);

    const petalGeom = this.createPetalGeometry(1.06, 0.22);

    const petalMatMain = new THREE.MeshPhysicalMaterial({
      map: petalTextureMain,
      color: new THREE.Color(0xffffff),
      roughness: 0.32,
      sheen: 1.0,
      sheenColor: new THREE.Color(0xb87ae0),
      sheenRoughness: 0.3,
      clearcoat: 0.12,
      side: THREE.DoubleSide
    });

    const petalMatDeep = new THREE.MeshPhysicalMaterial({
      map: petalTextureDeep,
      color: new THREE.Color(0xf6ecff),
      roughness: 0.35,
      sheen: 1.0,
      sheenColor: new THREE.Color(0xa260d0),
      sheenRoughness: 0.35,
      clearcoat: 0.12,
      side: THREE.DoubleSide
    });

    for (let i = 0; i < numPetals; i++) {
      const angle = (i / numPetals) * Math.PI * 2;
      const isAlt = i % 2 === 1;
      const petal = new THREE.Mesh(petalGeom, isAlt ? petalMatDeep : petalMatMain);
      
      petal.position.x = Math.cos(angle) * 0.20;
      petal.position.y = Math.sin(angle) * 0.20;
      petal.position.z = isAlt ? 0.025 : 0.005;
      petal.rotation.z = angle - Math.PI / 2;
      petal.rotation.x = 0.08 + Math.sin(i * 1.5) * 0.03;

      this.daisyHead.add(petal);
    }

    this.flowerGroup.add(this.daisyHead);
    this.scene.add(this.flowerGroup);
  }

  createPetalGeometry(length = 1.06, width = 0.22) {
    const shape = new THREE.Shape();
    const halfW = width * 0.5;
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(halfW * 1.15, length * 0.25, halfW, length * 0.65);
    shape.quadraticCurveTo(halfW * 0.85, length * 0.95, 0, length);
    shape.quadraticCurveTo(-halfW * 0.85, length * 0.95, -halfW, length * 0.65);
    shape.quadraticCurveTo(-halfW * 1.15, length * 0.25, 0, 0);

    const geom = new THREE.ShapeGeometry(shape, 16);
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const x = pos.getX(i);
      const lengthCurve = Math.sin((y / length) * Math.PI * 0.9) * 0.05;
      const widthCurve = (x * x) * 0.18;
      pos.setZ(i, lengthCurve - widthCurve);
    }
    geom.computeVertexNormals();
    return geom;
  }

  bindEvents() {
    const el = this.container;

    const onPointerDown = (e) => {
      this.isDragging = true;
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);
      this.previousMousePosition = { x: clientX, y: clientY };

      const hint = document.getElementById('rotation-hint');
      if (hint && !hint.classList.contains('fade-out')) {
        hint.classList.add('fade-out');
      }
    };

    const onPointerMove = (e) => {
      if (!this.isDragging) return;
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);
      const deltaX = clientX - this.previousMousePosition.x;
      const deltaY = clientY - this.previousMousePosition.y;

      this.rotationVelocity.y = deltaX * 0.012;
      this.rotationVelocity.x = deltaY * 0.006;

      this.flowerGroup.rotation.y += this.rotationVelocity.y;
      this.flowerGroup.rotation.x = Math.max(-0.25, Math.min(0.25, this.flowerGroup.rotation.x + this.rotationVelocity.x));

      this.previousMousePosition = { x: clientX, y: clientY };
      this.idleTimer = 0;
    };

    const onPointerUp = () => {
      this.isDragging = false;
    };

    el.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    el.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    window.addEventListener('resize', () => {
      if (!this.container || !this.renderer || !this.camera) return;
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    if (!this.isDragging) {
      this.rotationVelocity.y *= 0.94;
      this.rotationVelocity.x *= 0.94;
      this.flowerGroup.rotation.y += this.rotationVelocity.y;
      this.flowerGroup.rotation.x += this.rotationVelocity.x;

      this.idleTimer += delta;
      if (this.idleTimer > 1.2) {
        this.flowerGroup.rotation.y += 0.0035;
        this.flowerGroup.rotation.x += (0.0 - this.flowerGroup.rotation.x) * 0.02;
      }
    }

    if (this.daisyHead) {
      this.daisyHead.rotation.z = Math.sin(time * 1.4) * 0.02;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

/* ==========================================================================
   FALLING PETALS CANVAS BACKGROUND
   ========================================================================== */
class FallingPetalsCanvas {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.petals = [];
    this.numPetals = 25;
    this.colors = ['#B884DD', '#A260D0', '#D8AFF4', '#C798EB'];

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    for (let i = 0; i < this.numPetals; i++) {
      this.petals.push(this.createPetal(true));
    }

    this.animate();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  createPetal(randomY = false) {
    return {
      x: Math.random() * this.canvas.width,
      y: randomY ? Math.random() * this.canvas.height : -30,
      size: 9 + Math.random() * 11,
      speedY: 0.8 + Math.random() * 1.3,
      speedX: -0.5 + Math.random() * 1.0,
      oscillationSpeed: 0.015 + Math.random() * 0.02,
      oscillationDistance: 25 + Math.random() * 35,
      angle: Math.random() * Math.PI * 2,
      rotationSpeed: -0.02 + Math.random() * 0.04,
      opacity: 0.28 + Math.random() * 0.38,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      t: Math.random() * 100
    };
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = 0; i < this.petals.length; i++) {
      const p = this.petals[i];
      p.t += p.oscillationSpeed;
      p.y += p.speedY;
      p.x += Math.sin(p.t) * 0.8 + p.speedX;
      p.angle += p.rotationSpeed;

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.angle);
      this.ctx.globalAlpha = p.opacity;

      this.ctx.beginPath();
      this.ctx.fillStyle = p.color;
      this.ctx.ellipse(0, 0, p.size * 0.45, p.size, 0, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();

      if (p.y > this.canvas.height + 40 || p.x < -40 || p.x > this.canvas.width + 40) {
        this.petals[i] = this.createPetal(false);
      }
    }

    requestAnimationFrame(() => this.animate());
  }

  burst(count = 40) {
    for (let i = 0; i < count; i++) {
      const petal = this.createPetal(false);
      petal.x = this.canvas.width * 0.5 + (Math.random() - 0.5) * 400;
      petal.y = this.canvas.height * 0.3 + (Math.random() - 0.5) * 200;
      petal.speedY = 2 + Math.random() * 3;
      petal.opacity = 0.65 + Math.random() * 0.3;
      this.petals.push(petal);
    }
  }
}

/* ==========================================================================
   APP INITIALIZATION & EVENT LOGIC
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize 3D Scene
  const canvasContainer = document.getElementById('canvas-container');
  let flowerScene = null;
  if (canvasContainer) {
    flowerScene = new FlowerVaseScene(canvasContainer);
  }

  // 2. Initialize Falling Petals
  const petalsCanvas = document.getElementById('petals-canvas');
  let petalsSystem = null;
  if (petalsCanvas) {
    petalsSystem = new FallingPetalsCanvas(petalsCanvas);
  }

  // 3. Sound Toggle Button
  const soundToggleBtn = document.getElementById('sound-toggle');
  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      const isEnabled = synth.toggle();
      soundToggleBtn.style.opacity = isEnabled ? '1' : '0.4';
      if (isEnabled) {
        synth.playGentlePing();
      }
    });
  }

  // 4. Modal Handlers
  const openModal = (modalId) => {
    const dialog = document.getElementById(modalId);
    if (dialog && typeof dialog.showModal === 'function') {
      dialog.showModal();
      synth.playGentlePing();
    }
  };

  const closeModal = (modalId) => {
    const dialog = document.getElementById(modalId);
    if (dialog && typeof dialog.close === 'function') {
      dialog.close();
    }
  };

  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-close-modal');
      closeModal(targetId);
    });
  });

  document.querySelectorAll('dialog.custom-modal').forEach((dialog) => {
    dialog.addEventListener('click', (e) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog = (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      );
      if (!isInDialog) {
        dialog.close();
      }
    });
  });

  // 5. Navigation Buttons
  const navActionMap = {
    home: () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      synth.playGentlePing();
    },
    memories: () => openModal('memories-modal'),
    'why-sorry': () => openModal('why-sorry-modal'),
    promise: () => openModal('promise-modal'),
    'for-you': () => openModal('for-you-modal')
  };

  document.querySelectorAll('#main-nav .nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-action');
      if (navActionMap[action]) {
        navActionMap[action]();
      }
    });
  });

  const menuDotsTrigger = document.getElementById('menu-dots-trigger');
  if (menuDotsTrigger) {
    menuDotsTrigger.addEventListener('click', () => {
      openModal('memories-modal');
    });
  }

  // 6. Full Note Button
  const openFullNoteBtn = document.getElementById('open-full-note-btn');
  if (openFullNoteBtn) {
    openFullNoteBtn.addEventListener('click', () => {
      openModal('full-note-modal');
    });
  }

  const letterForgiveTrigger = document.getElementById('letter-forgive-trigger');
  if (letterForgiveTrigger) {
    letterForgiveTrigger.addEventListener('click', () => {
      closeModal('full-note-modal');
      triggerForgiveness();
    });
  }

  // 7. Forgiveness Actions
  const forgiveBtn = document.getElementById('forgive-btn');
  const needTimeBtn = document.getElementById('need-time-btn');

  const triggerForgiveness = () => {
    synth.playChime([523.25, 659.25, 783.99, 1046.5, 1318.5], 1.2);

    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#8A68AC', '#9B72CF', '#B89FD8', '#E6DEF5', '#FFFFFF', '#F59E0B']
    });

    setTimeout(() => {
      confetti({
        particleCount: 75,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#8A68AC', '#E6DEF5', '#F59E0B']
      });
      confetti({
        particleCount: 75,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#9B72CF', '#FFFFFF', '#B89FD8']
      });
    }, 250);

    if (petalsSystem) {
      petalsSystem.burst(45);
    }

    openModal('forgive-modal');
  };

  if (forgiveBtn) {
    forgiveBtn.addEventListener('click', triggerForgiveness);
  }

  // 8. Runaway "Need More Time ⏳" Button (No Message, Smooth Dart Away)
  if (needTimeBtn) {
    let currentX = 0;
    let currentY = 0;

    const runAway = (e) => {
      const rect = needTimeBtn.getBoundingClientRect();
      const btnCenterX = rect.left + rect.width / 2;
      const btnCenterY = rect.top + rect.height / 2;

      let clientX = btnCenterX;
      let clientY = btnCenterY;

      if (e) {
        if (e.touches && e.touches.length > 0) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
        } else if (typeof e.clientX === 'number') {
          clientX = e.clientX;
          clientY = e.clientY;
        }
      }

      let dirX = btnCenterX - clientX;
      let dirY = btnCenterY - clientY;

      if (Math.abs(dirX) < 10 && Math.abs(dirY) < 10) {
        const randomAngle = Math.random() * Math.PI * 2;
        dirX = Math.cos(randomAngle);
        dirY = Math.sin(randomAngle);
      }

      const dist = Math.hypot(dirX, dirY) || 1;
      const normX = dirX / dist;
      const normY = dirY / dist;

      const jump = 110 + Math.random() * 70;
      let nextX = currentX + normX * jump + (Math.random() - 0.5) * 40;
      let nextY = currentY + normY * jump + (Math.random() - 0.5) * 35;

      const card = document.getElementById('apology-card');
      if (card) {
        const cardRect = card.getBoundingClientRect();
        const baseLeft = rect.left - currentX;
        const baseTop = rect.top - currentY;
        const baseRight = rect.right - currentX;
        const baseBottom = rect.bottom - currentY;

        const minX = cardRect.left + 24 - baseLeft;
        const maxX = cardRect.right - 24 - baseRight;
        const minY = cardRect.top + 24 - baseTop;
        const maxY = cardRect.bottom - 24 - baseBottom;

        if (nextX < minX || nextX > maxX) {
          nextX = -nextX * 0.75;
        }
        if (nextY < minY || nextY > maxY) {
          nextY = -nextY * 0.75;
        }

        nextX = Math.max(minX, Math.min(maxX, nextX));
        nextY = Math.max(minY, Math.min(maxY, nextY));
      }

      currentX = nextX;
      currentY = nextY;

      needTimeBtn.style.transform = `translate(${currentX}px, ${currentY}px)`;
      synth.playGentlePing();
    };

    needTimeBtn.addEventListener('mouseenter', (e) => runAway(e));
    needTimeBtn.addEventListener('pointerenter', (e) => runAway(e));

    window.addEventListener('mousemove', (e) => {
      const rect = needTimeBtn.getBoundingClientRect();
      const btnCenterX = rect.left + rect.width / 2;
      const btnCenterY = rect.top + rect.height / 2;
      const dist = Math.hypot(e.clientX - btnCenterX, e.clientY - btnCenterY);

      if (dist < 65) {
        runAway(e);
      }
    });

    needTimeBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      runAway(e.touches[0]);
    }, { passive: false });

    needTimeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      runAway(e);
    });
  }

  // 9. Interactive Elements in Modals
  const secretCards = document.querySelectorAll('.secret-petal-card');
  const revealedBox = document.getElementById('revealed-note-box');
  secretCards.forEach((card) => {
    card.addEventListener('click', () => {
      secretCards.forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
      const note = card.getAttribute('data-note');
      if (revealedBox && note) {
        revealedBox.innerHTML = `<p>“${note}”</p>`;
        synth.playGentlePing();
      }
    });
  });

  document.querySelectorAll('.vow-card').forEach((vow) => {
    vow.addEventListener('click', () => {
      synth.playGentlePing();
      vow.style.transform = 'scale(1.02)';
      setTimeout(() => {
        vow.style.transform = '';
      }, 200);
    });
  });
});
