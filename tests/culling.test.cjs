const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');

function load(file, dependencies = {}, globals = {}) {
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', ...Object.keys(globals), code)(name => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, module, module.exports, ...Object.values(globals));
  return module.exports;
}
const types = load('src/types.ts');
const { eyeAspectRatio, eyesAreClosed, imageSharpness, faceIsOutOfFocus, photoSourceKey, applyCullResult } = load('src/utils/cullingMetrics.ts', { '../types': types });

const eye = height => [{ x: 0, y: 0 }, { x: 2, y: -height }, { x: 8, y: -height }, { x: 10, y: 0 }, { x: 8, y: height }, { x: 2, y: height }];
assert.equal(eyeAspectRatio(eye(2)), 0.4);
assert.equal(eyeAspectRatio(eye(0)), 0);
assert.ok(Number.isNaN(eyeAspectRatio([])));
assert.ok(eyesAreClosed(0.9, 0.9, 0.08, 0.09));
assert.ok(eyesAreClosed(0.79, 0.52, 0.04, 0.04));
assert.ok(!eyesAreClosed(0.1, 0.1, 0.3, 0.3));
assert.ok(!eyesAreClosed(0.9, 0.1, 0.08, 0.3));
assert.ok(!eyesAreClosed(NaN, 0.9, 0.08, 0.08));
// Real-photo regressions: half-closed eyes, weak blink scores, and neighboring open-eye frames.
assert.ok(eyesAreClosed(0.40765, 0.33725, 0.16769, 0.14826)); // DSCF8835
assert.ok(eyesAreClosed(0.39074, 0.32820, 0.17169, 0.14911)); // DSCF8835 on macOS WebKit
assert.ok(eyesAreClosed(0.36873, 0.28029, 0.16279, 0.14204)); // DSCF8626 on macOS WebKit
assert.ok(eyesAreClosed(0.28613, 0.31731, 0.17183, 0.18613)); // DSCF8852 on macOS WebKit
assert.ok(eyesAreClosed(0.40987, 0.28004, 0.20352, 0.16361)); // DSCF8904 on macOS WebKit
assert.ok(eyesAreClosed(0.50362, 0.50621, 0.07866, 0.09669)); // DSCF8836
assert.ok(eyesAreClosed(0.61261, 0.40079, 0.09044, 0.04200)); // DSCF8842
assert.ok(!eyesAreClosed(0.15936, 0.08302, 0.28777, 0.26511)); // DSCF8834
assert.ok(!eyesAreClosed(0.22772, 0.17001, 0.24771, 0.24486)); // DSCF8837
assert.ok(!eyesAreClosed(0.4, 0.5, 0.24, 0.25)); // Blink score alone is insufficient.
assert.ok(!eyesAreClosed(0.1, 0.1, 0.1, 0.1)); // Narrow eye shape alone is insufficient.
assert.ok(!eyesAreClosed(0.8, 0.35, 0.08, 0.25)); // One open eye remains a wink.
assert.ok(!eyesAreClosed(0.4, 0.4, 0.2, 0.2)); // Both moderately narrow eyes are insufficient.
assert.ok(!eyesAreClosed(0.36873, 0.1, 0.16, 0.14)); // Both blink scores must support the geometry.

const pixels = (width, height, value) => {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const offset = (y * width + x) * 4;
    rgba.fill(value(x, y), offset, offset + 3); rgba[offset + 3] = 255;
  }
  return rgba;
};
const flat = imageSharpness(pixels(32, 32, () => 128), 32, 32);
const textured = imageSharpness(pixels(32, 32, (x, y) => (x + y) % 2 ? 255 : 0), 32, 32);
assert.equal(flat.variance, 0);
assert.ok(textured.variance > 1000);
assert.throws(() => imageSharpness(new Uint8ClampedArray(4), 32, 32));
assert.ok(faceIsOutOfFocus(10, 5, 8));
assert.ok(!faceIsOutOfFocus(10, 200, 8));
assert.ok(!faceIsOutOfFocus(NaN, 5, 8));

const photo = { id: 'same-name', jpg: { path: '/one/photo.jpg' }, selection: types.SelectionState.PICKED, rating: 5 };
const bad = { status: 'analyzed', faces: [], issues: ['closed_eyes'] };
assert.equal(applyCullResult(photo, bad).selection, types.SelectionState.REJECTED);
assert.equal(applyCullResult(photo, bad).rating, 5);
assert.equal(photo.selection, types.SelectionState.PICKED);
for (const status of ['no_face', 'uncertain', 'error']) assert.equal(applyCullResult(photo, { status, faces: [], issues: [] }).selection, types.SelectionState.PICKED);
assert.equal(applyCullResult(photo, { status: 'analyzed', faces: [], issues: [] }).selection, types.SelectionState.PICKED);
assert.notEqual(photoSourceKey(photo), photoSourceKey({ ...photo, jpg: { path: '/two/photo.jpg' } }));

// A decoder reply must return its worker only once; crashes must reject and let the queue continue.
class FakeWorker {
  listeners = new Map();
  addEventListener(type, callback) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(callback); }
  removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback); }
  terminate() {}
  postMessage(message) {
    queueMicrotask(() => {
      const type = message.id.includes('crash') ? 'error' : 'message';
      for (const callback of [...(this.listeners.get(type) || [])]) callback({ data: { id: message.id, type: 'success', dataUrl: 'data:image/jpeg;base64,AA==' } });
    });
  }
}
const raw = load('src/utils/rawLoader.ts', {
  '@tauri-apps/plugin-fs': { readFile: async () => new Uint8Array(4) },
  '../workers/rawDecoder.worker.ts?worker': { default: FakeWorker },
}, { navigator: { hardwareConcurrency: 2 } });
(async () => {
  const settled = await Promise.allSettled(['first', 'crash', 'third', 'fourth'].map(path => raw.decodeRawFile(path)));
  assert.deepEqual(settled.map(result => result.status), ['fulfilled', 'rejected', 'fulfilled', 'fulfilled']);
  assert.equal(raw.getCacheStats().availableWorkers, raw.getCacheStats().workers);
  raw.releaseRawImage('first');
  assert.equal(raw.getImageFromCache('first'), null);
  console.log('Culling metrics, marking, and RAW worker checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
