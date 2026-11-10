
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

import {
  GLTFLoader
} from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

// ==========================================
// PAWPLAN - 3D DRAGON EVOLUTION SYSTEM
// ==========================================

const MODEL_PATHS = {
  egg: './models/egg.glb',
  baby: './models/baby.glb'
};

const STAGE_ORDER = ['egg', 'baby'];

let scene;
let camera;
let renderer;
let clock;
let loader;

let currentModel = null;
let currentStage = null;
let loadingStage = null;

let babyHeadBone = null;
let babyTailBone = null;

let babyHeadBaseRotation = null;
let babyTailBaseRotation = null;

let initialized = false;
let pendingStage = 'egg';

let mouseX = 0;
let mouseY = 0;

let resizeObserver;

// ==========================================
// INITIALISE THE 3D SCENE
// ==========================================

function initDragon3D() {
  const container = document.getElementById('dragon3DScene');

  if (
    !container ||
    initialized ||
    container.classList.contains('hidden')
  ) {
    return;
  }

  const width = container.clientWidth;
  const height = container.clientHeight;

  if (!width || !height) return;

  initialized = true;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    45,
    width / height,
    0.1,
    100
  );

  camera.position.set(0, 2.5, 7);
  camera.lookAt(0, 3.5, 0);

  renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true
  });

  renderer.setClearColor(0x000000, 0);

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, 2)
  );

  renderer.setSize(width, height);

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  container.appendChild(renderer.domElement);

  // Lighting
  scene.add(
    new THREE.HemisphereLight(
      0xffd6c2,
      0x280812,
      2
    )
  );

  const mainLight = new THREE.DirectionalLight(
    0xff6655,
    4
  );

  mainLight.position.set(3, 6, 4);
  scene.add(mainLight);

  const redLight = new THREE.PointLight(
    0xff182e,
    25,
    8
  );

  redLight.position.set(-2, 1, 2);
  scene.add(redLight);

  loader = new GLTFLoader();
  clock = new THREE.Clock();

  // Mouse tracking
  container.addEventListener('pointermove', event => {
    const rect = container.getBoundingClientRect();

    mouseX = Math.max(
      -1,
      Math.min(
        1,
        ((event.clientX - rect.left) / rect.width - 0.5) * 2
      )
    );

    mouseY = Math.max(
      -1,
      Math.min(
        1,
        ((event.clientY - rect.top) / rect.height - 0.5) * 2
      )
    );
  });

  // Resize handling
  resizeObserver = new ResizeObserver(() => {
    const w = container.clientWidth;
    const h = container.clientHeight;

    if (!w || !h) return;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    renderer.setSize(w, h);
  });

  resizeObserver.observe(container);

  loadDragonStage(pendingStage);

  animate();
}

// ==========================================
// LOAD AND SWITCH DRAGON MODELS
// ==========================================

function loadDragonStage(stage) {

  if (!MODEL_PATHS[stage]) {
    console.error('Unknown dragon stage:', stage);
    return;
  }

  if (!loader || !scene) {
    pendingStage = stage;
    return;
  }

  if (stage === currentStage && currentModel) {
    return;
  }

  if (loadingStage === stage) {
    return;
  }

  loadingStage = stage;

  console.log('Loading PawPlan dragon:', stage);

  loader.load(
    MODEL_PATHS[stage],

    gltf => {

      // Ignore outdated loading requests
      if (loadingStage !== stage) {
        disposeModel(gltf.scene);
        return;
      }

      const newModel = gltf.scene;

      // ======================================
      // MODEL SIZE AND POSITION
      // ======================================

      const bounds = new THREE.Box3().setFromObject(newModel);

      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());

      const maxDimension = Math.max(
        size.x,
        size.y,
        size.z
      );

      const baseScale = 2.2 / (maxDimension || 1);

      // Separate sizes for each stage
      const sizeMultiplier =
        stage === 'egg' ? 1.7 : 0.9;

      const scale = baseScale * sizeMultiplier;

      newModel.scale.setScalar(scale);

      newModel.position.set(
        -center.x * scale,
        -bounds.min.y * scale,
        -center.z * scale
      );

      // ======================================
      // EGG APPEARANCE
      // ======================================

      if (stage === 'egg') {

        newModel.traverse(child => {

          if (!child.isMesh) return;

          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];

          materials.forEach(material => {

            const materialName =
              (material.name || '').toLowerCase();

            if (
              materialName.includes('black') ||
              materialName.includes('dark')
            ) {
              material.color.set('#080808');
            } else {
              material.color.set('#8B0000');
            }

            material.roughness = 0.85;
            material.metalness = 0.15;
            material.needsUpdate = true;
          });

          child.castShadow = true;
          child.receiveShadow = true;
        });

      } else {

        // Keep baby's original colours
        newModel.traverse(child => {

          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }

        });
      }

      // ======================================
      // FIND BABY HEAD AND TAIL BONES
      // ======================================

      babyHeadBone = null;
      babyTailBone = null;

      babyHeadBaseRotation = null;
      babyTailBaseRotation = null;

      if (stage === 'baby') {

        newModel.traverse(object => {

          if (!object.isBone) return;

          const boneName = object.name.toLowerCase();

          // Find head or neck bone
          if (
            !babyHeadBone &&
            (
              boneName.includes('head') ||
              boneName.includes('neck')
            )
          ) {
            babyHeadBone = object;
          }

          // Find tail bone
          if (
            !babyTailBone &&
            boneName.includes('tail')
          ) {
            babyTailBone = object;
          }

        });

        // Remember original bone rotations
        if (babyHeadBone) {
          babyHeadBaseRotation =
            babyHeadBone.rotation.clone();
        }

        if (babyTailBone) {
          babyTailBaseRotation =
            babyTailBone.rotation.clone();
        }

        console.log(
          'Baby head bone:',
          babyHeadBone?.name || 'Not found'
        );

        console.log(
          'Baby tail bone:',
          babyTailBone?.name || 'Not found'
        );
      }

      // ======================================
      // REMOVE PREVIOUS MODEL
      // ======================================

      if (currentModel) {
        scene.remove(currentModel);
        disposeModel(currentModel);
      }

      // ======================================
      // ADD NEW MODEL
      // ======================================

     currentModel = newModel;
