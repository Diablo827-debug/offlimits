import React from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { speechLevel } from './lektor.js';

// Żywa prowadząca 3D: cały czas na scenie, płynnie przechodzi między ruchami,
// siada na kanapie, gdy gracze długo wybierają, wstaje do czytania, rusza głową i ustami w rytm lektora.
// Model: public/prowadzacy/3d/postac.glb (szkielet + animacje). Nazwy animacji mapujemy niżej.

// Ruch logiczny → możliwe nazwy animacji w modelu (pierwsza znaleziona wygrywa).
const ANIMS = {
  idle: ['Idle', 'idle', 'Standing Idle', 'Breathing Idle'],
  talk: ['Talking', 'talking', 'Talk', 'Yes', 'Wave'],
  read: ['Reading', 'Talking', 'Yes'],
  laugh: ['Laughing', 'laugh', 'Dance', 'ThumbsUp'],
  shocked: ['Surprised', 'Shocked', 'Jump'],
  happy: ['Clapping', 'Cheering', 'ThumbsUp', 'Wave'],
  smug: ['Thinking', 'No', 'Idle'],
  bored: ['Yawn', 'Bored', 'Sitting Idle', 'Sitting', 'Idle'],
  walk: ['Walking', 'Walk', 'walking'],
  sit: ['Sitting Idle', 'Sitting', 'sit'],
  sitDown: ['Stand To Sit', 'Sit Down', 'Sitting'],
  standUp: ['Sit To Stand', 'Stand Up', 'Standing'],
  dance: ['Dance', 'Dancing', 'Clapping'],
};
const ONCE = { laugh: 1, shocked: 1, happy: 1, sitDown: 1, standUp: 1 }; // grane raz, potem powrót

function makeSofa() {
  const g = new THREE.Group();
  const velvet = new THREE.MeshStandardMaterial({ color: 0x6b1f2d, roughness: 0.85 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.6 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xb99662, roughness: 0.35, metalness: 0.7 });
  const box = (w, h, d, m, x, y, z, r) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); if (r) b.rotation.x = r; b.castShadow = b.receiveShadow = true; g.add(b); return b; };
  box(1.6, 0.22, 0.85, velvet, 0, 0.42, 0); // siedzisko
  box(1.65, 0.75, 0.22, velvet, 0, 0.85, -0.38, -0.12); // oparcie
  box(0.22, 0.55, 0.9, velvet, -0.87, 0.62, 0); // podłokietniki
  box(0.22, 0.55, 0.9, velvet, 0.87, 0.62, 0);
  box(1.8, 0.12, 0.9, wood, 0, 0.27, 0);
  [-0.8, 0.8].forEach((x) => [-0.35, 0.35].forEach((z) => box(0.08, 0.22, 0.08, gold, x, 0.11, z)));
  // poduszka z koroną (kolor marki)
  const pillow = box(0.42, 0.34, 0.14, new THREE.MeshStandardMaterial({ color: 0xb99662, roughness: 0.7 }), 0.5, 0.72, -0.22, -0.25);
  pillow.rotation.z = 0.15;
  return g;
}

