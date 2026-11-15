const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = readFileSync(path.join(__dirname, '../src/utils/rawLoader.ts'), 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const turn = () => new Promise(setImmediate);

function harness(options = {}) {
  const workers = [];
  const reads = [];
  const timers = new Map();
  let timerId = 0;
  let constructions = 0;
  let activeReads = 0;
  let peakReads = 0;
  class FakeWorker {
    listeners = new Map();
    messages = [];
    terminated = false;
    constructor() {
      constructions++;
      options.construct?.(constructions);
      workers.push(this);
    }
    addEventListener(type, callback) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type).add(callback);
    }
    removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback); }
    terminate() { this.terminated = true; }
    postMessage(message, transfer) {
      assert.equal(this.terminated, false, 'must not post to a terminated worker');
      this.messages.push(message);
      assert.deepEqual(transfer, [message.fileBuffer], 'transfer the owned RAW buffer instead of cloning it');
      options.postMessage?.(this, message);
    }
    emit(type, data) {
      const event = type === 'message' ? { data } : { message: data, preventDefault() {} };
      // Include property handlers so a duplicate global/per-request return regresses this test.
      this['on' + type]?.(event);
      for (const callback of [...(this.listeners.get(type) || [])]) callback(event);
    }
    succeed(message = this.messages.at(-1)) {
      this.emit('message', { type: 'success', id: message.id, dataUrl: `data:image/jpeg;base64,${message.id}` });
    }
  }
  const dependencies = {
    '@tauri-apps/plugin-fs': { readFile: async file => {
      reads.push(file);
      peakReads = Math.max(peakReads, ++activeReads);
      try { return options.readFile ? await options.readFile(file) : new Uint8Array([1, 2, 3, 4]); }
      finally { activeReads--; }
    } },
    '../workers/rawDecoder.worker.ts?worker': { default: FakeWorker },
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'navigator', 'setTimeout', 'clearTimeout', 'console', code)(
    name => { assert.ok(name in dependencies, `Unexpected dependency: ${name}`); return dependencies[name]; },
    module, module.exports, { hardwareConcurrency: options.limit ?? 2 },
    (fn, ms) => { assert.ok(ms > 0); timers.set(++timerId, fn); return timerId; },
    id => timers.delete(id), { log() {}, error() {} },
  );
  return {
    raw: module.exports, workers, reads, timers,
    get peakReads() { return peakReads; },
    fireTimeout() {
      const [id, fn] = timers.entries().next().value;
      timers.delete(id);
      fn();
    },
    assertIdle() {
      const stats = module.exports.getCacheStats();
      assert.equal(stats.pendingRequests, 0);
      assert.equal(stats.ongoingDecodes, 0);
      assert.equal(stats.availableWorkers, stats.workers, 'each worker must return exactly once');
      assert.equal(timers.size, 0);
    },
  };
}

async function testBoundedQueueAndStaleReplies() {
  const h = harness();
  const all = Promise.all(Array.from({ length: 6 }, (_, i) => h.raw.decodeRawFile(`photo-${i}`)));
  await turn();
  assert.equal(h.workers.length, 2);
  assert.equal(h.reads.length, 2, 'queued RAW files must not be read into memory');
  assert.equal(h.raw.getCacheStats().pendingRequests, 4);
  const first = h.workers[0].messages[0];
  h.workers[0].succeed(first);
  h.workers[0].succeed(first);
  await turn();
  assert.equal(h.reads.length, 3, 'duplicate reply must not release two slots');
  h.workers[0].succeed(first); // A stale reply after the worker has been reused.
  await turn();
  assert.equal(h.reads.length, 3);
  const completed = new Set([first.id]);
  while (completed.size < 6) {
    for (const worker of h.workers) {
      const message = worker.messages.at(-1);
      if (message && !completed.has(message.id)) {
        completed.add(message.id);
        worker.succeed(message);
      }
    }
    await turn();
  }
  assert.equal((await all).length, 6);
  assert.equal(h.workers.length, 2);
  assert.equal(completed.size, 6, 'every task uses a unique request ID');
  h.assertIdle();
}

async function testReadConcurrencyAndLateCompletion() {
  const waiting = new Map();
  const h = harness({ readFile: file => new Promise(resolve => waiting.set(file, resolve)) });
  const all = Promise.allSettled(['one', 'two', 'three'].map(file => h.raw.decodeRawFile(file)));
  await turn();
  assert.deepEqual(h.reads, ['one', 'two']);
  assert.equal(h.peakReads, 2);
  waiting.get('one')(new Uint8Array([7]));
  await turn();
  h.workers[0].succeed();
  await turn();
  assert.deepEqual(h.reads, ['one', 'two', 'three']);
  assert.equal(h.peakReads, 2);
  // Timeout a file read, then finish it: it must never reach the disposed worker.
  h.fireTimeout();
  waiting.get('two')(new Uint8Array([8]));
  waiting.get('three')(new Uint8Array([9]));
  await turn();
  assert.equal(h.workers[1].terminated, true);
  assert.equal(h.workers[1].messages.length, 0);
  h.workers[0].succeed();
  const results = await all;
  assert.deepEqual(results.map(r => r.status), ['fulfilled', 'rejected', 'fulfilled']);
  assert.match(results[1].reason.message, /timed out/);
  h.assertIdle();
}

