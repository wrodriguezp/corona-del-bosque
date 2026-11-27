import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

// Las escenas guardan su estado en el MiniView (`v`). Si una usa el nombre de un
// método (`v.flip = 0`), lo pisa y el minijuego se congela al empezar.
test('ninguna escena de minijuego pisa un método del MiniView', () => {
  const dir = new URL('../src/view/', import.meta.url);
  const src = readFileSync(new URL('minigames.js', dir), 'utf8');
  const cls = src.slice(src.indexOf('export class MiniView'));
  const methods = [...cls.matchAll(/^ {2}(?:async )?([a-zA-Z]+)\(/gm)].map((m) => m[1]).filter((m) => m !== 'constructor');
  assert.ok(methods.includes('flip') && methods.includes('input'));
  const bad = [];
  for (const f of readdirSync(dir).filter((f) => f.startsWith('minigames'))) {
    const code = readFileSync(new URL(f, dir), 'utf8');
    for (const m of methods) if (new RegExp(`\\bv\\.${m}\\s*=[^=]`).test(code)) bad.push(`${f}: v.${m}`);
  }
  assert.deepEqual(bad, []);
});
