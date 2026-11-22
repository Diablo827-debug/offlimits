import React from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { speechLevel } from './lektor.js';

// Żywa prowadząca 3D: cały czas na scenie, płynnie przechodzi między ruchami (przenikanie,
// bez „skoków” pętli), siada na kanapie, gdy gracze długo wybierają, wstaje, czyta, śmieje się całym ciałem.
// Model: public/prowadzacy/3d/postac.glb (szkielet Mixamo + animacje z Meshy). Nazwy ruchów mapujemy niżej;
// pierwsza istniejąca nazwa z listy wygrywa, a przy kilku – losujemy dla urozmaicenia.

const ANIMS = {
  idle: ['idle_full', 'Idle', 'idle_full', 'Listening_Gesture'],
  talk: ['talk_full', 'Talk_with_Hands_Open', 'Talk_Passionately', 'Talk_with_Left_Hand_on_Hip'],
  read: ['read'],
  laugh: ['laugh_full'],
  shocked: ['surprised', 'Mummy_Stagger'],
  happy: ['Victory_Cheer', 'Motivational_Cheer'],
  smug: ['sarcastic', 'Hand_on_Hip_Gesture', 'Finger_Wag_No'],
  bored: ['yawn', 'Confused_Scratch', 'Look_Around_Dumbfounded'],
  wave: ['Big_Wave_Hello'],
  bow: ['Formal_Bow'],
  dance: ['FunnyDancing_01'],
  walk: ['Elderly_Shaky_Walk', 'Walking'],
  sit: ['Chair_Sit_Idle_F'],
  sitTalk: ['Sitting_Answering_Questions'],
  sitRead: ['sit_read'],
  sitLaugh: ['Sitting_Clap'],
  sitHappy: ['Stand_Clap_and_Sit_Down', 'Sitting_Clap'],
  sitSmug: ['Sit_Finger_Wag_No'],
  sitBored: ['Sit_and_Doze_Off', 'Dozing_Elderly'],
  standUp: ['Sit_to_standTransition_Female_2'],
};
// Ruchy w pętli (po końcu płynnie przechodzą w kolejny wariant tego samego) vs jednorazowe (potem powrót).
const LOOP = { idle: 1, talk: 1, read: 1, walk: 1, sit: 1, sitRead: 1, sitTalk: 1, dance: 1 };

function makeSofa() {
  const g = new THREE.Group();
  const velvet = new THREE.MeshStandardMaterial({ color: 0x7a2335, roughness: 0.9 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.6 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xb99662, roughness: 0.35, metalness: 0.7 });
  const box = (w, h, d, m, x, y, z, r) => {
    const geo = new THREE.BoxGeometry(w, h, d, 4, 4, 4);
    // zaokrąglamy krawędzie – pluszowy, bajkowy wygląd
    const p = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const k = 0.06;
      v.x = Math.sign(v.x) * Math.min(Math.abs(v.x), w / 2 - k * (1 - Math.min(1, Math.abs(v.y) / (h / 2)) ** 4) * 0.5);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    const b = new THREE.Mesh(geo, m);
    b.position.set(x, y, z);
    if (r) b.rotation.x = r;
    b.castShadow = b.receiveShadow = true;
    g.add(b);
    return b;
  };
  box(1.6, 0.22, 0.85, velvet, 0, 0.42, 0); // siedzisko (górna krawędź: 0.53)
  box(1.65, 0.75, 0.22, velvet, 0, 0.85, -0.38, -0.12); // oparcie
  box(0.22, 0.55, 0.9, velvet, -0.87, 0.62, 0); // podłokietniki
  box(0.22, 0.55, 0.9, velvet, 0.87, 0.62, 0);
  box(1.8, 0.12, 0.9, wood, 0, 0.27, 0);
  [-0.8, 0.8].forEach((x) => [-0.35, 0.35].forEach((z) => box(0.08, 0.22, 0.08, gold, x, 0.11, z)));
  const pillow = box(0.42, 0.34, 0.14, new THREE.MeshStandardMaterial({ color: 0xb99662, roughness: 0.8 }), 0.52, 0.72, -0.2, -0.25);
  pillow.rotation.z = 0.15;
  g.userData.seatTop = 0.53;
  return g;
}

