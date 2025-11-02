import './style.scss'
import * as THREE from 'three';
import { OrbitControls } from './utils/OrbitControls.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { inject } from '@vercel/analytics';

// Initialize Vercel Analytics
inject();

const canvas = document.querySelector("#experience-canvas");
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
};

const zAxisLantern = []; // array to hold Lantern meshes on the Z axis

const raycasterObject = [];

// Track currently hovered object for scale animation
let hoveredObject = null;

// Day/Night theme state
let isNightMode = false;
let isFading = false; // guard to avoid re-entrancy during fade
const meshesWithTextures = []; // Store meshes that need texture updates

// Lantern wiggle intensity control
let lanternWiggleIntensity = 2.0; // Default 200%

const raycaster = new THREE.Raycaster();
// Increase threshold for larger detection area
raycaster.params.Points.threshold = 0.5;
raycaster.params.Line.threshold = 0.5;
const pointer = new THREE.Vector2();

/////////////////////////////LOADING MANAGER///////////////////////////////////////////////
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const loadingItem = document.getElementById('loading-item');
const loadingScreen = document.getElementById('loading-screen');

const loadingManager = new THREE.LoadingManager();

loadingManager.onStart = function(url, itemsLoaded, itemsTotal) {
  loadingItem.textContent = 'Loading assets...';
};

loadingManager.onProgress = function(url, itemsLoaded, itemsTotal) {
  const progress = (itemsLoaded / itemsTotal) * 100;
  progressBar.style.width = progress + '%';
  progressText.textContent = Math.round(progress) + '%';
  
  // Show what's loading
  if (url.includes('texture')) {
    loadingItem.textContent = 'Loading textures...';
  } else if (url.includes('.glb') || url.includes('.gltf')) {
    loadingItem.textContent = 'Loading 3D model...';
  } else if (url.includes('draco')) {
    loadingItem.textContent = 'Loading decoder...';
  }
};

loadingManager.onLoad = function() {
  progressBar.style.width = '100%';
  progressText.textContent = '100%';
  loadingItem.textContent = 'Complete!';
  
  // Fade out loading screen after a short delay
  setTimeout(() => {
    loadingScreen.classList.add('fade-out');
    
    // Remove from DOM after fade completes
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 500);
  }, 500);
};

loadingManager.onError = function(url) {
  loadingItem.textContent = 'Error loading: ' + url;
  console.error('Error loading:', url);
};

/////////////////////////////LOADERS///////////////////////////////////////////////
const textureLoader = new THREE.TextureLoader(loadingManager);

/////////////////////////////MODEL LOADER////////////////////////////////////////
const dracoLoader = new DRACOLoader(loadingManager);
dracoLoader.setDecoderPath( '/draco/' );

const loader = new GLTFLoader(loadingManager);
loader.setDRACOLoader( dracoLoader );

const textureMap = {
  First:{
    day:'./textures/day/First_texture_set_Day_v02.webp',
    night:'./textures/night/First_texture_set_Night.webp',
  },
  Second:{
    day:'/textures/day/Second_texture_set_Day.webp',
    night:'/textures/night/Second_texture_set_Night.webp',
  },
  BG:{
    day:'/textures/day/BG_texture_set_Day.webp',
    night:'/textures/night/BG_texture_set_Night.webp',
  },
  LOGO:{
    day:'/textures/day/LOGO_texture_set_Day.webp',
    night:'/textures/night/LOGO_texture_set_Night.webp',
  },
};

const loadedTextures = {
  day:{},
  night:{},
};

Object.entries(textureMap).forEach(([key, paths])=>{
  const dayTexture = textureLoader.load(paths.day);
  loadedTextures.day[key] = dayTexture;
  dayTexture.flipY = false;
  dayTexture.colorSpace = THREE.SRGBColorSpace;
  
  const nightTexture = textureLoader.load(paths.night);
  loadedTextures.night[key] = nightTexture;
  nightTexture.flipY = false;
  nightTexture.colorSpace = THREE.SRGBColorSpace;
});

window.addEventListener("mousemove", (e) => {
  // Calculate normalized mouse coordinates (-1 to 1)
  pointer.x = ( e.clientX / window.innerWidth ) * 2 - 1;
  pointer.y = - ( e.clientY / window.innerHeight ) * 2 + 1;
});

// Touch support for mobile
window.addEventListener("touchmove", (e) => {
  if (e.touches.length > 0) {
    pointer.x = ( e.touches[0].clientX / window.innerWidth ) * 2 - 1;
    pointer.y = - ( e.touches[0].clientY / window.innerHeight ) * 2 + 1;
  }
});

// Button click handler
window.addEventListener("click", (e) => {
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(raycasterObject);
  
  if (intersects.length > 0) {
    const clickedObject = intersects[0].object;
    
    // Handle different button clicks
    if (clickedObject.name.includes('YT_Target_Raycaster')) {
      window.open('https://www.youtube.com/@laviestudio', '_blank');
    } else if (clickedObject.name.includes('IG_Target_Raycaster')) {
      window.open('https://www.instagram.com/laviecg/', '_blank');
    } else if (clickedObject.name.includes('Art_Target_Raycaster')) {
      window.open('https://vimeo.com/1117616691', '_blank');
    } else if (clickedObject.name.includes('AboutMe_Target_Raycaster')) {
      // Show About Me modal/overlay
      showAboutMe();
    }
  }
});

