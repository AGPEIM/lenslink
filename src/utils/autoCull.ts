import { FaceDetector, FaceLandmarker, FilesetResolver, Category } from '@mediapipe/tasks-vision';
import { AutoCullResult, CullIssue, PhotoGroup } from '../types';
import { decodeRawFile } from './rawLoader';
import { eyeAspectRatio, eyesAreClosed, faceIsOutOfFocus, imageSharpness, Point } from './cullingMetrics';

const LEFT_EYE = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE = [362, 385, 387, 263, 373, 380];

export async function createFaceAnalyzer() {
  const base = import.meta.env.BASE_URL;
  const files = await FilesetResolver.forVisionTasks(`${base}mediapipe`);
  const detector = await FaceDetector.createFromOptions(files, {
    baseOptions: { modelAssetPath: `${base}models/face_detection_full_range_sparse.tflite`, delegate: 'CPU' },
    runningMode: 'IMAGE',
    minDetectionConfidence: 0.6,
  });
  try {
    const landmarker = await FaceLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: `${base}models/face_landmarker.task`, delegate: 'CPU' },
      runningMode: 'IMAGE',
      numFaces: 1,
      minFaceDetectionConfidence: 0.6,
      minFacePresenceConfidence: 0.6,
      outputFaceBlendshapes: true,
    });
    return { detector, landmarker, close() { landmarker.close(); detector.close(); } };
  } catch (error) {
    detector.close();
    throw error;
  }
}

function loadImage(url: string, signal: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    const finish = (error?: Error) => {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      image.onload = null;
      image.onerror = null;
      if (error) { image.src = ''; reject(error); } else resolve(image);
    };
    const abort = () => finish(new DOMException('Cancelled', 'AbortError'));
    const timer = setTimeout(() => finish(new Error('Image loading timed out')), 30000);
    image.onload = () => image.naturalWidth > 0 ? finish() : finish(new Error('Empty image'));
    image.onerror = () => finish(new Error('Cannot read image'));
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort(); else image.src = url;
  });
}

