import './style.scss'
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
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
    night:'./textures/night/First_texture_set_Night.webp'
  },
  Second:{
    day:'/textures/day/Second_texture_set_Day.webp',
    night:'/textures/night/Second_texture_set_Night.webp'
  }
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

// Button click handler
window.addEventListener("click", () => {
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
  './models/temple_test_v18.glb', 
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

            if (child.material && child.material.map) {
              child.material.map.minFilter = THREE.LinearMipmapLinearFilter;
            }
          }
        });

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
    console.log('Total lanterns found:', zAxisLantern.length);  // Debug log
  },
  (progress) => {
    console.log('Loading model...', (progress.loaded / progress.total * 100) + '%');
  },
  (error) => {
    console.error('Error loading model:', error);
  }
);


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 
  25, 
  sizes.width / sizes.height, 
  0.1, 
  1000 );
  camera.position.set(15, 7.5, 8.1);




const renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true });
renderer.setSize( sizes.width, sizes.height );
renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = .5; // Adjust this value to control brightness (higher = brighter)


const geometry = new THREE.BoxGeometry( 1, 1, 1 );
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
//const cube = new THREE.Mesh( geometry, material );
//scene.add( cube );

const controls = new OrbitControls( camera, renderer.domElement );
controls.enableDamping = true; 
controls.dampingFactor = 0.05;
controls.update();
controls.target.set(-0.45, 0.97, -1);


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

  //console.log(camera.position);
  //console.log("000000000000000");
  //console.log(controls.target);

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

  // Smoothly scale all buttons back to normal
  raycasterObject.forEach(obj => {
    if (obj.name.includes('Target_Raycaster')) {
      obj.scale.x += (1 - obj.scale.x) * 0.15;
      obj.scale.y += (1 - obj.scale.y) * 0.15;
      obj.scale.z += (1 - obj.scale.z) * 0.15;
    }
  });

  // Handle current intersections
	if (intersects.length > 0) {
    const currentObject = intersects[0].object;
    
    // Only scale buttons (not lanterns)
    if (currentObject.name.includes('Target_Raycaster')) {
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