// Touch click handler for mobile
window.addEventListener("touchend", (e) => {
  if (e.changedTouches.length > 0) {
    // Update pointer position from touch
    pointer.x = ( e.changedTouches[0].clientX / window.innerWidth ) * 2 - 1;
    pointer.y = - ( e.changedTouches[0].clientY / window.innerHeight ) * 2 + 1;
    
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(raycasterObject);
    
    if (intersects.length > 0) {
      const clickedObject = intersects[0].object;
      
      // Handle different button clicks
      if (clickedObject.name.includes('YT_Target_Raycaster')) {
        window.open('https://www.youtube.com/@laviestudio', '_blank');
      } else if (clickedObject.name.includes('IG_Target_Raycaster')) {
        window.open('https://www.instagram.com/laviecg/', '_blank');
      } else if (clickedObject.name.includes('Art_Target_Raycaster')) {
        window.open('https://vimeo.com/1117616691', '_blank');
      } else if (clickedObject.name.includes('AboutMe_Target_Raycaster')) {
        // Show About Me modal/overlay
        showAboutMe();
      }
    }
  }
});

// About Me modal function
function showAboutMe() {
  // Create modal overlay
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    backdrop-filter: blur(5px);
  `;
  
  // Create modal content
  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    padding: 40px;
    border-radius: 20px;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    position: relative;
  `;
  
  content.innerHTML = `
    <button style="
      position: absolute;
      top: 15px;
      right: 15px;
      background: none;
      border: none;
      font-size: 30px;
      cursor: pointer;
      color: #666;
      line-height: 1;
    " onclick="this.parentElement.parentElement.remove()">×</button>
    
    <h2 style="margin-top: 0; color: #333; font-family: Arial, sans-serif;">About Me</h2>
    
    <p style="color: #666; line-height: 1.6; font-family: Arial, sans-serif;">
      Hi! I'm Kirk, a passionate 3D artist and creative developer specializing in stunning visual experiences. 
      With expertise in Blender, Three.js, and web technologies, I create immersive digital art that bridges 
      the gap between traditional art and modern technology.
    </p>
    
    <p style="color: #666; line-height: 1.6; font-family: Arial, sans-serif;">
      My work focuses on combining technical precision with artistic vision to deliver unique and engaging 
      experiences. From 3D modeling to interactive web experiences, I'm constantly exploring new ways to 
      push creative boundaries.
    </p>
    
    <p style="color: #666; line-height: 1.6; font-family: Arial, sans-serif;">
      Feel free to check out my work on YouTube, Instagram, and Vimeo!
    </p>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}



/////////////////////////////SCENE, CAMERA, RENDERER////////////////////////////////////////
loader.load(
  './models/temple_test_Draco_v20.glb', 
  (glb) => {
    glb.scene.traverse((child) => {
      if (child.isMesh) {
        // Handle textures
        Object.keys(textureMap).forEach((key) => {
          if (child.name.includes(key)) {
            const material = new THREE.MeshBasicMaterial({
            //const material = new THREE.MeshStandardMaterial({
              map: loadedTextures.day[key],
            });

            child.material = material;
            
            // Store mesh and its texture key for day/night switching
            child.userData.textureKey = key;
            meshesWithTextures.push(child);

            if (child.material && child.material.map) {
              child.material.map.minFilter = THREE.LinearMipmapLinearFilter;
            }
          }
        });
        
        // Apply LOGO texture to YT, IG, Art, and AboutMe buttons
        if (child.name.includes('YT_Target_Raycaster') || 
            child.name.includes('IG_Target_Raycaster') || 
            child.name.includes('Art_Target_Raycaster') ||
            child.name.includes('AboutMe_Target_Raycaster')) {
          
          const material = new THREE.MeshBasicMaterial({
            map: loadedTextures.day['LOGO'],
          });
          
          child.material = material;
          child.userData.textureKey = 'LOGO';
          
          // Add to meshesWithTextures if not already added
          if (!meshesWithTextures.includes(child)) {
            meshesWithTextures.push(child);
          }
          
          if (child.material && child.material.map) {
            child.material.map.minFilter = THREE.LinearMipmapLinearFilter;
          }
          
          // Set initial scale for intro animation (0.3 = 30% size)
          child.scale.set(2, 2, 2);
          child.userData.originalScale = 1; // Store original scale
          child.userData.introAnimating = true;
          
          console.log('✅ Applied LOGO texture to:', child.name);
        }
        
        // Apply First texture to lanterns
        if (child.name.includes('Temple_Lantern')) {
          const material = new THREE.MeshBasicMaterial({
            map: loadedTextures.day['First'],
          });
          
          child.material = material;
          child.userData.textureKey = 'First';
          
          // Add to meshesWithTextures if not already added
          if (!meshesWithTextures.includes(child)) {
            meshesWithTextures.push(child);
          }
          
          if (child.material && child.material.map) {
            child.material.map.minFilter = THREE.LinearMipmapLinearFilter;
          }
          
          console.log('✅ Applied First texture to lantern:', child.name);
        }

        // Handle raycaster objects (add to raycasterObject array)
        if (child.name.includes('Raycaster')) {
          raycasterObject.push(child);
        }

        // Handle lanterns for rotation animation (all lanterns)
        if (child.name.includes('Temple_Lantern')) {
          zAxisLantern.push(child);
        }
      }
    });
    
    // Add the scene after traversal is complete
    scene.add(glb.scene);
    console.log('Total lanterns found:', zAxisLantern.length);
    
    // Start intro animation after model loads
    setTimeout(() => {
      playIntroAnimation();
    }, 100);
  },
  (progress) => {
    console.log('Loading model...', (progress.loaded / progress.total * 100) + '%');
  },
  (error) => {
    console.error('Error loading model:', error);
  }
);

// Intro animation function
function playIntroAnimation() {
  raycasterObject.forEach((obj) => {
    if (obj.name.includes('Target_Raycaster') && !obj.name.includes('Lantern') && obj.userData.introAnimating) {
      // Get initial scale (e.g., 3.3) and target scale (1.0)
      const initialScale = obj.scale.x; // Current scale (3.3)
      const targetScale = obj.userData.originalScale; // Target scale (1.0)
      const startTime = Date.now();
      const duration = 1000; // 1 second
      
      function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Smooth ease-out cubic for natural deceleration
        const easeOutCubic = (x) => {
          return 1 - Math.pow(1 - x, 3);
        };
        
        const easedProgress = easeOutCubic(progress);
        const scale = initialScale + (targetScale - initialScale) * easedProgress;
        obj.scale.set(scale, scale, scale);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          obj.scale.set(targetScale, targetScale, targetScale);
          obj.userData.introAnimating = false;
        }
      }
      
      animate();
    }
  });
  console.log("✨ Intro animation started");
}

const scene = new THREE.Scene();

/////////////////////////////CHERRY BLOSSOM PARTICLES////////////////////////////////
// Petal control variables
let petalWindStrength = 0.03; // Default wind strength (30%)
let petalOpacity = 0.6; // Default opacity (60%)
let petalAmount = 1000; // Default amount
let petalWindDirection = 2; // 2 = forward (default), 3 = backward

// Create cherry blossom petal geometry
const petalCount = 2000; // Max count, actual visible controlled by petalAmount
const petalGeometry = new THREE.BufferGeometry();
const petalPositions = new Float32Array(petalCount * 3);
const petalVelocities = [];
const petalRotations = [];
const petalRotationSpeeds = [];

// Initialize petal positions and properties
for (let i = 0; i < petalCount; i++) {
  // Spread petals across the scene
  petalPositions[i * 3] = (Math.random() - 0.5) * 40; // X
  petalPositions[i * 3 + 1] = Math.random() * 15 + 5; // Y (start high)
  petalPositions[i * 3 + 2] = (Math.random() - 0.5) * 40; // Z
  
  // Random velocities for natural movement
  petalVelocities.push({
    x: (Math.random() - 0.5) * 0.02,
    y: -0.01 - Math.random() * 0.02, // Fall downward
    z: (Math.random() - 0.5) * 0.02
  });
  
  petalRotations.push(Math.random() * Math.PI * 2);
  petalRotationSpeeds.push((Math.random() - 0.5) * 0.02);
}

petalGeometry.setAttribute('position', new THREE.BufferAttribute(petalPositions, 3));

// Create petal texture (pink gradient circle)
const petalCanvas = document.createElement('canvas');
petalCanvas.width = 32;
petalCanvas.height = 32;
const petalCtx = petalCanvas.getContext('2d');

// Draw a soft pink petal shape
const gradient = petalCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
gradient.addColorStop(0, 'rgba(255, 182, 193, 1)'); // Light pink center
gradient.addColorStop(0.5, 'rgba(255, 192, 203, 0.8)');
gradient.addColorStop(1, 'rgba(255, 192, 203, 0)'); // Transparent edge

petalCtx.fillStyle = gradient;
petalCtx.fillRect(0, 0, 32, 32);

const petalTexture = new THREE.CanvasTexture(petalCanvas);

// Create material for petals
const petalMaterial = new THREE.PointsMaterial({
  size: 0.3,
  map: petalTexture,
  transparent: true,
  opacity: 0.15,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexColors: false
});

// Create the particle system
const cherryBlossomParticles = new THREE.Points(petalGeometry, petalMaterial);
scene.add(cherryBlossomParticles);

// Function to update petal positions
function updateCherryBlossoms() {
  const positions = petalGeometry.attributes.position.array;
  
  // Update material opacity
  petalMaterial.opacity = petalOpacity;
  
  for (let i = 0; i < petalCount; i++) {
    // Hide petals beyond the amount slider
    if (i >= petalAmount) {
      positions[i * 3 + 1] = -100; // Move off screen
      continue;
    }
    
    // Calculate wind direction vector
    let windX = 0, windZ = 0;
    switch(petalWindDirection) {
      case 0: windX = petalWindStrength; break; // Right
      case 1: windX = -petalWindStrength; break; // Left
      case 2: windZ = petalWindStrength; break; // Forward
      case 3: windZ = -petalWindStrength; break; // Backward
    }
    
    // Update position with wind
    positions[i * 3] += petalVelocities[i].x + windX; // X
    positions[i * 3 + 1] += petalVelocities[i].y; // Y falling
    positions[i * 3 + 2] += petalVelocities[i].z + windZ; // Z
    
    // Add slight swaying motion
    positions[i * 3] += Math.sin(Date.now() * 0.001 + i) * 0.003;
    positions[i * 3 + 2] += Math.cos(Date.now() * 0.001 + i) * 0.005;
    
    // Reset petals that fall too low or drift too far
    if (positions[i * 3 + 1] < -2 || 
        Math.abs(positions[i * 3]) > 35 || 
        Math.abs(positions[i * 3 + 2]) > 35) {
      positions[i * 3 + 1] = 20 + Math.random() * 5;
      
      // Spawn on opposite side of wind direction
      if (petalWindDirection === 0) positions[i * 3] = -30 + Math.random() * 5; // Right wind
      else if (petalWindDirection === 1) positions[i * 3] = 30 - Math.random() * 5; // Left wind
      else if (petalWindDirection === 2) positions[i * 3 + 2] = -30 + Math.random() * 5; // Forward wind
      else if (petalWindDirection === 3) positions[i * 3 + 2] = 30 - Math.random() * 5; // Backward wind
      
      if (petalWindDirection === 0 || petalWindDirection === 1) {
        positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
      } else {
        positions[i * 3] = (Math.random() - 0.5) * 40;
      }
    }
    
    // Keep petals within bounds
    if (Math.abs(positions[i * 3]) > 40) {
      petalVelocities[i].x *= -1;
    }
    if (Math.abs(positions[i * 3 + 2]) > 40) {
      petalVelocities[i].z *= -1;
    }
  }
  
  petalGeometry.attributes.position.needsUpdate = true;
}

const camera = new THREE.PerspectiveCamera( 
  25, 
  sizes.width / sizes.height, 
  0.1, 
  1000 );
  camera.position.set(12.5, 4.45, 3.75);




const renderer = new THREE.WebGLRenderer({
  canvas: canvas, 
  antialias: true,
  powerPreference: "high-performance",
  stencil: false,
  depth: true
});
renderer.setSize( sizes.width, sizes.height );
renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = .5; // Adjust this value to control brightness (higher = brighter)

/////////////////////////////POST-PROCESSING (DEPTH OF FIELD)////////////////////////////////
// Create composer for post-processing effects with higher quality multisampling
const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Add render pass (renders the actual scene)
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Add Bokeh (depth of field) pass
const bokehPass = new BokehPass(scene, camera, {
  focus: 12.5,      // Distance to focus point (default)
  aperture: 0.00075,  // Aperture size for blur intensity (7.5 * 0.0001)
  maxblur: 0.02     // Maximum blur amount
});
composer.addPass(bokehPass);

// Custom color correction shader for contrast and saturation
const ColorCorrectionShader = {
  uniforms: {
    'tDiffuse': { value: null },
    'contrast': { value: 1.0 },    // Contrast adjustment (1.0 = normal, higher = more contrast)
    'saturation': { value: 1.25 },   // Saturation adjustment (1.0 = normal, higher = more vivid)
    'brightness': { value: 1.0 }    // Brightness adjustment (1.0 = normal)
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float contrast;
    uniform float saturation;
    uniform float brightness;
    varying vec2 vUv;
    
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      
      // Apply brightness
      color.rgb *= brightness;
      
      // Apply contrast
      color.rgb = (color.rgb - 0.5) * contrast + 0.5;
      
      // Apply saturation
      vec3 gray = vec3(dot(color.rgb, vec3(0.299, 0.587, 0.114)));
      color.rgb = mix(gray, color.rgb, saturation);
      
      gl_FragColor = color;
    }
  `
};

