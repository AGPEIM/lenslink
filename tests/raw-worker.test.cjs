const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');

// Exercise the worker entry point without a browser. Real WASM / WebView2
// validation is documented separately; these checks cover lifecycle failures.
function createHarness() {
  const state = { initialized: 0, created: 0, deleted: 0, replies: [], rgba: null,
    failInit: false, failOpen: false, directPixels: false };
  class Decoder {
    constructor() { state.created++; }
    open() { if (state.failOpen) throw new Error('Unsupported RAW file'); }
    imageData() {
      const data = Uint8Array.from([10, 20, 30, 40, 50, 60]);
      return state.directPixels ? data : { data };
    }
    metadata() { return { width: 2, height: 1 }; }
    delete() { state.deleted++; }
  }
  const factory = async () => {
    state.initialized++;
    if (state.failInit) throw new Error('WASM initialization failed');
    return { LibRaw: Decoder };
  };
  const self = { postMessage: reply => state.replies.push(reply) };
  class Canvas {
    getContext() {
      return { createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: image => { state.rgba = [...image.data]; } };
    }
    async convertToBlob() { return {}; }
  }
  class Reader {
    readAsDataURL() { this.result = 'data:image/jpeg;base64,test'; this.onload(); }
  }
  const code = ts.transpileModule(readFileSync('src/workers/rawDecoder.worker.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('require', 'exports', 'self', 'OffscreenCanvas', 'FileReader', 'Worker', code)(
    name => {
      assert.equal(name, 'libraw-wasm/dist/libraw.js', 'Use the module, not the nested-worker client');
      return { default: factory };
    }, {}, self, Canvas, Reader,
    class { constructor() { throw new Error('Nested Worker must not be created'); } },
  );
  return { state, decode: id => self.onmessage({ data: {
    type: 'decode', id, fileBuffer: new ArrayBuffer(8), thumbnail: false,
  } }) };
}

const watchdog = setTimeout(() => {
  console.error('RAW worker tests timed out: an operation did not settle.');
  process.exitCode = 1;
}, 5000);

(async () => {
  const { state, decode } = createHarness();
  await decode('first');
  state.directPixels = true;
  await decode('second');
  assert.equal(state.initialized, 1, 'Reuse the WASM module');
  assert.equal(state.created, 2);
  assert.equal(state.deleted, 2, 'Release native decoder buffers after every file');
  assert.deepEqual(state.rgba, [10, 20, 30, 255, 40, 50, 60, 255]);
  assert.deepEqual(state.replies.map(r => [r.id, r.type]), [['first', 'success'], ['second', 'success']]);

  state.failOpen = true;
  await decode('bad');
  assert.equal(state.replies.at(-1).type, 'error');
  assert.match(state.replies.at(-1).error, /Unsupported RAW/);
  assert.equal(state.deleted, 3, 'Release the decoder on failure too');
  state.failOpen = false;
  await decode('recovered');
  assert.equal(state.replies.at(-1).type, 'success');
  assert.equal(state.deleted, 4);

  const retry = createHarness();
  retry.state.failInit = true;
  await retry.decode('init-failure');
  assert.equal(retry.state.replies[0].type, 'error');
  retry.state.failInit = false;
  await retry.decode('retry');
  assert.equal(retry.state.replies[1].type, 'success');
  assert.equal(retry.state.initialized, 2, 'A rejected initialization must be retryable');
  console.log('RAW worker initialization, pixel conversion, cleanup and recovery passed.');
})().catch(error => { console.error(error); process.exitCode = 1; })
  .finally(() => clearTimeout(watchdog));
