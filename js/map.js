// js/map.js — Карта Солнечной системы

const container = document.getElementById('viewport');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000005);

const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1, 15000000);
camera.position.set(0, 500, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// ========== СОЛНЦЕ (светится!) ==========
const sunGeo = new THREE.SphereGeometry(696, 64, 64);
const sunTex = new THREE.TextureLoader().load('https://threejs.org/examples/textures/planets/sun.jpg');
const sunMat = new THREE.MeshBasicMaterial({ map: sunTex });
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

// Точечный источник света ВНУТРИ Солнца
const sunLight = new THREE.PointLight(0xffffff, 3, 0, 0);
sun.add(sunLight);

// Фоновый свет
scene.add(new THREE.AmbientLight(0x111133, 0.3));

// ========== ЗВЁЗДЫ ==========
const starsGeo = new THREE.BufferGeometry();
const starsVerts = [];
for (let i = 0; i < 8000; i++) {
    const r = 5000000 + Math.random() * 7000000;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    starsVerts.push(r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph));
}
starsGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(starsVerts), 3));
scene.add(new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 50 })));

// ========== ПЛАНЕТЫ ==========
const SCALE = 0.001; // 1 единица = 1000 км

const planetDefs = [
    { name: 'Меркурий', dist: 57900000, radius: 2440, color: 0xaaaaaa, period: 88 },
    { name: 'Венера', dist: 108200000, radius: 6052, color: 0xffcc88, period: 225 },
    { name: 'Земля', dist: 149600000, radius: 6371, color: 0x4488ff, period: 365.25 },
    { name: 'Марс', dist: 227900000, radius: 3390, color: 0xff4422, period: 687 },
    { name: 'Юпитер', dist: 778600000, radius: 69911, color: 0xffcc88, period: 4333 },
    { name: 'Сатурн', dist: 1434000000, radius: 58232, color: 0xffdd88, period: 10759 },
    { name: 'Уран', dist: 2871000000, radius: 25362, color: 0x88ccff, period: 30687 },
    { name: 'Нептун', dist: 4495000000, radius: 24622, color: 0x4466ff, period: 60190 }
];

const planetMeshes = [];

planetDefs.forEach(p => {
    // Планета
    const geo = new THREE.SphereGeometry(p.radius * SCALE, 32, 32);
    const mat = new THREE.MeshPhongMaterial({ color: p.color, shininess: 5 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData = { name: p.name, dist: p.dist, period: p.period, angle: Math.random() * Math.PI * 2 };
    scene.add(mesh);
    planetMeshes.push(mesh);
    
    // Орбитальное кольцо
    const orbitR = p.dist * SCALE;
    const ringGeo = new THREE.RingGeometry(orbitR - 100, orbitR + 100, 256);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ 
        color: 0x333355, 
        side: THREE.DoubleSide, 
        transparent: true, 
        opacity: 0.3 
    }));
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);
    
    // Подпись (спрайт)
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(p.name, 128, 32);
    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(p.radius * SCALE * 5, p.radius * SCALE * 1.5, 1);
    sprite.position.y = p.radius * SCALE + 200;
    mesh.add(sprite);
});

// ========== КОНТРОЛЫ ==========
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 200;
controls.maxDistance = 12000000;
controls.zoomSpeed = 1;
controls.rotateSpeed = 0.5;
controls.target.set(0, 0, 0);

// Ползунок скорости
const speedSlider = document.getElementById('speed-slider');
const speedVal = document.getElementById('speed-val');
speedSlider.addEventListener('input', () => {
    const v = parseInt(speedSlider.value);
    speedVal.textContent = v + 'x';
    controls.zoomSpeed = v;
    controls.rotateSpeed = v * 0.5;
});

// ========== ВРЕМЯ ==========
const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
function getDay() { return (Date.now() - J2000) / 86400000; }

// ========== КЛИК ==========
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
container.addEventListener('click', (e) => {
    mouse.x = (e.clientX / container.clientWidth) * 2 - 1;
    mouse.y = -(e.clientY / container.clientHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(planetMeshes);
    if (intersects.length > 0) {
        const obj = intersects[0].object;
        document.getElementById('info-content').innerHTML = 
            `<h3>${obj.userData.name}</h3>
             <p>Расстояние от Солнца: ${(obj.userData.dist / 1000000).toFixed(1)} млн км</p>
             <p>Период обращения: ${obj.userData.period} земных дней</p>`;
        document.getElementById('info-popup').style.display = 'block';
    }
});

// ========== АНИМАЦИЯ ==========
function animate() {
    requestAnimationFrame(animate);
    
    const day = getDay();
    planetMeshes.forEach(mesh => {
        const p = mesh.userData;
        const angle = (day / p.period) * Math.PI * 2 + p.angle;
        const dist = p.dist * SCALE;
        mesh.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
        mesh.rotation.y += 0.002;
    });
    
    // Вращение Солнца
    sun.rotation.y += 0.0001;
    
    controls.update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});