// Add color correction pass
const colorCorrectionPass = new ShaderPass(ColorCorrectionShader);
composer.addPass(colorCorrectionPass);

// Add output pass to apply tone mapping and color space conversion
const outputPass = new OutputPass();
composer.addPass(outputPass);

// Depth of field control variables
let dofEnabled = true;
let dofFocus = 12.5;
let dofAperture = 0.00075; // 7.5 * 0.0001
let dofBlur = 0.02;

// Function to update depth of field
function updateDepthOfField() {
  bokehPass.uniforms['focus'].value = dofFocus;
  bokehPass.uniforms['aperture'].value = dofEnabled ? dofAperture : 0.00001;
  bokehPass.uniforms['maxblur'].value = dofBlur;
}

/////////////////////////////FOG SETUP////////////////////////////////
// Fog colors for day and night
const fogColors = {
  day: new THREE.Color(0xffd89b), // Golden/warm haze
  night: new THREE.Color(0x2c3e50) // Cool blue mist
};

// Current fog color (can be customized)
let currentFogColor = new THREE.Color(0xffd89b);

// Initial fog setup (day mode)
let fogEnabled = true;
let fogDensity = 0.01; // Default fog density (10%)
scene.fog = new THREE.FogExp2(currentFogColor, fogDensity);

