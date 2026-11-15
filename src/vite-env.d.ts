/// <reference types="vite/client" />

declare module 'libraw-wasm/dist/libraw.js' {
  export interface LibRawDecoder {
    open(buffer: Uint8Array, settings: Record<string, number | boolean>): void;
    imageData(): { data?: Uint8Array; buffer?: Uint8Array; pixels?: Uint8Array; length?: number } | Uint8Array;
    metadata(full: boolean): { width?: number; height?: number; sizes?: { width?: number; height?: number } };
    delete(): void;
  }
  export default function createLibRawModule(): Promise<{ LibRaw: new () => LibRawDecoder }>;
}
