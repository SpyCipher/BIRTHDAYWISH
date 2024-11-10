import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let scene, camera, renderer, controls;
let particles, backgroundSound;
let mouseX = 0;
let mouseY = 0;
let screenMesh1, screenMesh2, images = [], currentImageIndex = 0;

class Particles {
  constructor(scene) {
    this.scene = scene;
    this.particleCount = 300;
    this.initialRadius = 0.1;
    this.movementSpeed = 2;
    this.colors = ['#da6b00', '#8555d4', '#4ad3b5', '#ffffff'];
    this.directions = [];
    this.starSystems = [];
    this.systemCount = 1;

    this.mousePosition = new THREE.Vector3(0, -40, -30); 

    // Load sound
    this.loadSound();

    // Initialize the first star system at a default position
    this.addStars(this.getPastelColor(), this.mousePosition.x, this.mousePosition.y, this.mousePosition.z);

    // Add event listener for mouse clicks
    window.addEventListener('mousedown', this.mouseDown.bind(this));

    // Set interval for adding stars
    setInterval(() => {
      this.systemCount++;
      this.addStars(this.getPastelColor(), this.mousePosition.x, this.mousePosition.y, this.mousePosition.z); 
    }, 8000);
  }

  loadSound() {
    this.audioContext = new (window.AudioContext || window.AudioContext)();
    this.soundBuffer = null;

    const soundUrl = '/explosionSound.mp3';
    fetch(soundUrl)
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => this.audioContext.decodeAudioData(arrayBuffer))
      .then(audioBuffer => {
        this.soundBuffer = audioBuffer;
      })
      .catch(error => console.error('Error loading sound:', error));
  }

  playSound() {
    if (!this.soundBuffer) return;
  
    // Create a gain node for volume control
    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime); 
    gainNode.connect(this.audioContext.destination); // Connect to the audio context's output
  
    const source = this.audioContext.createBufferSource();
    source.buffer = this.soundBuffer;
    source.connect(gainNode); // Connect the source to the gain node
    source.start(0);
  }

  getPastelColor() {
    const color = new THREE.Color(`hsl(${Math.random() * 360}, ${25 + 70 * Math.random()}%, ${85 + 10 * Math.random()}%)`);
    return `#${color.getHexString()}`;
  }

  addStars(color, x, y, z) {
    const dirs = [];
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const particleMaterial = new THREE.PointsMaterial({
      color: color,
      size: 0.5,
      transparent: true,
      blending: THREE.AdditiveBlending,
      map: this.getTexture(color),
      depthTest: false,
    });

    for (let i = 0; i < this.particleCount; i++) {
      const vertex = new THREE.Vector3(x, y, z); // Use the current mouse position
      positions.push(vertex.x, vertex.y, vertex.z);
      dirs.push({
        x: (Math.random() * this.movementSpeed) - (this.movementSpeed / 2),
        y: (Math.random() * this.movementSpeed) - (this.movementSpeed / 2),
        z: (Math.random() * this.movementSpeed) - (this.movementSpeed / 2)
      });
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const starSystem = new THREE.Points(geometry, particleMaterial);
    this.directions.push(dirs);
    this.starSystems.push(starSystem);
    this.scene.add(starSystem);

    // Play sound when stars are added
    this.playSound();
  }

  mouseDown(event) {
    // Update mouse position based on click
    const canvasX = (event.clientX / window.innerWidth) * 2 - 1;
    const canvasY = - (event.clientY / window.innerHeight) * 2 + 1;
    
    // Unproject mouse position to world coordinates
    const vector = new THREE.Vector3(canvasX, canvasY, 0.5);
    vector.unproject(camera); // Assuming camera is defined in your scope
    const dir = vector.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    this.mousePosition = camera.position.clone().add(dir.multiplyScalar(distance));

    // Add stars at the clicked position
    this.addStars(this.getPastelColor(), this.mousePosition.x, this.mousePosition.y, this.mousePosition.z);

    this.mousePosition.set(0, -40, -30);
  }

  getTexture(color) {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, color);
    gradient.addColorStop(0.4, color);
    gradient.addColorStop(1, 'rgba(0,0,0,1)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  animate() {
    this.starSystems.forEach((system, j) => {
      const positions = system.geometry.attributes.position.array;
      const directions = this.directions[j];

      for (let i = 0; i < this.particleCount; i++) {
        positions[i * 3] += directions[i].x;
        positions[i * 3 + 1] += directions[i].y;
        positions[i * 3 + 2] += directions[i].z;
      }
      system.geometry.attributes.position.needsUpdate = true;
    });
  }
}

init();
animate();

