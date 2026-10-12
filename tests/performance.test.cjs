const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');

function load(file, globals = {}) {
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  new Function('module', 'exports', ...Object.keys(globals), code)(module, module.exports, ...Object.values(globals));
  return module.exports;
}

const { filmstripRange, THUMBNAIL_STRIDE } = load('src/utils/filmstripRange.ts');
assert.deepEqual(filmstripRange(0, 0, 1440), { start: 0, end: 0 });
assert.deepEqual(filmstripRange(1, 0, 1440), { start: 0, end: 1 });
for (const count of [10, 1700, 100000]) {
  for (const width of [900, 1440, 2560]) {
    for (const left of [0, count * THUMBNAIL_STRIDE / 2, Math.max(0, count * THUMBNAIL_STRIDE - width)]) {
      const { start, end } = filmstripRange(count, left, width);
      assert.ok(start >= 0 && end <= count && start <= end);
      assert.ok(end - start <= Math.ceil(width / THUMBNAIL_STRIDE) + 5);
      const visible = Math.min(count - 1, Math.floor(left / THUMBNAIL_STRIDE));
      assert.ok(visible >= start && visible < end);
    }
  }
}

let requests = 0, decoding = 0, peak = 0, closed = 0;
const { loadJpgThumbnail } = load('src/utils/thumbnailLoader.ts', {
  fetch: async url => {
    requests++;
    await new Promise(resolve => setImmediate(resolve));
    if (url === 'broken') throw new Error('Read failed');
    return { ok: true, blob: async () => url };
  },
  createImageBitmap: async (_, options) => {
    assert.equal(options.resizeWidth, 256);
    peak = Math.max(peak, ++decoding);
    await new Promise(resolve => setImmediate(resolve));
    return { width: 256, height: 384, close() { decoding--; closed++; } };
  },
  document: { createElement: () => ({
    getContext: () => ({ drawImage(_, x, y, width, height) { assert.equal(width, 256); assert.equal(height, 384); } }),
    toDataURL: () => 'data:image/jpeg;base64,thumbnail',
  }) },
});

(async () => {
  const cancelled = new AbortController();
  const signal = new AbortController().signal;
  const loads = [loadJpgThumbnail('first', signal), loadJpgThumbnail('second', signal), loadJpgThumbnail('cancelled', cancelled.signal), loadJpgThumbnail('broken', signal), loadJpgThumbnail('last', signal)];
  cancelled.abort();
  const results = await Promise.allSettled(loads);
  assert.deepEqual(results.map(r => r.status), ['fulfilled', 'fulfilled', 'rejected', 'rejected', 'fulfilled']);
  assert.equal(results[2].reason.name, 'AbortError');
  assert.equal(requests, 4);
  assert.equal(peak, 2);
  assert.equal(closed, 3);
  assert.equal(decoding, 0);
  const beforeCache = requests;
  await loadJpgThumbnail('first', signal);
  assert.equal(requests, beforeCache);
  for (let i = 0; i < 129; i++) await loadJpgThumbnail('photo-' + i, signal);
  const beforeEviction = requests;
  await loadJpgThumbnail('first', signal);
  assert.equal(requests, beforeEviction + 1);
  const activeCancel = new AbortController();
  const stopped = loadJpgThumbnail('active-cancel', activeCancel.signal);
  activeCancel.abort();
  await assert.rejects(stopped, error => error.name === 'AbortError');
  assert.equal(decoding, 0);
  console.log('Filmstrip bounds, thumbnail concurrency, cache eviction, failures, and cancellation passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