export default function Avatar3D({ url, room }) {
  const host = React.useRef(null);
  const api = React.useRef(null);

  React.useEffect(() => {
    const el = host.current;
    if (!el || !url) return undefined;
    let dead = false;
    const W = () => el.clientWidth || 300;
    const H = () => el.clientHeight || 500;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(W(), H());
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, W() / H(), 0.1, 50);
    camera.position.set(0, 1.7, 8.2);
    camera.lookAt(0, 0.85, -0.3);
    scene.add(new THREE.HemisphereLight(0xfff1dc, 0x241812, 1.1));
    const key = new THREE.SpotLight(0xffe2b0, 60, 20, 0.55, 0.6);
    key.position.set(1.8, 4.5, 4);
    key.target.position.set(0, 0.8, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key, key.target);
    const rim = new THREE.DirectionalLight(0xc9a86b, 1.4);
    rim.position.set(-3, 3, -3);
    scene.add(rim);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(3.2, 48), new THREE.ShadowMaterial({ opacity: 0.45 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const sofa = makeSofa();
    sofa.position.set(0, 0, -1.3);
    scene.add(sofa);

    const clock = new THREE.Clock();
    let mixer = null;
    let actions = {};
    let current = null;
    let currentName = '';
    let model = null;
    let headBone = null;
    let mouthMorphs = [];
    let faceMorphs = {};
    let place = 'stand'; // stand | sofa | walking
    let walk = null; // { from, to, t, dur, then }

    const find = (name) => {
      for (const n of ANIMS[name] || [name]) if (actions[n]) return actions[n];
      return null;
    };
    const play = (name, fade = 0.45) => {
      const a = find(name);
      if (!a || a === current) return a;
      a.reset();
      a.setLoop(ONCE[name] ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
      a.clampWhenFinished = !!ONCE[name];
      a.enabled = true;
      a.setEffectiveWeight(1);
      if (current) a.crossFadeFrom(current, fade, true);
      a.play();
      current = a;
      currentName = name;
      return a;
    };

    const SOFA = new THREE.Vector3(0, 0.12, -1.15);
    const STAND = new THREE.Vector3(0, 0, 0.6);
    const goTo = (target, then) => {
      if (!model) return;
      const from = model.position.clone();
      const dist = from.distanceTo(target);
      if (dist < 0.05) { if (then) then(); return; }
      place = 'walking';
      walk = { from, to: target.clone(), t: 0, dur: Math.max(0.8, dist / 0.9), then };
      play('walk', 0.3);
    };
    const toSofa = () => {
      if (place === 'sofa' || place === 'walking' || !model) return;
      goTo(SOFA, () => { place = 'sofa'; play(find('sitDown') && find('sitDown') !== find('sit') ? 'sitDown' : 'sit', 0.4); });
    };
    const toStage = (then) => {
      if (!model) return;
      if (place === 'stand') { if (then) then(); return; }
      if (place === 'sofa') {
        const up = find('standUp');
        if (up && up !== find('sit')) {
          play('standUp', 0.3);
          setTimeout(() => goTo(STAND, () => { place = 'stand'; play('idle'); if (then) then(); }), Math.min(1800, (up.getClip().duration || 1) * 1000));
          place = 'walking';
          return;
        }
      }
      goTo(STAND, () => { place = 'stand'; play('idle'); if (then) then(); });
    };

    api.current = { play, toSofa, toStage, get place() { return place; }, get name() { return currentName; } };

    new GLTFLoader().load(url, (gltf) => {
      if (dead) return;
      model = gltf.scene;
      // wysokość postaci ~1.6 m niezależnie od skali modelu
      const box = new THREE.Box3().setFromObject(model);
      const h = box.max.y - box.min.y || 1;
      const s = 1.6 / h;
      model.scale.setScalar(s);
      model.position.copy(STAND);
      model.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          const dict = o.morphTargetDictionary;
          if (dict) {
            Object.keys(dict).forEach((k) => {
              if (/jawOpen|mouthOpen|viseme_aa|mouth_open|Mouth_Open/i.test(k)) mouthMorphs.push([o, dict[k]]);
              faceMorphs[k] = faceMorphs[k] || [];
              faceMorphs[k].push([o, dict[k]]);
            });
          }
        }
        if (!headBone && o.isBone && /head$|Head$|mixamorigHead/.test(o.name)) headBone = o;
      });
      scene.add(model);
      mixer = new THREE.AnimationMixer(model);
      gltf.animations.forEach((c) => { actions[c.name] = mixer.clipAction(c); });
      mixer.addEventListener('finished', (e) => {
        if (e.action === find('sitDown')) play('sit', 0.3);
        else if (e.action === current && place !== 'walking') play(place === 'sofa' ? 'sit' : 'idle', 0.5);
      });
      play('idle', 0);
    });

    let raf = 0;
    let lastW = 0;
    let lastH = 0;
    const tmp = new THREE.Vector3();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.1);
      if (W() !== lastW || H() !== lastH) {
        lastW = W(); lastH = H();
        renderer.setSize(lastW, lastH);
        camera.aspect = lastW / lastH;
        camera.updateProjectionMatrix();
      }
      if (mixer) mixer.update(dt);
      if (model && walk) {
        walk.t += dt;
        const k = Math.min(1, walk.t / walk.dur);
        model.position.lerpVectors(walk.from, walk.to, k);
        tmp.subVectors(walk.to, walk.from);
        const face = Math.atan2(tmp.x, tmp.z);
        model.rotation.y += ((k < 0.92 ? face : 0) - model.rotation.y) * Math.min(1, dt * 8);
        if (k >= 1) { const then = walk.then; walk = null; model.rotation.y = 0; if (then) then(); }
      } else if (model) {
        model.rotation.y += (0 - model.rotation.y) * Math.min(1, dt * 6);
      }
      // mowa: usta + głowa w rytm lektora
      const lvl = speechLevel();
      mouthMorphs.forEach(([m, i]) => { m.morphTargetInfluences[i] += (lvl - m.morphTargetInfluences[i]) * 0.5; });
      if (headBone && lvl > 0.02) {
        const t = performance.now() / 1000;
        headBone.rotation.x += Math.sin(t * 9) * lvl * 0.06;
        headBone.rotation.y += Math.sin(t * 4.3) * lvl * 0.05;
      }
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      api.current = null;
    };
  }, [url]);

  // Reżyseria: co robi postać w danym momencie gry.
  const [talk, setTalk] = React.useState(null);
  React.useEffect(() => {
    const on = (ev) => {
      const d = ev.detail || {};
      const a = api.current;
      if (!a) return;
      if (d.on) {
        setTalk(d.mood || 't');
        a.toStage(() => a.play(d.mood === 'q' || d.mood === 'a' ? 'read' : 'talk', 0.35));
      } else {
        setTalk(null);
        if (d.mood === 'a') a.play('laugh', 0.25);
        else if (a.place === 'stand') a.play('idle', 0.6);
      }
    };
    window.addEventListener('ol-speak', on);
    return () => window.removeEventListener('ol-speak', on);
  }, []);

  // Etapy gry: przy długim wybieraniu siada na kanapie, przy głosowaniu – szok, wynik – radość, koniec – taniec.
  const stageAt = React.useRef({ key: '', at: Date.now() });
  const key = room.state + '-' + room.round;
  if (stageAt.current.key !== key) stageAt.current = { key, at: Date.now() };
  const [, tick] = React.useState(0);
  React.useEffect(() => { const i = setInterval(() => tick((n) => n + 1), 1500); return () => clearInterval(i); }, []);
  const directed = React.useRef('');
  React.useEffect(() => {
    const a = api.current;
    if (!a || talk) return;
    const since = Date.now() - stageAt.current.at;
    if (room.state === 'picking' || room.state === 'lobby') {
      if (since > 9000) a.toSofa();
      if (since > 40000 && a.place === 'sofa' && Math.random() < 0.12) a.play('bored', 0.6);
      return;
    }
    if (directed.current === key) return; // każdy etap reżyserujemy raz
    directed.current = key;
    if (room.state === 'voting') a.toStage(() => a.play('shocked', 0.3));
    else if (room.state === 'result') a.toStage(() => a.play('happy', 0.3));
    else if (room.state === 'end') a.toStage(() => a.play('dance', 0.4));
    else a.toStage();
  });

  return <div className="avatar3d" ref={host} />;
}