// Ślad biodra: zostawiamy ruch w górę/dół i kołysanie, ale zerujemy położenie startowe, żeby
// każdy ruch zaczynał się w tym samym miejscu – przenikanie nie „przesuwa” postaci po podłodze.
// Dla chodu zdejmujemy też dryf do przodu (przesuwamy całą postać z tą samą prędkością – stopy nie ślizgają się).
function prepClip(clip, { inPlace = false, seatY = 0, fadeSeat = false } = {}) {
  const tr = clip.tracks.find((t) => /Hips\.position$/.test(t.name));
  if (!tr) return { drift: 0 };
  const v = tr.values;
  const n = v.length / 3;
  const x0 = v[0];
  const z0 = v[2];
  // ruchy na siedząco mają różną wysokość biodra – wyrównujemy do jednej (żeby nie zapadała się w kanapę ani nie wisiała)
  if (seatY) {
    const dy = seatY - v[1];
    const T0 = tr.times[n - 1] || 1;
    for (let i = 0; i < n; i++) v[i * 3 + 1] += fadeSeat ? dy * Math.max(0, 1 - tr.times[i] / (T0 * 0.6)) : dy;
  }
  const dz = v[(n - 1) * 3 + 2] - z0;
  const dx = v[(n - 1) * 3] - x0;
  const T = tr.times[n - 1] || 1;
  for (let i = 0; i < n; i++) {
    const k = inPlace ? tr.times[i] / T : 0;
    v[i * 3] -= x0 + dx * k;
    v[i * 3 + 2] -= z0 + dz * k;
  }
  return { drift: inPlace ? dz / T : 0, end: [v[(n - 1) * 3], v[(n - 1) * 3 + 2]] };
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
    const lite = /[?&]lite=1/.test(location.search);
    const renderer = new THREE.WebGLRenderer({ antialias: !lite, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1 : 1.5));
    renderer.setSize(W(), H());
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = !lite;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.5;
    const camera = new THREE.PerspectiveCamera(30, W() / H(), 0.1, 50);
    const CAM_LOOK = new THREE.Vector3(0, 0.8, -0.2);
    camera.position.set(0, 1.45, 6.2);
    camera.lookAt(CAM_LOOK);
    scene.add(new THREE.HemisphereLight(0xfff4e6, 0x2a1a14, 1.2));
    const fill = new THREE.DirectionalLight(0xffffff, 1.1);
    fill.position.set(-2, 2.5, 4);
    scene.add(fill);
    const key = new THREE.SpotLight(0xffe2b0, 55, 20, 0.6, 0.6);
    key.position.set(1.8, 4.5, 4);
    key.target.position.set(0, 0.8, -0.3);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0004;
    scene.add(key, key.target);
    const rim = new THREE.DirectionalLight(0xc9a86b, 1.3);
    rim.position.set(-3, 3, -3);
    scene.add(rim);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(3.2, 48), new THREE.ShadowMaterial({ opacity: 0.45 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const sofa = makeSofa();
    scene.add(sofa);

    const clock = new THREE.Clock();
    let mixer = null;
    const clips = {}; // nazwa → { clip, clone, drift, end }
    let current = null; // { action, state, name }
    let model = null; // korzeń postaci (przesuwamy go po scenie)
    let headBone = null;
    let hipsScale = 1; // jednostki ścieżki biodra → metry sceny
    let place = 'stand'; // stand | sofa | walking | sitting | standing
    let walk = null;
    let busyUntil = 0;
    const STAND = new THREE.Vector3(0.1, 0, 0.5);
    const SEAT = new THREE.Vector3(0, 0, -0.75); // gdzie stoi korzeń postaci, gdy siedzi (kalibrowane po wczytaniu)
    let sitOffset = 0.3; // o ile do przodu wstaje (z ruchu wstawania)

    const pickName = (state) => {
      const names = (ANIMS[state] || [state]).filter((n) => clips[n]);
      if (!names.length) return null;
      return names[Math.floor(Math.random() * names.length)];
    };
    const has = (state) => !!pickName(state);
    // Każdy klip ma dwie kopie (A/B), żeby pętlę robić przenikaniem z samym sobą – bez szarpnięcia.
    const actionFor = (name) => {
      const c = clips[name];
      const useB = current && current.name === name && current.action.getClip() === c.clip;
      return mixer.clipAction(useB ? c.clone : c.clip);
    };
    const play = (state, fade = 0.5, opts = {}) => {
      if (!mixer) return null;
      const name = opts.name || pickName(state);
      if (!name) return null;
      if (current && current.state === state && !opts.restart && LOOP[state]) return current.action;
      const a = actionFor(name);
      a.reset();
      a.setLoop(THREE.LoopOnce, 1);
      a.clampWhenFinished = true;
      a.timeScale = opts.reverse ? -1 : 1;
      if (opts.reverse) a.time = a.getClip().duration;
      a.enabled = true;
      a.setEffectiveWeight(1);
      if (current) a.crossFadeFrom(current.action, fade, true);
      else a.fadeIn(fade);
      a.play();
      current = { action: a, state, name, fade, reverse: !!opts.reverse, onEnd: opts.onEnd };
      return a;
    };
    const restState = () => (place === 'sofa' ? 'sit' : 'idle');

    const goTo = (target, then) => {
      if (!model) return;
      const from = model.position.clone();
      const dist = Math.hypot(target.x - from.x, target.z - from.z);
      if (dist < 0.05) { model.position.copy(target); if (then) then(); return; }
      place = 'walking';
      walk = { to: target.clone(), then };
      play('walk', 0.4);
    };
    const sitDown = () => {
      // siadanie = wstawanie puszczone od końca: patrzy w kamerę i opada na kanapę.
      const up = pickName('standUp');
      place = 'sitting';
      if (!up) { model.position.copy(SEAT); place = 'sofa'; play('sit', 0.8); return; }
      model.position.set(SEAT.x, 0, SEAT.z);
      play('standUp', 0.45, { reverse: true, onEnd: () => { place = 'sofa'; play('sit', 0.6); } });
    };
    const toSofa = () => {
      if (place !== 'stand' || !model) return;
      goTo(new THREE.Vector3(SEAT.x, 0, SEAT.z + sitOffset), sitDown);
    };
    const toStage = (then) => {
      if (!model) return;
      if (place === 'stand') { if (then) then(); return; }
      if (place === 'sofa') {
        if (!has('standUp')) { place = 'stand'; model.position.copy(STAND); play('idle', 0.8); if (then) then(); return; }
        place = 'standing';
        play('standUp', 0.35, {
          onEnd: () => {
            model.position.z += sitOffset;
            place = 'stand';
            play('idle', 0.25);
            goTo(STAND, () => { place = 'stand'; play('idle', 0.5); if (then) then(); });
          },
        });
        return;
      }
      if (place === 'walking' && walk) { walk.then = () => { place = 'stand'; play('idle', 0.5); if (then) then(); }; return; }
    };
    const react = (state, fade = 0.35) => {
      // reakcja w miejscu, gdzie jest (na kanapie – wersja na siedząco, jeśli istnieje)
      if (place === 'sofa') {
        const s = { laugh: 'sitLaugh', read: 'sitRead', talk: 'sitTalk', happy: 'sitHappy', bored: 'sitBored', smug: 'sitSmug', sit: 'sit', idle: 'sit' }[state];
        if (s && has(s)) { play(s, fade, { restart: true }); return true; }
        return false;
      }
      if (place !== 'stand') return false;
      play(state, fade, { restart: !LOOP[state] });
      return true;
    };

    api.current = window.__babcia = {
      play: (s, f) => react(s, f),
      toSofa,
      toStage,
      react,
      get place() { return place; },
      get state() { return current ? current.state : ''; },
      busy: (ms) => { busyUntil = Date.now() + ms; },
      get busyNow() { return Date.now() < busyUntil; },
    };

    new GLTFLoader().load(url, (gltf) => {
      if (dead) return;
      const inner = gltf.scene;
      // wysokość postaci ~1.55 m niezależnie od skali modelu
      const box = new THREE.Box3().setFromObject(inner);
      const h = box.max.y - box.min.y || 1;
      inner.scale.setScalar(1.55 / h);
      model = new THREE.Group();
      model.add(inner);
      model.position.copy(STAND);
      let hips = null;
      inner.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          o.frustumCulled = false;
          [].concat(o.material || []).forEach((m) => {
            if (m.metalness !== undefined) m.metalness = Math.min(m.metalness, 0.05);
            if (m.roughness !== undefined) m.roughness = Math.max(0.55, Math.min(m.roughness, 0.85));
            if (m.map) { m.map.colorSpace = THREE.SRGBColorSpace; m.map.anisotropy = 8; }
            m.needsUpdate = true;
          });
        }
        if (!hips && o.isBone && /Hips$/.test(o.name)) hips = o;
        if (!headBone && o.isBone && /(^|[^a-z])Head$/i.test(o.name)) headBone = o;
      });
      scene.add(model);
      model.updateMatrixWorld(true);
      if (hips && hips.parent) {
        const s = new THREE.Vector3();
        hips.parent.getWorldScale(s);
        hipsScale = s.z || 1;
      }
      mixer = new THREE.AnimationMixer(inner);
      const hipsY0 = (c) => { const t = c && c.tracks.find((x) => /Hips\.position$/.test(x.name)); return t ? t.values[1] : 0; };
      const seatY = hipsY0(gltf.animations.find((c) => ANIMS.sit.includes(c.name)));
      const standY = hipsY0(gltf.animations.find((c) => ANIMS.idle.includes(c.name))) || 1;
      gltf.animations.forEach((c) => {
        const walkClip = (ANIMS.walk || []).includes(c.name);
        const seated = seatY && hipsY0(c) < (seatY + standY) / 2;
        const info = prepClip(c, { inPlace: walkClip, seatY: seated ? seatY : 0, fadeSeat: ANIMS.standUp.includes(c.name) });
        const clone = c.clone();
        clone.name = c.name + '#b';
        clips[c.name] = { clip: c, clone, ...info };
      });
      // Kalibracja kanapy: wysokość biodra w siadzie → siedzisko tuż pod nim.
      const sitName = pickName('sit');
      const upName = pickName('standUp');
      if (upName && clips[upName].end) sitOffset = clips[upName].end[1] * hipsScale;
      if (sitName && hips) {
        const a = mixer.clipAction(clips[sitName].clip);
        a.play();
        mixer.setTime(0);
        model.position.set(0, 0, 0);
        model.updateMatrixWorld(true);
        const p = new THREE.Vector3();
        hips.getWorldPosition(p);
        a.stop();
        const seatY = Math.max(0.3, p.y - 0.11);
        const k = seatY / sofa.userData.seatTop;
        sofa.scale.set(1, k, 1);
        // biodro ~0.18 m od przedniej krawędzi siedziska
        const sofaZ = SEAT.z + p.z - 0.27;
        sofa.position.set(SEAT.x + p.x, 0, sofaZ);
        model.position.copy(STAND);
      }
      mixer.addEventListener('finished', (e) => {
        if (!current || e.action !== current.action) return;
        const done = current;
        if (done.onEnd) { done.onEnd(); return; }
        if (place === 'walking') return;
        play(LOOP[done.state] ? done.state : restState(), LOOP[done.state] ? 0.6 : 0.5, { restart: true });
      });
      play('idle', 0);
      // na start – powitanie
      setTimeout(() => { if (!dead && place === 'stand') react('wave'); }, 1200);
    });

    let raf = 0;
    let lastW = 0;
    let lastH = 0;
    // Tryb nagrywania (?nagraj=1): klatki liczone ręcznie, równo co 1/30 s – do filmów pokazowych.
    const manual = /[?&]nagraj=1/.test(location.search);
    const tick = () => {
      if (!manual) raf = requestAnimationFrame(tick);
      frame(Math.min(clock.getDelta(), 0.1));
    };
    if (manual) window.__avFrame = (dt) => frame(dt);
    const frame = (dt) => {
      if (W() !== lastW || H() !== lastH) {
        lastW = W(); lastH = H();
        renderer.setSize(lastW, lastH);
        camera.aspect = lastW / lastH;
        // wąski kadr (portret) – kamera dalej, żeby kanapa i babcia się zmieściły
        camera.position.z = camera.aspect < 0.75 ? 7.4 : 6.2;
        camera.lookAt(CAM_LOOK);
        camera.updateProjectionMatrix();
      }
      // pętle: przenikanie z kolejnym wariantem zanim klip się skończy
      if (current && LOOP[current.state] && !current.onEnd) {
        const a = current.action;
        const left = a.getClip().duration - a.time;
        if (left < (current.fade || 0.5) + 0.05) play(current.state, 0.6, { restart: true });
      }
      if (mixer) mixer.update(dt);
      if (model && walk) {
        const c = current && clips[current.name];
        const speed = Math.max(0.38, Math.abs((c && c.drift) || 0.12) * hipsScale * 1.3);
        const dx = walk.to.x - model.position.x;
        const dz = walk.to.z - model.position.z;
        const dist = Math.hypot(dx, dz);
        const arrived = dist < 0.03 || walk.turning;
        if (dist < 0.03) walk.turning = true;
        const face = arrived ? (walk.face ?? 0) : Math.atan2(dx, dz);
        let diff = face - model.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        model.rotation.y += diff * Math.min(1, dt * 5);
        // idzie dopiero, gdy jest mniej więcej zwrócona w stronę celu (najpierw obrót w miejscu)
        const step = !arrived && Math.abs(diff) < 0.9 ? Math.min(dist, speed * dt) : 0;
        model.position.x += (dx / (dist || 1)) * step;
        model.position.z += (dz / (dist || 1)) * step;
        // na miejscu: obrót przodem do widzów (drobiąc w miejscu), dopiero potem dalszy ruch
        if (arrived && Math.abs(diff) < 0.08) {
          const then = walk.then;
          walk = null;
          model.rotation.y = face;
          if (then) then();
        }
      } else if (model) {
        let diff = -model.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        model.rotation.y += diff * Math.min(1, dt * 4);
      }
      // mowa: głowa w rytm lektora (model nie ma kształtów ust – mówi całym ciałem i głową)
      const lvl = speechLevel();
      if (headBone && lvl > 0.02) {
        const t = performance.now() / 1000;
        headBone.rotation.x += Math.sin(t * 9) * lvl * 0.07;
        headBone.rotation.z += Math.sin(t * 4.3) * lvl * 0.05;
      }
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      renderer.dispose();
      pmrem.dispose();
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
        const reading = d.mood === 'q' || d.mood === 'a';
        // na kanapie czyta pytanie na siedząco; resztę mówi na stojąco, całym ciałem
        // na kanapie mówi i czyta na siedząco; na stojąco – całym ciałem
        if (a.place === 'sofa' && a.react(reading ? 'read' : 'talk')) return;
        a.toStage(() => a.react(reading ? 'read' : 'talk', 0.4));
      } else {
        setTalk(null);
        if (d.mood === 'a') a.react('laugh', 0.3);
        else if (/^h[bs]/.test(d.mood || '') && Math.random() < 0.5) a.react('smug', 0.4);
        else if (a.place === 'stand' && /^(talk|read)$/.test(a.state)) a.react('idle', 0.7);
        else if (a.place === 'sofa' && /^sit(Read|Talk)$/.test(a.state)) a.react('sit', 0.7);
      }
    };
    window.addEventListener('ol-speak', on);
    return () => window.removeEventListener('ol-speak', on);
  }, []);

  // Etapy gry: przy długim wybieraniu siada na kanapie (i czasem ziewa / drzemie), przy głosowaniu – zdziwienie,
  // wynik – radość, koniec – taniec.
  const stageAt = React.useRef({ key: '', at: Date.now() });
  const key = room.state + '-' + room.round;
  if (stageAt.current.key !== key) stageAt.current = { key, at: Date.now() };
  const [, tick] = React.useState(0);
  React.useEffect(() => { const i = setInterval(() => tick((n) => n + 1), 1500); return () => clearInterval(i); }, []);
  const directed = React.useRef('');
  const lastIdleAct = React.useRef(0);
  React.useEffect(() => {
    const a = api.current;
    if (!a || talk) return;
    const since = Date.now() - stageAt.current.at;
    if (room.state === 'picking' || room.state === 'lobby') {
      if (since > 9000) a.toSofa();
      if (since > 25000 && Date.now() - lastIdleAct.current > 14000 && Math.random() < 0.15) {
        lastIdleAct.current = Date.now();
        if (a.place === 'sofa' && a.state === 'sit') a.react('bored', 0.6);
        else if (a.place === 'stand' && a.state === 'idle') a.react(Math.random() < 0.5 ? 'bored' : 'smug', 0.6);
      }
      return;
    }
    if (directed.current === key) return; // każdy etap reżyserujemy raz
    directed.current = key;
    if (room.state === 'voting') a.toStage(() => a.react('shocked', 0.35));
    else if (room.state === 'judging') a.toStage(() => a.react('smug', 0.4));
    else if (room.state === 'result') {
      if (a.place === 'sofa') a.react('happy', 0.35);
      else a.toStage(() => a.react('happy', 0.35));
    } else if (room.state === 'end') a.toStage(() => a.react('dance', 0.5));
    else if (room.state === 'reveal' && room.round === 1) a.toStage(() => a.react('bow', 0.4));
    else a.toStage();
  });

  return <div className="avatar3d" ref={host} />;
}