function init() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x202123);

  // Camera
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 5, 50);

  // Renderer
  const canvas = document.getElementById('root');
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Orbit Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // Light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  // Directional Lights
  addDirectionalLights();

  // Floor, Text, Table, Cake
  createFloor();
  addText();
  addTable();
  addCake();

  // Particles
  particles = new Particles(scene);

  // Load background sound
  backgroundSound = new Audio('/backgroundSound.mp3');
  backgroundSound.loop = true; 
  backgroundSound.volume = 0.6; 

  // Handle user interaction to play sound
  window.addEventListener('mousedown', playBackgroundSound);

  // Handle Window Resize
  window.addEventListener('resize', onWindowResize);

  window.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX / window.innerWidth) * 2 - 1; // Normalize to [-1, 1]
    mouseY = -(event.clientY / window.innerHeight) * 2 + 1; // Normalize to [-1, 1]
  });

}

function addDirectionalLights() {
  const positions = [
    { x: 10, y: 10, z: 10 },
    { x: -10, y: 10, z: 10 },
    { x: 10, y: 10, z: -10 },
    { x: -10, y: 10, z: -10 }
  ];
  positions.forEach((pos, index) => {
    const light = new THREE.DirectionalLight(0xffffff, index < 2 ? 1 : 0.5);
    light.position.set(pos.x, pos.y, pos.z);
    light.castShadow = true;
    scene.add(light);
  });
}

function addText() {
    const fontLoader = new FontLoader();
  fontLoader.load('/fonts/Roboto.json', (font) => {
    const textMaterial = new THREE.MeshStandardMaterial({ color: 0xffa500, metalness: 0.7, roughness: 0.4 });

    // First Line: "WISH YOU"
    const wishYouGeometry = new TextGeometry('WISH YOU', {
      font: font,
      size: 6,
      depth: 0.5,
      curveSegments: 12,
      bevelEnabled: true,
      bevelThickness: 0.3,
      bevelSize: 0.2,
      bevelOffset: 0,
      bevelSegments: 5
    });
    const wishYouMesh = new THREE.Mesh(wishYouGeometry, textMaterial);
    wishYouGeometry.center();
    wishYouMesh.position.y = 25.5; 
    scene.add(wishYouMesh);


    // Second Line: "HAPPY BIRTHDAY"
    const happyBirthdayGeometry = new TextGeometry('HAPPY BIRTHDAY', {
      font: font,
      size: 6,
      depth: 0.5,
      curveSegments: 12,
      bevelEnabled: true,
      bevelThickness: 0.3,
      bevelSize: 0.2,
      bevelOffset: 0,
      bevelSegments: 5
    });
    const happyBirthdayMesh = new THREE.Mesh(happyBirthdayGeometry, textMaterial);
    happyBirthdayGeometry.center();
    happyBirthdayMesh.position.y = 15.5; 
    scene.add(happyBirthdayMesh);

    // Third Line: "PRATEEK"
    const prateekGeometry = new TextGeometry('Abhay Singh', {
      font: font,
      size: 6,
      depth: 0.5,
      curveSegments: 12,
      bevelEnabled: true,
      bevelThickness: 0.3,
      bevelSize: 0.2,
      bevelOffset: 0,
      bevelSegments: 5
    });
    const prateekMesh = new THREE.Mesh(prateekGeometry, textMaterial);
    prateekGeometry.center();
    prateekMesh.position.y = 5.5; 
    scene.add(prateekMesh);
  })
}

function createFloor() {
    const textureLoader = new THREE.TextureLoader();
    const tileTexture = textureLoader.load('./tileTexture.jpg'); 

    tileTexture.wrapS = tileTexture.wrapT = THREE.RepeatWrapping;
    tileTexture.repeat.set(6, 6); // Adjust the number of tiles
    tileTexture.offset.set(0.09, 0.09); // Adjust the offset for the texture to create space

    const floorMaterial = new THREE.MeshStandardMaterial({
      map: tileTexture,
      metalness: 0.8, 
      roughness: 0.8 
    });

    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.rotation.x = -Math.PI / 2; // Rotate the floor to be horizontal
    floorMesh.position.y = -10; // Position the floor below the text
    scene.add(floorMesh);
}

function addTable() {
  const loader = new GLTFLoader();
  loader.load('/Table.glb', (gltf) => {
    const model = gltf.scene;
    model.position.set(0, -10, 30); 
    model.scale.set(15, 12, 15); 

    scene.add(model);
  });
}

function addCake() {
  const loader = new GLTFLoader();
  loader.load('/cakeBirthday.glb', (gltf) => {
    const cake = gltf.scene;
    cake.position.set(0, -4, 30); 
    cake.scale.set(12, 12, 12); 

    scene.add(cake);
  });
}

function animate() {
  requestAnimationFrame(animate);
  particles.animate();
  controls.target.set(mouseX * 10, mouseY * 10, 0);
  controls.update();
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function playBackgroundSound() {
  // Play the background sound on the first mouse click
  backgroundSound.play().catch(error => console.error('Error playing sound:', error));
}
