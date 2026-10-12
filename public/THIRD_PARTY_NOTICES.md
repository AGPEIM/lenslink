# Local face analysis assets

MediaPipe Tasks Vision 1.1.0 and the Face Landmarker model are provided by Google.
Project: https://github.com/google-ai-edge/mediapipe
License: Apache License 2.0 (see MEDIAPIPE_LICENSE.txt).

Model source: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task
SHA-256: 64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff
Downloaded 2026-10-09. The model and WASM runtime ship with this application; photo analysis makes no online inference requests.
The application's connect-src policy permits local assets and IPC only, blocking the SDK's external usage-log endpoint.

Full-range face detector source: https://storage.googleapis.com/mediapipe-assets/face_detection_full_range_sparse.tflite
SHA-256: 2c3728e6da56f21e21a320433396fb06d40d9088f2247c05e5635a688d45dfe1
