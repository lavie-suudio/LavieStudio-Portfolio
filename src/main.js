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

/////////////////////////////LOADERS///////////////////////////////////////////////
const textureLoader = new THREE.TextureLoader();

/////////////////////////////MODEL LOADER////////////////////////////////////////
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath( '/draco/' );

const loader = new GLTFLoader();
loader.setDRACOLoader( dracoLoader );

const textureMap = {
  First:{
    day:'/textures/day/First_texture_set_Day.webp',
    night:'/textures/night/First_texture_set_Night.webp'
  },
  Second:{
    day:'/textures/day/Second_texture_set_Day.webp',
    night:'/textures/night/Second_texture_set_Night.webp'
  }
};

const loadedTextures = {
  day: {},
  night: {},
};

Object.entries(textureMap).forEach(([ textureSet, paths ]) => {
  console.log(`Loading textures for ${textureSet}...`);
  
  const dayTexture = textureLoader.load(
    paths.day,
    (texture) => {
      console.log(`Successfully loaded day texture for ${textureSet}`);
    },
    undefined,
    (error) => {
      console.error(`Error loading day texture for ${textureSet}:`, error);
    }
  );
  loadedTextures.day[textureSet] = dayTexture;
  dayTexture.flipY = false;
  dayTexture.colorSpace = THREE.SRGBColorSpace;
  
  const nightTexture = textureLoader.load(
    paths.night,
    (texture) => {
      console.log(`Successfully loaded night texture for ${textureSet}`);
    },
    undefined,
    (error) => {
      console.error(`Error loading night texture for ${textureSet}:`, error);
    }
  );
  loadedTextures.night[textureSet] = nightTexture;
  nightTexture.flipY = false;
  nightTexture.colorSpace = THREE.SRGBColorSpace;
});

/////////////////////////////SCENE, CAMERA, RENDERER////////////////////////////////////////
loader.load(
  './models/temple_test_Draco_v11.glb',
  (glb) => {
    glb.scene.traverse((child) => {
      if (child.isMesh) {
        Object.keys(textureMap).forEach((key) => {
          if (child.name.includes(key)) {
            const material = new THREE.MeshBasicMaterial({
            //const material = new THREE.MeshStandardMaterial({
              map: loadedTextures.day[key],
            });

            child.material = material;

             if (child.isMesh) {
                child.material.map.minFilter = THREE.LinearMipmapLinearFilter;
                 }   
          }

          //if (child.name.includes('Ground')) {

        });
      }             
      scene.add(glb.scene);
    });

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
  camera.position.set(9.373351700566833, 7.304895000471525, 1.9565921928023498);




const renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true });
renderer.setSize( sizes.width, sizes.height );
renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );


const geometry = new THREE.BoxGeometry( 1, 1, 1 );
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
//const cube = new THREE.Mesh( geometry, material );
//scene.add( cube );

const controls = new OrbitControls( camera, renderer.domElement );
controls.enableDamping = true; 
controls.dampingFactor = 0.05;
controls.update();
controls.target.set(3.7967483533956004, 3.743444858257995, -7.080752318906915);


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
  
  
  renderer.render(scene, camera);
  
  window.requestAnimationFrame(render);
};

render();