// Function to update fog
function updateFog() {
  if (fogEnabled) {
    scene.fog = new THREE.FogExp2(currentFogColor, fogDensity);
  } else {
    scene.fog = null;
  }
}

// Function to update fog color
function updateFogColor(hexColor) {
  currentFogColor.set(hexColor);
  if (fogEnabled && scene.fog) {
    scene.fog.color.copy(currentFogColor);
  }
}


const geometry = new THREE.BoxGeometry( 1, 1, 1 );
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
//const cube = new THREE.Mesh( geometry, material );
//scene.add( cube );

const controls = new OrbitControls( camera, renderer.domElement );

controls.enableDamping = true; 
controls.dampingFactor = 0.05;

controls.minDistance = 12;
controls.maxDistance = 22;
controls.minPolarAngle = 0.74;
controls.maxPolarAngle = Math.PI / 2.2;
controls.minAzimuthAngle = 0;
controls.maxAzimuthAngle = Math.PI / 1;

controls.update();
controls.target.set(1.03, 1.69, 0.29);


/////////////////////////////EVENT LISTENERS////////////////////////////////////////
window.addEventListener('resize', () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  // Update composer with pixel ratio for consistent quality
  composer.setSize(sizes.width, sizes.height);
  composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

//function animate() {}

const render = () => {
  controls.update();

  console.log(camera.position);
  console.log("000000000000000");
  console.log(controls.target);

  // Update cherry blossom petals
  updateCherryBlossoms();

  // Animate Lanterns - Wind sway effect (controlled by slider)
  const time = Date.now() * 0.0025; // Convert to seconds
  zAxisLantern.forEach((Lantern, index) => {
    // Create a gentle swaying motion like wind
    // Each lantern has a slight offset for more natural movement
    const offset = index * 2.5;
    Lantern.rotation.z = Math.sin(time + offset) * 0.25 * lanternWiggleIntensity; // Sway back and forth
    Lantern.rotation.x = Math.sin(time * 0.7 + offset) * 0.1 * lanternWiggleIntensity; // Slight tilt
  });


  raycaster.setFromCamera( pointer, camera );

	// calculate objects intersecting the picking ray
	const intersects = raycaster.intersectObjects( raycasterObject );

  // Smoothly scale all buttons back to normal (exclude lanterns)
  raycasterObject.forEach(obj => {
    if (obj.name.includes('Target_Raycaster') && !obj.name.includes('Lantern')) {
      obj.scale.x += (1 - obj.scale.x) * 0.15;
      obj.scale.y += (1 - obj.scale.y) * 0.15;
      obj.scale.z += (1 - obj.scale.z) * 0.15;
    }
  });

  // Handle current intersections
	if (intersects.length > 0) {
    const currentObject = intersects[0].object;
    
    // Only scale buttons (not lanterns)
    if (currentObject.name.includes('Target_Raycaster') && !currentObject.name.includes('Lantern')) {
      // Smoothly scale up the button
      currentObject.scale.x += (1.3 - currentObject.scale.x) * 0.15;
      currentObject.scale.y += (1.3 - currentObject.scale.y) * 0.15;
      currentObject.scale.z += (1.3 - currentObject.scale.z) * 0.15;
      
      // Play hover sound when hovering over a new button
      if (hoveredObject !== currentObject) {
        play3DButtonHoverSound();
      }
      
      hoveredObject = currentObject;
    }
    
    document.body.style.cursor = 'pointer';
  } else {
    hoveredObject = null;
    document.body.style.cursor = 'default';
  }

  // Use composer for post-processing instead of direct render
  composer.render();
  
  window.requestAnimationFrame(render);
};

render();

/////////////////////////////DAY/NIGHT TOGGLE (with subtle fade) ////////////////////////////////
const themeToggle = document.getElementById('theme-toggle');

// Create a subtle fade overlay (only goes to 30% opacity)
const fadeOverlay = document.createElement('div');
fadeOverlay.style.position = 'fixed';
fadeOverlay.style.left = '0';
fadeOverlay.style.top = '0';
fadeOverlay.style.width = '100%';
fadeOverlay.style.height = '100%';
fadeOverlay.style.background = '#000';
fadeOverlay.style.opacity = '0';
fadeOverlay.style.pointerEvents = 'none';
fadeOverlay.style.zIndex = '999';
fadeOverlay.style.transition = 'opacity 0.2s ease-in-out';
document.body.appendChild(fadeOverlay);

function swapTexturesForMode(nightMode) {
  // Update all meshes with textures instantly
  meshesWithTextures.forEach(mesh => {
    const textureKey = mesh.userData.textureKey;
    if (textureKey) {
      const newTexture = nightMode ? loadedTextures.night[textureKey] : loadedTextures.day[textureKey];
      mesh.material.map = newTexture;
      mesh.material.needsUpdate = true;
    }
  });
}

function toggleDayNight() {
  if (isFading) return;
  isFading = true;

  // Update state
  isNightMode = !isNightMode;

  // Smoother fade: fade to 60% black over 400ms, swap at peak, fade back
  fadeOverlay.style.transition = 'opacity 0.4s ease-in-out';
  fadeOverlay.style.opacity = '0.6';
  
  setTimeout(() => {
    swapTexturesForMode(isNightMode);
    
    // Update fog color to day/night preset
    currentFogColor.copy(isNightMode ? fogColors.night : fogColors.day);
    updateFog(); // Update fog with new color
    
    // Update the color picker to match current fog color
    const fogColorPicker = document.getElementById('fog-color-picker');
    if (fogColorPicker) {
      fogColorPicker.value = '#' + currentFogColor.getHexString();
    }
    
    updateAmbientSound(); // Switch ambient sounds based on day/night mode
    fadeOverlay.style.opacity = '0';
    
    setTimeout(() => {
      isFading = false;
      console.log(`Switched to ${isNightMode ? 'night' : 'day'} mode`);
    }, 400);
  }, 400);
}

// Day/Night slider control
const dayNightSlider = document.getElementById('day-night-slider');
let lastSliderState = 0; // 0 = day, 1 = night

dayNightSlider.addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  
  // Trigger transition at 0.6 (more towards night side) for smoother feel
  const currentState = value > 0.6 ? 1 : 0;
  
  // Only trigger transition when crossing the threshold
  if (currentState !== lastSliderState) {
    lastSliderState = currentState;
    toggleDayNight();
  }
});

