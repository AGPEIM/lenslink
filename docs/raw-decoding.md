# RAW decoding on Windows

LensLink already runs RAW conversion in a dedicated worker. The public
`libraw-wasm` client creates another worker, whose script does not load through
WebView2's packaged `http://tauri.localhost` resource handler. A development HTTP
server does not expose this failure. See
[tauri-apps/tauri#15755](https://github.com/tauri-apps/tauri/issues/15755).

The decoder now initializes the WASM module directly inside LensLink's worker.
The module is reused, while each native `LibRaw` instance is deleted after its
image has been converted, including failures. `libraw-wasm` is pinned to 1.1.2
because this uses its `dist/libraw.js` entry point rather than its public worker
client. Revalidate packaged builds before changing that dependency.

The pool reads files only after obtaining a worker slot and transfers their
buffers. Each job has a unique ID and settles once. Worker crashes, malformed
messages, transfer failures, and a 60-second read/decode timeout reject the job
and retire the worker; queued work can continue. Ordinary decoder errors also
settle the job. This avoids both duplicate idle-worker entries and indefinite
loading indicators.

## Automated checks

```sh
pnpm install --frozen-lockfile
pnpm run test:raw
pnpm run build
```

The tests use controlled worker events to cover queue capacity, bounded file
reads, duplicate/late replies, timeouts, startup failures, recovery, buffer
transfer, module reuse, pixel conversion and native decoder disposal. They do
not replace testing the real WASM module in a packaged platform webview.

## Windows validation

On WebView2 157.0.4341.57, a minimal WebResourceRequested host reproduced the
original failure: page and worker A loaded, but nested worker B did not. The
same webview using a regular localhost HTTP server loaded both workers.

The production-built replacement worker was then served unchanged through the
failing `tauri.localhost` host, without cross-origin isolation. Eight cases
passed: three Sony ARW samples in fresh workers, two consecutive decodes in one
worker, invalid input returning an error, valid input after that error, and a
320-pixel thumbnail. Successful JPEGs were also loaded with `Image.onload` to
verify their dimensions. No private photo fixtures are included in this repo.

For future releases, repeat the tests in the packaged app, including rapid
navigation between RAW and JPG images. Linux and macOS packaged runtimes need
their own platform validation; the Windows results do not imply that coverage.
