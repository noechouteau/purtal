import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as dat from 'lil-gui'
import { gsap } from "gsap";



import firefliesVertexShader from './shaders/fireflies/vertex.glsl'
import firefliesFragmentShader from './shaders/fireflies/fragment.glsl'

import portalVertexShader from './shaders/portal/vertex.glsl'
import portalFragmentShader from './shaders/portal/fragment.glsl'

const loadingBarContainer = document.querySelector('.loading-bar')
const loadingBarElement = document.querySelector('.progress')
const waitText = document.querySelector('#waitText')
const launchText = document.querySelector('#launchText')
const helpTitle = document.querySelector('#helpTitle')

const loadingManager = new THREE.LoadingManager(
  () =>
  {
      // console.log('loaded')
      waitText.classList.add('ended')
      waitText.style.display = 'none'
      launchText.classList.remove('ended')
      gsap.delayedCall(1., () =>
      {
          gsap.to(overlayMaterial.uniforms.uAlpha, { duration: 3, value: 0, delay: 1 }).then(() =>
          {
            scene.remove(overlay)
          }
          )
          loadingBarContainer.style.opacity = '0'
          gsap.delayedCall(1, () =>
          {
              loadingBarContainer.style.display = 'none'
              launchText.style.opacity = '0'
              gui.show();
              helpTitle.classList.remove('ended')
          })

      })
  },
  ( itemsUrl, itemsLoaded, itemsTotal) =>
  {
      // console.log(itemsLoaded, itemsTotal)
      const progressRatio = itemsLoaded / itemsTotal
      // console.log(progressRatio)
      loadingBarElement.style.transform = `scaleX(${progressRatio})`
  }
)

const debugObject = {}
const gui = new dat.GUI();
const loader = new GLTFLoader(loadingManager);
gui.hide();

const mapLayers = new Map();
mapLayers.set("inside", 1);
mapLayers.set("outside", 2);
mapLayers.set("portal", 3);

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
}

let isInsidePortal = false;
let wasOutside = true;

const resolution = new THREE.Vector2();
const textureLoader = new THREE.TextureLoader(loadingManager)


// Setup Renderer
const renderer = new THREE.WebGLRenderer({
  antialias: true
});
renderer.localClippingEnabled = true;

renderer.setSize(sizes.width, sizes.height)

document.body.appendChild(renderer.domElement);

function resizeRenderer(width, height) {
  renderer.setSize(width, height);
}

// Setup Portal RenderTarget
const renderTarget = new THREE.WebGLRenderTarget(1, 1);

function resizePortalRenderTarget(width, height) {
  renderTarget.setSize(width, height);
}

// Setup Scene
const scene = new THREE.Scene();

/** 
 * Overlay
 */

const overlayGeometry = new THREE.PlaneGeometry(2, 2, 1, 1)
const overlayMaterial = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
        uAlpha: { value: 1 }
    },
    vertexShader: `
        void main()
        {
            gl_Position =  vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uAlpha;

        void main()
        {
            gl_FragColor = vec4(0.0, 0.0, 0.0, uAlpha);
        }
    `,
})
const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial)
scene.add(overlay)

// Setup Camera and Controls
const camera = new THREE.PerspectiveCamera(60, sizes.width / sizes.height, 0.1, 100)
camera.position.y = 1
camera.position.z = 2
camera.lookAt(new THREE.Vector3(0, 0, 0))
scene.add(camera)


// Controls
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

controls.target.y = 1
controls.maxPolarAngle = Math.PI / 2 + 0.3
controls.minPolarAngle = Math.PI / 3 - 0.01

controls.minAzimuthAngle = -Math.PI/2+0.9;
controls.maxAzimuthAngle = Math.PI/2-0.9;

controls.enableZoom = false
controls.enablePan = false

function resizeCamera(width, height) {
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

// Setup Clipping planes
const globalPlaneInside = [new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)];
const globalPlaneOutside = [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)];

// Helper function to set nested meshes to layers
// https://github.com/mrdoob/three.js/issues/10959
function setLayer(object, layer) {
  object.layers.set(layer);
  object.traverse(function (child) {
    child.layers.set(layer);
  });
}