/////////////////////////////LANTERN WIGGLE SLIDER////////////////////////////////
const wiggleSlider = document.getElementById('wiggle-slider');
const wiggleValue = document.getElementById('wiggle-value');

wiggleSlider.addEventListener('input', (e) => {
  lanternWiggleIntensity = parseFloat(e.target.value);
  const percentage = Math.round(lanternWiggleIntensity * 100);
  wiggleValue.textContent = `Intensity: ${percentage}%`;
});

/////////////////////////////FOG CONTROLS////////////////////////////////
const fogToggleBtn = document.getElementById('fog-toggle');
const fogSlider = document.getElementById('fog-slider');
const fogValue = document.getElementById('fog-value');
const fogColorPicker = document.getElementById('fog-color-picker');

// Fog toggle button
fogToggleBtn.addEventListener('click', () => {
  fogEnabled = !fogEnabled;
  fogToggleBtn.textContent = fogEnabled ? 'ON' : 'OFF';
  fogToggleBtn.style.background = fogEnabled 
    ? 'rgba(255, 255, 255, 0.2)' 
    : 'rgba(255, 0, 0, 0.3)';
  updateFog();
});

// Fog density slider
fogSlider.addEventListener('input', (e) => {
  fogDensity = parseFloat(e.target.value);
  const percentage = Math.round((fogDensity / 0.1) * 100);
  fogValue.textContent = `Density: ${percentage}%`;
  updateFog();
});

// Fog color picker
fogColorPicker.addEventListener('input', (e) => {
  updateFogColor(e.target.value);
});

/////////////////////////////CHERRY BLOSSOM CONTROLS////////////////////////////////
const petalWindStrengthSlider = document.getElementById('petal-wind-strength');
const windStrengthValue = document.getElementById('wind-strength-value');
const petalOpacitySlider = document.getElementById('petal-opacity');
const petalOpacityValue = document.getElementById('petal-opacity-value');
const petalAmountSlider = document.getElementById('petal-amount');
const petalAmountValue = document.getElementById('petal-amount-value');
const windDirectionBtns = document.querySelectorAll('.wind-direction-btn');

