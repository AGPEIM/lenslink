import { AutoCullResult, PhotoGroup, SelectionState } from '../types';

export interface Point { x: number; y: number }

// Points follow the eyelid: outer corner, upper pair, inner corner, lower pair.
export function eyeAspectRatio(points: Point[]): number {
  if (points.length !== 6 || points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return NaN;
  const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
  const width = distance(points[0], points[3]);
  return width > 0 ? (distance(points[1], points[5]) + distance(points[2], points[4])) / (2 * width) : NaN;
}

export function eyesAreClosed(leftBlink: number, rightBlink: number, leftEar: number, rightEar: number): boolean {
  // shortcut: absolute thresholds include half-closed eyes; more varied faces need per-person calibration.
  return [leftBlink, rightBlink, leftEar, rightEar].every(Number.isFinite)
    && Math.min(leftBlink, rightBlink) >= 0.25 && Math.max(leftBlink, rightBlink) >= 0.3
    && Math.max(leftEar, rightEar) < 0.22 && (leftEar + rightEar) / 2 < 0.19;
}

export function imageSharpness(rgba: Uint8ClampedArray, width: number, height: number) {
  if (width < 3 || height < 3 || rgba.length !== width * height * 4) throw new Error('Invalid focus sample');
  const gray = new Float32Array(width * height);
  let sum = 0;
  let squared = 0;
  for (let i = 0; i < gray.length; i++) {
    const value = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
    gray[i] = value;
    sum += value;
    squared += value * value;
  }
  let lapSum = 0;
  let lapSquared = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap = gray[i - 1] + gray[i + 1] + gray[i - width] + gray[i + width] - 4 * gray[i];
      lapSum += lap;
      lapSquared += lap * lap;
    }
  }
  const count = (width - 2) * (height - 2);
  return {
    variance: Math.max(0, lapSquared / count - (lapSum / count) ** 2),
    contrast: Math.sqrt(Math.max(0, squared / gray.length - (sum / gray.length) ** 2)),
  };
}

export function faceIsOutOfFocus(face: number, leftEye: number, rightEye: number): boolean {
  // ponytail: this measures severe softness, not optical focus; noisy or sharpened photos need calibration.
  return [face, leftEye, rightEye].every(Number.isFinite) && face < 45 && leftEye < 25 && rightEye < 25;
}

export function photoSourceKey(photo: PhotoGroup): string {
  return photo.jpg?.path || photo.raw?.path || photo.jpg?.previewUrl || photo.raw?.previewUrl || photo.id;
}

export function applyCullResult(photo: PhotoGroup, result: AutoCullResult): PhotoGroup {
  return {
    ...photo,
    autoCull: result,
    selection: result.status === 'analyzed' && result.issues.length > 0 ? SelectionState.REJECTED : photo.selection,
  };
}
