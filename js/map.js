import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const container = document.getElementById('viewport');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000005);

const camera = new THREE.PerspectiveCamera(45, container.clientWidth/container.clientHeight, 1, 15000000);
camera.position.set(0, 500, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// Солнце
const sunTex = new THREE.TextureLoader().load('https://threejs.org/examples/textures/planets/sun.jpg');
const sun = new THREE.Mesh(new THREE.SphereGeometry(696, 64, 64), new THREE.MeshBasicMaterial({ map: sunTex }));
scene.add(sun);
const sunLight = new THREE.PointLight(0xffffff, 3, 0, 0);
sun.add(sunLight);
scene.add(new THREE.AmbientLight(0x111133, 0.3));

// Планеты: название, расстояние от Солнца (км), радиус (км), цвет, период (земных дней), наклон орбиты
// Масштаб: 1 единица = 1000 км
const SCALE = 0.001; // 1 единица = 1000 км

const planetDefs = [
    { name:'Меркурий', dist:57900000, radius:2440, color:0xaaaaaa, period:88, moons:[] },
    { name:'Венера', dist:108200000, radius:6052, color:0xffcc88, period:225, moons:[] },
    { name:'Земля', dist:149600000, radius:6371, color:0x4488ff, period:365.25, moons:[
        { name:'Луна', dist:384400, radius:1737, color:0xcccccc, period:27.3 }
    ]},
    { name:'Марс', dist:227900000, radius:3390, color:0xff4422, period:687, moons:[
        { name:'Фобос', dist:9376, radius:11, color:0xaa8866, period:0.32 },
        { name:'Деймос', dist:23463, radius:6, color:0xaa8866, period:1.26 }
    ]},
    { name:'Юпитер', dist:778600000, radius:69911, color:0xffcc88, period:4333, moons:[
        { name:'Ио', dist:421800, radius:1821, color:0xffff00, period:1.77 },
        { name:'Европа', dist:671100, radius:1560, color:0xeeeeff, period:3.55 },
        { name:'Ганимед', dist:1070400, radius:2634, color:0xcccccc, period:7.15 },
        { name:'Каллисто', dist:1882700, radius:2410, color:0x888888, period:16.69 }
    ]},
    { name:'Сатурн', dist:1434000000, radius:58232, color:0xffdd88, period:10759, moons:[
        { name:'Титан', dist:1222000, radius:2575, color:0xffcc88, period:15.95 },
        { name:'Энцелад', dist:238000, radius:252, color:0xffffff, period:1.37 },
        { name:'Мимас', dist:185000, radius:198, color:0xcccccc, period:0.94 }
    ]},
    { name:'Уран', dist:2871000000, radius:25362, color:0x88ccff, period:30687, moons:[
        { name:'Титания', dist:436000, radius:788, color:0x888888, period:8.7 },
        { name:'Оберон', dist:583500, radius:761, color:0x888888, period:13.5 }
    ]},
    { name:'Нептун', dist:4495000000, radius:24622, color:0x4466ff, period:60190, moons:[
        { name:'Тритон', dist:354800, radius:1354, color:0xccccff, period:5.88 }
    ]}
];

const planetMeshes = [];
const labelDiv = document.createElement('div');
labelDiv.style.cssText = 'position:absolute;color:white;font-size:12px;font-family:monospace;pointer-events:none;text-shadow:0 0 4px black;';
document.body.appendChild(labelDiv);

planetDefs.forEach(p => {
    const geo = new THREE.SphereGeometry(p.radius * SCALE, 32, 32);
    const mat = new THREE.MeshPhongMaterial({ color: p.color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData = { name:p.name, dist:p.dist, period:p.period, angle:Math.random()*Math.PI*2, moons:p.moons };
    scene.add(mesh);
    planetMeshes.push(mesh);
    
    // Орбита
    const orbitR = p.dist * SCALE;
    const ringGeo = new THREE.TorusGeometry(orbitR, 50, 16, 256);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color:0x333355, transparent:true, opacity:0.2 }));
    ring.rotation.x = Math.PI/2;
    scene.add(ring);
    
    // Спутники
    p.moons.forEach(m => {
        const mGeo = new THREE.SphereGeometry(Math.max(m.radius*SCALE, 0.2), 8, 8);
        const mMesh = new THREE.Mesh(mGeo, new THREE.MeshPhongMaterial({ color:m.color }));
        mMesh.userData = { name:m.name, parent:mesh, dist:m.dist, period:m.period, angle:Math.random()*Math.PI*2 };
        scene.add(mMesh);
    });
});

// Время
const J2000 = Date.UTC(2000,0,1,12,0,0);

function getDay() { return (Date.now() - J2000)/86400000; }

// Контролы
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 200;
controls.maxDistance = 12000000; // 12 млрд км
controls.zoomSpeed = 1;
controls.rotateSpeed = 0.5;

const speedSlider = document.getElementById('speed-slider');
const speedVal = document.getElementById('speed-val');
speedSlider.addEventListener('input', () => {
    const v = parseInt(speedSlider.value);
    speedVal.textContent = v + 'x';
    controls.zoomSpeed = v;
    controls.rotateSpeed = v * 0.5;
});

// Клик
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
container.addEventListener('click', (e) => {
    mouse.x = (e.clientX/container.clientWidth)*2-1;
    mouse.y = -(e.clientY/container.clientHeight)*2+1;
    raycaster.setFromCamera(mouse, camera);
    const objects = [];
    scene.traverse(c => { if(c.isMesh && c.userData.name) objects.push(c); });
    const intersects = raycaster.intersectObjects(objects);
    if(intersects.length>0){
        const obj = intersects[0].object;
        document.getElementById('info-content').innerHTML = `<h3>${obj.userData.name}</h3><p>${obj.userData.desc||'Планета'}</p>`;
        document.getElementById('info-popup').style.display='block';
    }
});

function animate() {
    requestAnimationFrame(animate);
    const day = getDay();
    
    planetMeshes.forEach(mesh => {
        const p = mesh.userData;
        const angle = (day / p.period) * Math.PI * 2 + p.angle;
        const dist = p.dist * SCALE;
        mesh.position.set(Math.cos(angle)*dist, 0, Math.sin(angle)*dist);
        mesh.rotation.y += 0.002;
        
        // Спутники
        p.moons.forEach((mDef,i) => {
            const mAngle = (day / mDef.period) * Math.PI * 2;
            const mDist = mDef.dist * SCALE;
            const moonMesh = mesh.children[i] || scene.children.find(c=>c.userData?.parent===mesh&&c.userData?.name===mDef.name);
            if(moonMesh){
                moonMesh.position.set(
                    mesh.position.x + Math.cos(mAngle)*mDist,
                    mesh.position.y,
                    mesh.position.z + Math.sin(mAngle)*mDist
                );
            }
        });
    });
    
    // Обновление спутников
    scene.children.forEach(c => {
        if(c.userData?.parent) {
            const parent = c.userData.parent;
            const mAngle = (day / c.userData.period) * Math.PI * 2 + (c.userData.angle||0);
            const mDist = c.userData.dist * SCALE;
            c.position.set(
                parent.position.x + Math.cos(mAngle)*mDist,
                parent.position.y,
                parent.position.z + Math.sin(mAngle)*mDist
            );
        }
    });
    
    controls.update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth/container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});