function focusSample(image: HTMLImageElement, points: Point[], eye: boolean) {
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const width = maxX - minX;
  const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2;
  const cropWidth = eye ? width * 1.5 : width;
  const cropHeight = eye ? width * 0.8 : maxY - minY;
  const x = Math.max(0, centerX - cropWidth / 2), y = Math.max(0, centerY - cropHeight / 2);
  const w = Math.min(image.naturalWidth, centerX + cropWidth / 2) - x;
  const h = Math.min(image.naturalHeight, centerY + cropHeight / 2) - y;
  if (w < 12 || h < 8) return { variance: NaN, contrast: 0 };
  const scale = Math.min(1, (eye ? 96 : 256) / w);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(3, Math.round(w * scale));
  canvas.height = Math.max(3, Math.round(h * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Cannot create focus sample');
  context.drawImage(image, x, y, w, h, 0, 0, canvas.width, canvas.height);
  return imageSharpness(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
}

export async function analyzePhoto(photo: PhotoGroup, analyzer: Awaited<ReturnType<typeof createFaceAnalyzer>>, signal: AbortSignal): Promise<AutoCullResult> {
  let image: HTMLImageElement | undefined;
  const detection = document.createElement('canvas');
  try {
    signal.throwIfAborted();
    const url = photo.jpg?.previewUrl || (photo.raw?.path ? await decodeRawFile(photo.raw.path) : undefined);
    signal.throwIfAborted();
    if (!url) throw new Error('No readable image');
    image = await loadImage(url, signal);
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    detection.width = Math.round(image.naturalWidth * scale);
    detection.height = Math.round(image.naturalHeight * scale);
    const context = detection.getContext('2d');
    if (!context) throw new Error('Cannot create detection image');
    context.drawImage(image, 0, 0, detection.width, detection.height);
    const detected = analyzer.detector.detect(detection);
    signal.throwIfAborted();
    if (detected.detections.length === 0) return { status: 'no_face', faces: [], issues: [] };
    const crops: { points: Point[]; categories: Category[] | undefined }[] = [];
    // ponytail: analyze at most 20 largest faces; larger crowds need tiled face detection.
    const boxes = detected.detections.flatMap(face => face.boundingBox ? [face.boundingBox] : []).sort((a, b) => b.width - a.width).slice(0, 20);
    for (const box of boxes) {
      signal.throwIfAborted();
      const size = Math.max(box.width / scale, box.height / scale) * 2;
      const cx = (box.originX + box.width / 2) / scale, cy = (box.originY + box.height / 2) / scale;
      const x = Math.max(0, cx - size / 2), y = Math.max(0, cy - size / 2);
      const width = Math.min(image.naturalWidth, cx + size / 2) - x;
      const height = Math.min(image.naturalHeight, cy + size / 2) - y;
      const crop = document.createElement('canvas');
      const cropScale = Math.min(1, 512 / Math.max(width, height));
      crop.width = Math.round(width * cropScale); crop.height = Math.round(height * cropScale);
      const cropContext = crop.getContext('2d');
      if (!cropContext) throw new Error('Cannot create face crop');
      cropContext.drawImage(image, x, y, width, height, 0, 0, crop.width, crop.height);
      const marked = analyzer.landmarker.detect(crop);
      crop.width = crop.height = 0;
      if (marked.faceLandmarks[0]) crops.push({
        points: marked.faceLandmarks[0].map(p => ({ x: x + p.x * width, y: y + p.y * height })),
        categories: marked.faceBlendshapes[0]?.categories,
      });
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    signal.throwIfAborted();
    if (!crops.length) return { status: 'uncertain', faces: [], issues: [] };
    const landmarks = crops.map(crop => crop.points);
    const widths = landmarks.map(face => Math.max(...face.map(p => p.x)) - Math.min(...face.map(p => p.x)));
    const largest = Math.max(...widths);
    const issues = new Set<CullIssue>();
    const faces = landmarks.map((face, index) => {
      const left = LEFT_EYE.map(i => face[i]), right = RIGHT_EYE.map(i => face[i]);
      const eyeWidth = (eye: Point[]) => Math.hypot(eye[0].x - eye[3].x, eye[0].y - eye[3].y);
      const categories = crops[index].categories;
      const blink = (name: string) => categories?.find(c => c.categoryName === name)?.score ?? NaN;
      const faceFocus = focusSample(image!, face, false);
      const leftFocus = focusSample(image!, left, true), rightFocus = focusSample(image!, right, true);
      // Small background faces and unreadable eyes cannot justify rejecting the photo.
      const analyzable = widths[index] >= Math.max(80, largest * 0.5)
        && Math.min(eyeWidth(left), eyeWidth(right)) >= 12 && faceFocus.contrast >= 8;
      const closedEyes = analyzable && eyesAreClosed(blink('eyeBlinkLeft'), blink('eyeBlinkRight'), eyeAspectRatio(left), eyeAspectRatio(right));
      if (closedEyes) issues.add('closed_eyes');
      // Only the largest faces can determine focus; softer background guests are expected.
      const outOfFocus = analyzable && widths[index] >= largest * 0.8 && faceIsOutOfFocus(faceFocus.variance, leftFocus.variance, rightFocus.variance);
      const x = Math.min(...face.map(p => p.x)), y = Math.min(...face.map(p => p.y));
      const bounds = { x, y, width: widths[index], height: Math.max(...face.map(p => p.y)) - y };
      return { index: index + 1, closedEyes, outOfFocus, bounds, sharpness: faceFocus.variance, eyeSharpness: Math.max(leftFocus.variance, rightFocus.variance), analyzable };
    });
    const mainFaces = faces.filter(face => face.analyzable && face.bounds.width >= largest * 0.8);
    if (mainFaces.length && mainFaces.every(face => face.outOfFocus)) issues.add('out_of_focus');
    return { status: faces.some(face => face.analyzable) ? 'analyzed' : 'uncertain', faces, issues: [...issues] };
  } finally {
    if (image) image.src = '';
    detection.width = detection.height = 0;
  }
}