// Wind strength slider
petalWindStrengthSlider.addEventListener('input', (e) => {
  petalWindStrength = parseFloat(e.target.value);
  const percentage = Math.round((petalWindStrength / 0.1) * 100);
  windStrengthValue.textContent = `${percentage}%`;
});

// Opacity slider
petalOpacitySlider.addEventListener('input', (e) => {
  petalOpacity = parseFloat(e.target.value);
  const percentage = Math.round(petalOpacity * 100);
  petalOpacityValue.textContent = `${percentage}%`;
});

// Amount slider
petalAmountSlider.addEventListener('input', (e) => {
  petalAmount = parseInt(e.target.value);
  petalAmountValue.textContent = petalAmount;
});

// Wind direction buttons
windDirectionBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    petalWindDirection = parseInt(btn.getAttribute('data-direction'));
    
    // Visual feedback - highlight active button
    windDirectionBtns.forEach(b => {
      b.style.background = 'rgba(255, 255, 255, 0.2)';
    });
    btn.style.background = 'rgba(100, 200, 255, 0.4)';
  });
});

/////////////////////////////CAMERA PRESETS////////////////////////////////
// Define camera preset positions and targets
const cameraPresets = {
  default: {
    position: { x: 12.5, y: 4.45, z: 3.75 },
    target: { x: 1.03, y: 1.69, z: 0.29 }
  },
  left: {
    position: { x: 10.6, y: 4, z: 10.6 },  // 45° angle - left side view
    target: { x: 0, y: 2, z: 0 }
  },
  front: {
    position: { x: 15, y: 4, z: 0 },  // Front view - facing temple from X-axis
    target: { x: 0, y: 2, z: 0 }
  },
  right: {
    position: { x: 10.6, y: 4, z: -10.6 },  // 135° angle - right side view
    target: { x: 0, y: 2, z: 0 }
  }
};

let isAnimatingCamera = false;

// Smooth camera animation function
function animateCameraToPreset(preset) {
  if (isAnimatingCamera) return;
  
  const targetPos = cameraPresets[preset].position;
  const targetLookAt = cameraPresets[preset].target;
  
  const startPos = {
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z
  };
  
  const startTarget = {
    x: controls.target.x,
    y: controls.target.y,
    z: controls.target.z
  };
  
  isAnimatingCamera = true;
  const duration = 1500; // 1.5 seconds
  const startTime = Date.now();
  
  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease-in-out cubic function
    const eased = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    
    // Interpolate camera position
    camera.position.x = startPos.x + (targetPos.x - startPos.x) * eased;
    camera.position.y = startPos.y + (targetPos.y - startPos.y) * eased;
    camera.position.z = startPos.z + (targetPos.z - startPos.z) * eased;
    
    // Interpolate camera target
    controls.target.x = startTarget.x + (targetLookAt.x - startTarget.x) * eased;
    controls.target.y = startTarget.y + (targetLookAt.y - startTarget.y) * eased;
    controls.target.z = startTarget.z + (targetLookAt.z - startTarget.z) * eased;
    
    controls.update();
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      isAnimatingCamera = false;
    }
  }
  
  animate();
}

// Add event listeners to camera preset buttons
const presetButtons = document.querySelectorAll('.camera-preset-btn');
presetButtons.forEach(button => {
  button.addEventListener('click', () => {
    const preset = button.getAttribute('data-preset');
    animateCameraToPreset(preset);
    
    // Visual feedback
    presetButtons.forEach(btn => {
      btn.style.background = 'rgba(255, 255, 255, 0.2)';
    });
    button.style.background = 'rgba(100, 200, 255, 0.4)';
    
    setTimeout(() => {
      button.style.background = 'rgba(255, 255, 255, 0.2)';
    }, 1500);
  });
});

/////////////////////////////DEPTH OF FIELD CONTROLS////////////////////////////////
const dofToggleBtn = document.getElementById('dof-toggle');
const dofFocusSlider = document.getElementById('dof-focus-slider');
const dofFocusValue = document.getElementById('dof-focus-value');
const dofApertureSlider = document.getElementById('dof-aperture-slider');
const dofApertureValue = document.getElementById('dof-aperture-value');
const dofBlurSlider = document.getElementById('dof-blur-slider');
const dofBlurValue = document.getElementById('dof-blur-value');

// DOF toggle button
dofToggleBtn.addEventListener('click', () => {
  dofEnabled = !dofEnabled;
  dofToggleBtn.textContent = dofEnabled ? 'ON' : 'OFF';
  dofToggleBtn.style.background = dofEnabled 
    ? 'rgba(255, 255, 255, 0.2)' 
    : 'rgba(100, 0, 0, 0.3)';
  updateDepthOfField();
});

// Focus distance slider
dofFocusSlider.addEventListener('input', (e) => {
  dofFocus = parseFloat(e.target.value);
  dofFocusValue.textContent = dofFocus.toFixed(1);
  updateDepthOfField();
});

// Aperture (blur intensity) slider
dofApertureSlider.addEventListener('input', (e) => {
  dofAperture = parseFloat(e.target.value) * 0.0001; // Convert to proper scale
  dofApertureValue.textContent = parseFloat(e.target.value).toFixed(1);
  updateDepthOfField();
});

// Max blur slider
dofBlurSlider.addEventListener('input', (e) => {
  dofBlur = parseFloat(e.target.value);
  dofBlurValue.textContent = dofBlur.toFixed(3);
  updateDepthOfField();
});

/////////////////////////////COLOR CORRECTION CONTROLS////////////////////////////////
const contrastSlider = document.getElementById('contrast-slider');
const contrastValue = document.getElementById('contrast-value');
const saturationSlider = document.getElementById('saturation-slider');
const saturationValue = document.getElementById('saturation-value');
const brightnessSlider = document.getElementById('brightness-slider');
const brightnessValue = document.getElementById('brightness-value');

// Contrast slider
contrastSlider.addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  colorCorrectionPass.uniforms['contrast'].value = value;
  contrastValue.textContent = value.toFixed(2);
});

