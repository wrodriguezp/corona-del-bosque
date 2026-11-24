import * as THREE from 'three';
import { makeGuardBunny, makeGuardTroll } from './critters.js';
import { makeKing } from './characters.js';

// Rivales del equipo: los guardianes y el Rey Sombrío. Todos responden igual:
// root, update(dt, time) y set(pose) con 'idle', 'cheer' (se ríe) o 'hurt' (pierde).
export function makeFoe(kind) {
  if (kind === 'rey') {
    const k = makeKing();
    return { root: k.root, king: k, update: (dt) => k.update(dt), set: (pose, dur) => k.set(pose === 'cheer' ? 'cast' : pose, dur) };
  }
  const c = kind === 'troll' ? makeGuardTroll() : makeGuardBunny();
  const root = new THREE.Group();
  root.add(c);
  c.scale.setScalar(kind === 'troll' ? 2.1 : 2.6);
  let pose = 'idle', t0 = 0, until = Infinity;
  return {
    root,
    set(p, dur = Infinity) { pose = p; t0 = 0; until = dur; },
    update(dt, time) {
      t0 += dt;
      if (t0 > until) pose = 'idle';
      c.userData.idle(time);
      // Se ríe dando saltitos, o tiembla cuando pierde.
      c.position.y = pose === 'cheer' ? Math.abs(Math.sin(t0 * 9)) * 0.25 : 0;
      c.rotation.z = pose === 'hurt' ? Math.sin(t0 * 30) * 0.15 * Math.max(0, 1 - t0) : 0;
    },
  };
}