currentStage = stage;

// Separate camera framing for each evolution stage
if (stage === 'egg') {
    camera.position.set(0, 2.5, 7);
    camera.lookAt(0, 1.2, 0);
} else if (stage === 'baby') {
    camera.position.set(0, 2.5, 7);
    camera.lookAt(0, 3.5, 0);
}

scene.add(currentModel);

      loadingStage = null;

      console.log(
        'PawPlan stage switched to:',
        stage
      );

      // Notify PawPlan
      window.dispatchEvent(
        new CustomEvent('dragonStageLoaded', {
          detail: { stage }
        })
      );

    },

    undefined,

    error => {

      if (loadingStage === stage) {
        loadingStage = null;
      }

      console.error(
        `Could not load ${MODEL_PATHS[stage]}`,
        error
      );

    }
  );
}

// ==========================================
// CLEAN UP OLD MODELS
// ==========================================

function disposeModel(model) {

  if (!model) return;

  model.traverse(object => {

    if (object.isMesh) {

      object.geometry?.dispose();

      if (Array.isArray(object.material)) {

        object.material.forEach(material => {
          material.dispose();
        });

      } else {

        object.material?.dispose();

      }
    }
  });
}

// ==========================================
// PUBLIC FUNCTION FOR script.js
// ==========================================

window.setDragonStage = function(stage) {

  let stageName = stage;

  if (typeof stage === 'number') {

    stageName = STAGE_ORDER[
      Math.max(0, Math.min(1, stage))
    ];

  }

  stageName = String(stageName).toLowerCase();

  if (!MODEL_PATHS[stageName]) {
    console.error('Invalid dragon stage:', stage);
    return;
  }

  pendingStage = stageName;

  if (!initialized) {
    initDragon3D();
    return;
  }

  loadDragonStage(stageName);
};

// ==========================================
// ANIMATION LOOP
// ==========================================

function animate() {

  requestAnimationFrame(animate);

  if (!renderer || !scene || !camera) return;

  const t = clock.getElapsedTime();

  if (currentModel) {

    // ======================================
    // EGG ANIMATION
    // ======================================

    if (currentStage === 'egg') {

      // Gentle floating
      currentModel.position.y =
        Math.sin(t * 2) * 0.06;

      // Slow continuous rotation
      currentModel.rotation.y += 0.003;

      // Gentle rocking
      currentModel.rotation.z =
        Math.sin(t * 1.2) * 0.015;

    }

    // ======================================
    // BABY DRAGON ANIMATION
    // ======================================

    else if (currentStage === 'baby') {

// Gentle side-to-side body sway
currentModel.rotation.y = Math.sin(t * 1.2) * 0.04;

      // Head follows mouse direction
      if (babyHeadBone && babyHeadBaseRotation) {

        const targetHeadY =
  babyHeadBaseRotation.y + mouseX * 0.35;

  babyHeadBone.rotation.y +=
  (targetHeadY - babyHeadBone.rotation.y) * 0.05;

babyHeadBone.rotation.x =
  babyHeadBaseRotation.x;

      }

      // Tail gently sways
      if (babyTailBone && babyTailBaseRotation) {

        babyTailBone.rotation.y =
          babyTailBaseRotation.y +
          Math.sin(t * 1.5) * 0.12;

      }

    }

  }

  renderer.render(scene, camera);
}

// ==========================================
// INITIALISE WHEN PANEL BECOMES VISIBLE
// ==========================================

function watchForVisibleDragon() {

  const container =
    document.getElementById('dragon3DScene');

  if (!container) return;

  if (
    !container.classList.contains('hidden') &&
    container.clientWidth > 0 &&
    container.clientHeight > 0
  ) {
    initDragon3D();
  }
}

function setupDragonObserver() {

  const container =
    document.getElementById('dragon3DScene');

  if (!container) return;

  const observer = new MutationObserver(
    watchForVisibleDragon
  );

  observer.observe(container, {
    attributes: true,
    attributeFilter: ['class']
  });

  watchForVisibleDragon();
}

if (document.readyState === 'loading') {

  document.addEventListener(
    'DOMContentLoaded',
    setupDragonObserver
  );

} else {

  setupDragonObserver();

}