async function testFailuresResumeQueue() {
  for (const failure of ['error', 'messageerror', 'postMessage', 'timeout', 'invalid']) {
    const h = harness({
      limit: 1,
      postMessage(worker) {
        if (failure === 'postMessage' && worker === h.workers[0]) throw new Error('cannot clone');
      },
    });
    const all = Promise.allSettled(['bad', 'next'].map(file => h.raw.decodeRawFile(file)));
    await turn();
    const broken = h.workers[0];
    const old = broken.messages[0];
    if (failure === 'timeout') h.fireTimeout();
    else if (failure === 'invalid') broken.emit('message', { id: old.id, type: 'success' });
    else if (failure !== 'postMessage') broken.emit(failure, 'worker startup failed');
    await turn();
    assert.equal(broken.terminated, true, failure);
    assert.equal(h.workers.length, 2, failure);
    // Even a queued/late error from the old worker cannot affect its replacement.
    broken.emit('error', 'late error');
    broken.succeed(old);
    h.workers[1].succeed();
    const results = await all;
    assert.deepEqual(results.map(r => r.status), ['rejected', 'fulfilled'], failure);
    assert.ok(results[0].reason instanceof Error);
    h.assertIdle();
  }
}

async function testDecoderAndReadErrors() {
  const h = harness({ limit: 1, readFile: file => {
    if (file === 'unreadable') throw new Error('Cannot read file');
    return new Uint8Array([1, 2, 3]);
  } });
  const all = Promise.allSettled(['unreadable', 'corrupt', 'good'].map(file => h.raw.decodeRawFile(file)));
  await turn();
  const worker = h.workers[1];
  worker.emit('message', { type: 'error', id: worker.messages[0].id, error: 'Invalid RAW file' });
  await turn();
  worker.succeed();
  const results = await all;
  assert.deepEqual(results.map(r => r.status), ['rejected', 'rejected', 'fulfilled']);
  assert.match(results[0].reason.message, /Cannot read file/);
  assert.match(results[1].reason.message, /Invalid RAW file/);
  assert.equal(h.workers.length, 2, 'a reported decode failure can reuse its healthy worker');
  h.assertIdle();
}

async function testConstructionFailures() {
  for (const failureAt of [1, 2]) {
    const h = harness({ limit: 1, construct: attempt => {
      if (attempt === failureAt) throw new Error('Worker construction failed');
    } });
    const first = h.raw.decodeRawFile('first');
    const next = h.raw.decodeRawFile('next');
    const resultsPromise = Promise.allSettled([first, next]);
    await turn();
    if (failureAt === 1) h.workers[0].succeed(); // A new user request retries construction.
    else h.workers[0].emit('error', 'crashed'); // Replacement construction fails with work queued.
    const results = await resultsPromise;
    assert.deepEqual(results.map(r => r.status), failureAt === 1 ? ['rejected', 'fulfilled'] : ['rejected', 'rejected']);
    h.assertIdle();
    const retry = h.raw.decodeRawFile('retry');
    await turn();
    h.workers.at(-1).succeed();
    await retry;
    h.assertIdle();
  }
}

async function testDeduplicationCacheAndBufferOwnership() {
  const backing = new Uint8Array([99, 1, 2, 3, 99]);
  const h = harness({ readFile: () => backing.subarray(1, 4) });
  const first = h.raw.decodeRawFile('same');
  const duplicate = h.raw.decodeRawFile('same');
  assert.equal(h.raw.isDecoding('same'), true);
  await turn();
  assert.equal(h.reads.length, 1);
  assert.equal(h.workers.length, 1);
  assert.deepEqual([...new Uint8Array(h.workers[0].messages[0].fileBuffer)], [1, 2, 3]);
  h.workers[0].succeed();
  assert.equal(await first, await duplicate);
  assert.equal(await h.raw.decodeRawFile('same'), h.raw.getImageFromCache('same'));
  assert.equal(h.reads.length, 1);
  h.assertIdle();
  h.raw.clearRawCache();
  const retry = h.raw.decodeRawFile('same');
  await turn();
  assert.notEqual(h.workers[0].messages[0].id, h.workers[0].messages[1].id);
  h.workers[0].succeed();
  await retry;
  assert.equal(h.reads.length, 2);
  h.assertIdle();
}

const watchdog = setTimeout(() => {
  console.error('RAW loader tests left a request unsettled');
  process.exitCode = 1;
}, 5000);

(async () => {
  await testBoundedQueueAndStaleReplies();
  await testReadConcurrencyAndLateCompletion();
  await testFailuresResumeQueue();
  await testDecoderAndReadErrors();
  await testConstructionFailures();
  await testDeduplicationCacheAndBufferOwnership();
  console.log('RAW loader: bounded reads, unique replies, failures, timeouts, recovery, and cache checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => clearTimeout(watchdog));
