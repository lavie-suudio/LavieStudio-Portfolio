import './style.scss'
import * as THREE from 'three';
import { OrbitControls } from './utils/OrbitControls.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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

const raycaster = new THREE.Raycaster();
// Increase threshold for larger detection area
raycaster.params.Points.threshold = 0.5;
raycaster.params.Line.threshold = 0.5;
const pointer = new THREE.Vector2();

/////////////////////////////LOADERS///////////////////////////////////////////////
const textureLoader = new THREE.TextureLoader();

/////////////////////////////MODEL LOADER////////////////////////////////////////
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath( '/draco/' );

const loader = new GLTFLoader();
loader.setDRACOLoader( dracoLoader );

const textureMap = {
  First:{
    day:'./textures/day/First_texture_set_Day.webp',
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
      Hi! I'm Lavie, a passionate 3D artist and creative developer specializing in stunning visual experiences. 
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
const camera = new THREE.PerspectiveCamera( 
  25, 
  sizes.width / sizes.height, 
  0.1, 
  1000 );
  camera.position.set(13.5, 4, 6);




const renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true });
renderer.setSize( sizes.width, sizes.height );
renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = .5; // Adjust this value to control brightness (higher = brighter)


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
controls.target.set(1, 1.1, 0.43);


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
});

//function animate() {}

const render = () => {
  controls.update();

  console.log(camera.position);
  console.log("000000000000000");
  console.log(controls.target);

  // Animate Lanterns - Wind sway effect
  const time = Date.now() * 0.0025; // Convert to seconds
  zAxisLantern.forEach((Lantern, index) => {
    // Create a gentle swaying motion like wind
    // Each lantern has a slight offset for more natural movement
    const offset = index * 2.5;
    Lantern.rotation.z = Math.sin(time + offset) * 0.25; // Sway back and forth
    Lantern.rotation.x = Math.sin(time * 0.7 + offset) * 0.1; // Slight tilt
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
      hoveredObject = currentObject;
    }
    
    document.body.style.cursor = 'pointer';
  } else {
    hoveredObject = null;
    document.body.style.cursor = 'default';
  }

  renderer.render(scene, camera);
  
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
  themeToggle.disabled = true;

  // Update icon
  isNightMode = !isNightMode;
  themeToggle.textContent = isNightMode ? '🌙' : '☀️';

  // Quick subtle fade: fade to 30% black, swap instantly, fade back
  fadeOverlay.style.opacity = '0.3';
  
  setTimeout(() => {
    swapTexturesForMode(isNightMode);
    fadeOverlay.style.opacity = '0';
    
    setTimeout(() => {
      themeToggle.disabled = false;
      isFading = false;
      console.log(`Switched to ${isNightMode ? 'night' : 'day'} mode`);
    }, 200);
  }, 200);
}

// Add click event to toggle button
themeToggle.addEventListener('click', toggleDayNight);

// Add hover effect to button
themeToggle.addEventListener('mouseenter', () => {
  themeToggle.style.transform = 'scale(1.1)';
  themeToggle.style.background = 'rgba(255, 255, 255, 0.2)';
});

themeToggle.addEventListener('mouseleave', () => {
  themeToggle.style.transform = 'scale(1)';
  themeToggle.style.background = 'rgba(0, 0, 0, 0.3)';
});