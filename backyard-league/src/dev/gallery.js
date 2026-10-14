// Dev-only: renders a lineup of roster kids to check the character art.
import * as THREE from 'three';
import { KIDS } from '../data/kids.js';
import { buildCharacter, lookFromKid, adultLook } from '../world3d/kidModel.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(1400, 700);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#bfe6ff');
const cam = new THREE.PerspectiveCamera(30, 2, 0.1, 100);
const zoom = new URLSearchParams(location.search).get('z');
if (zoom) { cam.position.set(-3.1, 1.2, 3.2); cam.lookAt(-3.1, 0.75, 0); } else { cam.position.set(0, 2.4, 9.5); cam.lookAt(0, 0.8, 0); }
scene.add(new THREE.HemisphereLight('#ffffff', '#7fae5a', 1.6));
const sun = new THREE.DirectionalLight('#fff3dd', 2.2);
sun.position.set(4, 8, 6);
sun.castShadow = true;
scene.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshToonMaterial({ color: '#7cc35b' }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const offset = Number(new URLSearchParams(location.search).get('o') || 0);
const list = KIDS.slice(offset, offset + 11);
list.forEach((k, i) => {
  const c = buildCharacter(lookFromKid(k, k.grade_at_start));
  c.root.position.set((i - 5.5) * 1.05, 0, 0);
  c.root.rotation.y = 0.25 * Math.sin(i);
  c.update(0.3 * i, i % 4 === 1 ? 'walk' : i % 4 === 3 ? 'cheer' : 'idle');
  scene.add(c.root);
});
const adult = buildCharacter(adultLook('Coach Dave'));
adult.root.position.set(5.9, 0, -0.5);
scene.add(adult.root);
renderer.render(scene, cam);
window.__done = list.map((k) => `${k.first_name}: ${k.looks.hair_style}, ${k.looks.accessories.join('/')}`);