// Saturation slider
saturationSlider.addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  colorCorrectionPass.uniforms['saturation'].value = value;
  saturationValue.textContent = value.toFixed(2);
});

// Brightness slider
brightnessSlider.addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  colorCorrectionPass.uniforms['brightness'].value = value;
  brightnessValue.textContent = value.toFixed(2);
});

// Reset button
const colorResetBtn = document.getElementById('color-reset-btn');
colorResetBtn.addEventListener('click', () => {
  // Reset to default values
  const defaults = {
    contrast: 1.0,
    saturation: 1.25,
    brightness: 1.0
  };
  
  // Update sliders
  contrastSlider.value = defaults.contrast;
  saturationSlider.value = defaults.saturation;
  brightnessSlider.value = defaults.brightness;
  
  // Update display values
  contrastValue.textContent = defaults.contrast.toFixed(2);
  saturationValue.textContent = defaults.saturation.toFixed(2);
  brightnessValue.textContent = defaults.brightness.toFixed(2);
  
  // Update shader uniforms
  colorCorrectionPass.uniforms['contrast'].value = defaults.contrast;
  colorCorrectionPass.uniforms['saturation'].value = defaults.saturation;
  colorCorrectionPass.uniforms['brightness'].value = defaults.brightness;
});

/////////////////////////////BACKGROUND MUSIC////////////////////////////////
const musicToggle = document.getElementById('music-toggle');
const volumeControl = document.getElementById('volume-control');
const volumeSlider = document.getElementById('volume-slider');
const volumeValue = document.getElementById('volume-value');

// Create audio element
const bgMusic = new Audio();
bgMusic.src = '/audio/Aurora Dreams (1).mp3';
bgMusic.loop = true;
bgMusic.volume = 0.1; // 10% volume

let isMusicPlaying = false;

// Auto-play music on load (after user interaction with the page)
window.addEventListener('click', function startMusic() {
  if (!isMusicPlaying) {
    bgMusic.play().catch(err => {
      console.log('Music autoplay was prevented:', err);
    });
    musicToggle.textContent = '🔊';
    isMusicPlaying = true;
  }
  // Remove this listener after first click
  window.removeEventListener('click', startMusic);
}, { once: true });

function toggleMusic() {
  if (isMusicPlaying) {
    bgMusic.pause();
    musicToggle.textContent = '🔇';
    isMusicPlaying = false;
  } else {
    bgMusic.play().catch(err => {
      console.log('Music play was prevented:', err);
    });
    musicToggle.textContent = '🔊';
    isMusicPlaying = true;
  }
}

// Add click event to music button
musicToggle.addEventListener('click', toggleMusic);

// Show/hide volume control on hover
musicToggle.addEventListener('mouseenter', () => {
  musicToggle.style.transform = 'scale(1.1)';
  musicToggle.style.background = 'rgba(255, 255, 255, 0.2)';
  volumeControl.style.opacity = '1';
  volumeControl.style.pointerEvents = 'auto';
  volumeControl.style.transform = 'translateX(0)';
});

const musicControlArea = () => {
  const musicRect = musicToggle.getBoundingClientRect();
  const volumeRect = volumeControl.getBoundingClientRect();
  return {
    left: musicRect.left,
    right: volumeRect.right,
    top: Math.min(musicRect.top, volumeRect.top),
    bottom: Math.max(musicRect.bottom, volumeRect.bottom)
  };
};

document.addEventListener('mousemove', (e) => {
  const area = musicControlArea();
  const isInArea = e.clientX >= area.left && e.clientX <= area.right &&
                   e.clientY >= area.top && e.clientY <= area.bottom;
  
  if (!isInArea) {
    musicToggle.style.transform = 'scale(1)';
    musicToggle.style.background = 'rgba(0, 0, 0, 0.3)';
    volumeControl.style.opacity = '0';
    volumeControl.style.pointerEvents = 'none';
    volumeControl.style.transform = 'translateX(-10px)';
  }
});

// Volume slider control
volumeSlider.addEventListener('input', (e) => {
  const volume = parseInt(e.target.value);
  bgMusic.volume = volume / 100;
  volumeValue.textContent = `${volume}%`;
});

/////////////////////////////AMBIENT SOUND EFFECTS////////////////////////////////
// Create ambient sound elements
const dayAmbience = new Audio();
dayAmbience.src = '/audio/day-ambience.mp3'; // Wind chimes, birds, gentle breeze
dayAmbience.loop = true;
dayAmbience.volume = 0.2; // 20% volume

const nightAmbience = new Audio();
nightAmbience.src = '/audio/night-ambience.mp3'; // Crickets, night sounds, soft wind
nightAmbience.loop = true;
nightAmbience.volume = 0.2; // 20% volume

let isAmbienceEnabled = true;
let currentAmbience = null;

// Function to switch ambient sounds based on day/night
function updateAmbientSound() {
  if (!isAmbienceEnabled) {
    dayAmbience.pause();
    nightAmbience.pause();
    currentAmbience = null;
    return;
  }
  
  if (isNightMode) {
    // Switch to night ambience
    dayAmbience.pause();
    dayAmbience.currentTime = 0;
    nightAmbience.play().catch(err => console.log('Night ambience prevented:', err));
    currentAmbience = nightAmbience;
  } else {
    // Switch to day ambience
    nightAmbience.pause();
    nightAmbience.currentTime = 0;
    dayAmbience.play().catch(err => console.log('Day ambience prevented:', err));
    currentAmbience = dayAmbience;
  }
}

// Auto-start ambient sounds on first user interaction
window.addEventListener('click', function startAmbience() {
  if (isAmbienceEnabled) {
    updateAmbientSound();
  }
}, { once: true });

/////////////////////////////AMBIENT SOUND MUTE BUTTON////////////////////////////////
const ambienceToggle = document.getElementById('ambience-toggle');