function createPortal() {
  const geometry = new THREE.CircleGeometry(1);
  const material = new THREE.MeshBasicMaterial({
    map: renderTarget.texture,
    transparent: true,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uResolution = new THREE.Uniform(resolution);

    shader.fragmentShader =
      `
      uniform vec2 uResolution;
    ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `
      vec2 pos = gl_FragCoord.xy/uResolution;
      vec4 sampledDiffuseColor = texture2D( map, pos );
      diffuseColor *= sampledDiffuseColor;
    `
    );
  };
  return new THREE.Mesh(geometry, material);
}




/**
 * Textures
 */
const bakedTexture = textureLoader.load('main.jpg')
bakedTexture.flipY = false
bakedTexture.colorSpace = THREE.SRGBColorSpace

const bakedForest = textureLoader.load('forest.jpg')
bakedForest.flipY = false
bakedForest.colorSpace = THREE.SRGBColorSpace

const bakedCave = textureLoader.load('cave.jpg')
bakedCave.flipY = false
bakedCave.colorSpace = THREE.SRGBColorSpace

const bakedFloor = textureLoader.load('floor.jpg')
bakedFloor.flipY = false
bakedFloor.colorSpace = THREE.SRGBColorSpace

const bakedPdim1 = textureLoader.load('pdim1.jpg')
bakedPdim1.flipY = false
bakedPdim1.colorSpace = THREE.SRGBColorSpace

const bakedPdim2 = textureLoader.load('pdim2.jpg')
bakedPdim2.flipY = false
bakedPdim2.colorSpace = THREE.SRGBColorSpace

const bakedPdim3 = textureLoader.load('pdim3.jpg')
bakedPdim3.flipY = false
bakedPdim3.colorSpace = THREE.SRGBColorSpace

const bakedPdim4 = textureLoader.load('pdim4.jpg')
bakedPdim4.flipY = false
bakedPdim4.colorSpace = THREE.SRGBColorSpace

/**
 * Materials
 */
// Baked material
const bakedMaterial = new THREE.MeshBasicMaterial({ map: bakedTexture })
const forestMaterial = new THREE.MeshBasicMaterial({ map: bakedForest })
const caveMaterial = new THREE.MeshBasicMaterial({ map: bakedCave })
const floorMaterial = new THREE.MeshBasicMaterial({ map: bakedFloor })
const pWorld1Material = new THREE.MeshBasicMaterial({ map: bakedPdim1 })
const pWorld2Material = new THREE.MeshBasicMaterial({ map: bakedPdim2 })
const pWorld3Material = new THREE.MeshBasicMaterial({ map: bakedPdim3 })
const pWorld4Material = new THREE.MeshBasicMaterial({ map: bakedPdim4 })

// Pole light material
const poleLightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffe5 })

// Portal light material
debugObject.portalColorStart = "#fec8f7"
debugObject.portalColorEnd = "#A775FF"

gui.addColor(debugObject,"portalColorStart").onChange(()=>{
    portalLightMaterial.uniforms.uColorStart.value.set(debugObject.portalColorStart)
})

gui.addColor(debugObject,"portalColorEnd").onChange(()=>{
    portalLightMaterial.uniforms.uColorEnd.value.set(debugObject.portalColorEnd)
})

const portalLightMaterial = new THREE.ShaderMaterial({ 
    uniforms : {
        uTime: {value: 0},
        uColorStart: {value: new THREE.Color(debugObject.portalColorStart)},
        uColorEnd: {value: new THREE.Color(debugObject.portalColorEnd)},
        softness: {value: 5.0}
        
    },
    transparent: true,
    vertexShader: portalVertexShader,
    fragmentShader: portalFragmentShader,
 })

 const runesLightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffe5 })



/**
 * Model
 */
let portalLightMesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffe5 }))
loader.load(
    'main.glb',
    (gltf) =>
    {
        scene.add(gltf.scene)
        setLayer(gltf.scene, mapLayers.get("outside"))

        // Get each object
        const bakedMesh = gltf.scene.children.find((child) => child.name === 'main')
        portalLightMesh = gltf.scene.children.find((child) => child.name === 'portalLight')
        console.log(portalLightMesh)
        const poleLightAMesh = gltf.scene.children.find((child) => child.name === 'poleLightA')
        const poleLightBMesh = gltf.scene.children.find((child) => child.name === 'poleLightB')

        // Apply materials
        bakedMesh.material = bakedMaterial
        portalLightMesh.material = portalLightMaterial
        poleLightAMesh.material = poleLightMaterial
        poleLightBMesh.material = poleLightMaterial
    }
)

loader.load(
    'forest.glb',
    (gltf) =>
    {
        gltf.scene.traverse((child) => {
            child.material = forestMaterial
        })

        setLayer(gltf.scene, mapLayers.get("outside"))
		scene.add( gltf.scene )
        
    }
)

loader.load(
    'cave.glb',
    (gltf) =>
    {

        gltf.scene.traverse((child) => {
            child.material = caveMaterial
        }
        )

        setLayer(gltf.scene, mapLayers.get("outside"))
		scene.add( gltf.scene )
    }
)

loader.load(
    'floor.glb',
    (gltf) =>
    {
        scene.add(gltf.scene)

        gltf.scene.traverse((child) => {
            child.material = floorMaterial
        }
        )
        setLayer(gltf.scene, mapLayers.get("outside"))
		scene.add( gltf.scene )
    }
)

loader.load(
  'pWorld1.glb',
  (gltf) =>
  {
      scene.add(gltf.scene)

      gltf.scene.traverse((child) => {
        child.material = pWorld1Material
      }
      )
      setLayer(gltf.scene, mapLayers.get("inside"))
  scene.add( gltf.scene )
  }
)

loader.load(
  'pWorld2.glb',
  (gltf) =>
  {
      scene.add(gltf.scene)

      gltf.scene.traverse((child) => {
        child.material = pWorld2Material
      }
      )
      setLayer(gltf.scene, mapLayers.get("inside"))
  scene.add( gltf.scene )
  }
)

loader.load(
  'pWorld3.glb',
  (gltf) =>
  {
    scene.add(gltf.scene)

    // Get each object
    const bakedMesh = gltf.scene.children.find((child) => child.name === 'jewel003')

    const runesLightA = gltf.scene.children.find((child) => child.name === 'runes1')
    const runesLightB = gltf.scene.children.find((child) => child.name === 'runes2')

    console.log(gltf.scene.children)

    // Apply materials
    bakedMesh.material = pWorld3Material
    runesLightA.material = runesLightMaterial
    runesLightB.material = runesLightMaterial

    setLayer(bakedMesh, mapLayers.get("inside"))
    setLayer(runesLightA, mapLayers.get("inside"))
    setLayer(runesLightB, mapLayers.get("inside"))
  }
)

loader.load(
  'pWorld4.glb',
  (gltf) =>
  {
      scene.add(gltf.scene)

      gltf.scene.traverse((child) => {
        child.material = pWorld4Material
      }
      )
      setLayer(gltf.scene, mapLayers.get("inside"))
  scene.add( gltf.scene )
  }
)

const portalMesh = createPortal();
portalMesh.position.set(0, 0.8, -1.7);
let portalScale = 0.75;
portalMesh.material.opacity = 0;
portalMesh.scale.set(0.73,0.76,portalScale);
setLayer(portalMesh, mapLayers.get("portal"));
scene.add(portalMesh);

const portalBackgroundMesh = new THREE.Mesh(new THREE.CircleGeometry(2), new THREE.MeshPhysicalMaterial())
portalBackgroundMesh.position.set(0, 0.5, 0);
setLayer(portalBackgroundMesh, mapLayers.get("portal"));
scene.add(portalBackgroundMesh);

/**
 * Fireflies
 */
const firefliesGeometry = new THREE.BufferGeometry()
const firefliesCount = 30
const positionArray = new Float32Array(firefliesCount*3)
const scaleArray = new Float32Array(firefliesCount)

for(let i=0; i< firefliesCount; i++){
    positionArray[i*3 + 0] = (Math.random() - 0.5 )* 4
    positionArray[i*3 + 1] = Math.random() * 2
    positionArray[i*3 + 2] = (Math.random() -0.5)*4

    scaleArray[i] = Math.random()
}

firefliesGeometry.setAttribute("position", new THREE.BufferAttribute(positionArray, 3))
firefliesGeometry.setAttribute("aScale", new THREE.BufferAttribute(scaleArray, 1))

//Material
const firefliesMaterial = new THREE.ShaderMaterial({
    uniforms : {
        uPixelRatio: {value: Math.min(window.devicePixelRatio, 2)},
        uSize: {value: 300},
        uTime: {value: 0}
    },
    vertexShader: firefliesVertexShader,
    fragmentShader: firefliesFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
})

//Points
const fireflies = new THREE.Points(firefliesGeometry,firefliesMaterial)
fireflies.layers.set(mapLayers.get("outside"))
scene.add(fireflies)

const clock = new THREE.Clock()

function animate() {
  
  testPortalBounds();

  const elapsedTime = clock.getElapsedTime()

  // Update fireflies
  firefliesMaterial.uniforms.uTime.value = elapsedTime
  portalLightMaterial.uniforms.uTime.value = elapsedTime

  renderer.render(scene, camera);

  renderPortal();
  renderWorld();
  controls.update()
   requestAnimationFrame(animate);

}

const portalRadialBounds = 0.5; // relative to portal size
function testPortalBounds() {
  const isOutside = camera.position.z > 0;
  const distance = portalMesh.position.distanceTo(camera.position);
  const withinPortalBounds = distance < portalRadialBounds;
  if (wasOutside !== isOutside && withinPortalBounds) {
    isInsidePortal = !isOutside;
  }
  wasOutside = isOutside;
}


renderer.localClippingEnabled = true;

debugObject.clearColor = "#1f0a29"
renderer.setClearColor(debugObject.clearColor)
gui.addColor(debugObject,"clearColor").onChange(()=>{
    renderer.setClearColor(debugObject.clearColor)
} )

function renderPortal() {
  renderer.clippingPlanes = isInsidePortal
    ? globalPlaneInside
    : globalPlaneOutside;

  camera.layers.disable(mapLayers.get("portal"));
  if (isInsidePortal) {
    camera.layers.disable(mapLayers.get("inside"));
    camera.layers.enable(mapLayers.get("outside"));
  } else {
    camera.layers.disable(mapLayers.get("outside"));
    camera.layers.enable(mapLayers.get("inside"));
  }

  renderer.setRenderTarget(renderTarget);
  renderer.render(scene, camera);
}

function renderWorld() {
  renderer.clippingPlanes = [];

  portalMesh.material.side = isInsidePortal ? THREE.BackSide : THREE.FrontSide;
  portalBackgroundMesh.material.side = isInsidePortal
    ? THREE.FrontSide
    : THREE.BackSide;

  camera.layers.enable(mapLayers.get("portal"));
  if (isInsidePortal) {
    camera.layers.disable(mapLayers.get("outside"));
    camera.layers.enable(mapLayers.get("inside"));
  } else {
    camera.layers.disable(mapLayers.get("inside"));
    camera.layers.enable(mapLayers.get("outside"));
  }

  renderer.setRenderTarget(null);
  renderer.render(scene, camera);
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  resolution.set(width, height);

  resizeRenderer(width, height);
  resizePortalRenderTarget(width, height);
  resizeCamera(width, height);

  firefliesMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2)

}

function handleResize() {
  resize();
}




window.addEventListener("resize", handleResize);


let clickTimer;
let secondTimer;

window.addEventListener('mousedown', function(event) {
  clickTimer = gsap.delayedCall(0.6, anima, []);
  secondTimer = gsap.delayedCall(1.6, appa, []);
});

function anima(){
  gsap.to(portalLightMaterial.uniforms.softness, { 
    duration: 1,
    ease: "power1.in",
    value: 0.0 
  });
}

function appa(){
  gsap.to(portalMesh.material, { 
    duration: 1,
    ease: "power1.in",
    opacity: 1.0 
  });
}
  

window.addEventListener('mouseup', function(event) {
  clickTimer.kill();
  secondTimer.kill();

  gsap.to(portalMesh.material, {
    duration: 1,
    ease: "power1.in",
    opacity: 0.0 
  });

    gsap.to(portalLightMaterial.uniforms.softness, { 
      duration: 1,
      ease: "power1.out",
      value: 5.0 
    });

});


animate();
resize();