function toggleAmbience() {
  isAmbienceEnabled = !isAmbienceEnabled;
  
  if (isAmbienceEnabled) {
    ambienceToggle.textContent = '🔔';
    updateAmbientSound(); // Resume ambient sound
  } else {
    ambienceToggle.textContent = '🔕';
    dayAmbience.pause();
    nightAmbience.pause();
    currentAmbience = null;
  }
}

// Add click event to ambience button
ambienceToggle.addEventListener('click', toggleAmbience);

// Add hover effect to button
ambienceToggle.addEventListener('mouseenter', () => {
  ambienceToggle.style.transform = 'scale(1.1)';
  ambienceToggle.style.background = 'rgba(255, 255, 255, 0.2)';
});

ambienceToggle.addEventListener('mouseleave', () => {
  ambienceToggle.style.transform = 'scale(1)';
  ambienceToggle.style.background = 'rgba(0, 0, 0, 0.3)';
});

/////////////////////////////PAGE VISIBILITY - PAUSE AUDIO ON TAB SWITCH////////////////////////////////
// Helper function to fade audio volume
function fadeAudio(audioElement, targetVolume, duration = 500) {
  const startVolume = audioElement.volume;
  const volumeChange = targetVolume - startVolume;
  const steps = 20; // Number of steps in the fade
  const stepDuration = duration / steps;
  const stepChange = volumeChange / steps;
  
  let currentStep = 0;
  
  const fadeInterval = setInterval(() => {
    currentStep++;
    audioElement.volume = Math.max(0, Math.min(1, startVolume + (stepChange * currentStep)));
    
    if (currentStep >= steps) {
      clearInterval(fadeInterval);
      audioElement.volume = targetVolume;
      
      // If fading to 0, pause the audio
      if (targetVolume === 0) {
        audioElement.pause();
      }
    }
  }, stepDuration);
  
  return fadeInterval;
}

// Store original volumes
const originalMusicVolume = bgMusic.volume;
const originalAmbienceVolume = 0.2;

// Pause music and ambient sounds when user switches to another tab
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Tab is hidden - fade out and pause all audio
    if (isMusicPlaying && !bgMusic.paused) {
      fadeAudio(bgMusic, 0, 300);
    }
    if (currentAmbience && !currentAmbience.paused) {
      fadeAudio(currentAmbience, 0, 300);
    }
  } else {
    // Tab is visible again - resume and fade in audio if it was playing
    if (isMusicPlaying) {
      bgMusic.volume = 0;
      bgMusic.play().catch(err => console.log('Music resume prevented:', err));
      fadeAudio(bgMusic, originalMusicVolume, 500);
    }
    if (isAmbienceEnabled && currentAmbience) {
      currentAmbience.volume = 0;
      currentAmbience.play().catch(err => console.log('Ambience resume prevented:', err));
      fadeAudio(currentAmbience, originalAmbienceVolume, 500);
    }
  }
});

/////////////////////////////UI SOUND EFFECTS////////////////////////////////
// Create Web Audio API context for sound effects
let audioContext = null;
let isAudioInitialized = false;

// Initialize audio context on first user interaction
function initAudioContext() {
  if (isAudioInitialized) return;
  
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    isAudioInitialized = true;
    console.log('✅ Audio context initialized');
  } catch (e) {
    console.log('Audio not supported:', e);
  }
}

// Generate simple beep sounds using Web Audio API
function playBeep(frequency, duration, volume) {
  if (!isAudioInitialized || !audioContext) return;
  
  try {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch (e) {
    console.log('Beep error:', e);
  }
}

// Play sound with rate limiting to avoid spam
let lastHoverTime = 0;
let lastClickTime = 0;
let lastSliderTime = 0;

function playHoverSound() {
  const now = Date.now();
  if (now - lastHoverTime > 100) { // Min 100ms between hover sounds
    playBeep(800, 0.05, 0.05); // 800Hz, 50ms, 5% volume
    lastHoverTime = now;
  }
}

function playClickSound() {
  const now = Date.now();
  if (now - lastClickTime > 50) { // Min 50ms between click sounds
    playBeep(1000, 0.08, 0.08); // 1000Hz, 80ms, 8% volume
    lastClickTime = now;
  }
}

function playSliderSound() {
  const now = Date.now();
  if (now - lastSliderTime > 50) { // Min 50ms between slider sounds
    playBeep(600, 0.03, 0.03); // 600Hz, 30ms, 3% volume
    lastSliderTime = now;
  }
}

// Initialize audio on first user interaction (required by browsers)
document.addEventListener('click', function initAudioOnce() {
  initAudioContext();
  document.removeEventListener('click', initAudioOnce);
}, { once: true });

// Add sound effects to all buttons
const allButtons = document.querySelectorAll('button');
allButtons.forEach(button => {
  button.addEventListener('mouseenter', () => {
    if (isAudioInitialized) playHoverSound();
  });
  button.addEventListener('click', () => {
    if (isAudioInitialized) playClickSound();
  });
});

// Add sound effects to all sliders
const allSliders = document.querySelectorAll('input[type="range"]');
allSliders.forEach(slider => {
  slider.addEventListener('input', () => {
    if (isAudioInitialized) playSliderSound();
  });
});

// Add sound effects to color picker
const colorPicker = document.getElementById('fog-color-picker');
if (colorPicker) {
  colorPicker.addEventListener('input', () => {
    if (isAudioInitialized) playSliderSound();
  });
}

// Add sound to 3D button hovers in the scene
let last3DButtonHoverSound = 0;
function play3DButtonHoverSound() {
  if (!isAudioInitialized) return;
  const now = Date.now();
  if (now - last3DButtonHoverSound > 200) { // Longer delay for 3D buttons
    playHoverSound();
    last3DButtonHoverSound = now;
  }
}