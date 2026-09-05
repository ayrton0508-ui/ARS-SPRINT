ARS SPRINT V37 PRO

Single-camera sprint timing for 5/10/20 m.

V37 refinement:
- One-camera measurement flow with virtual 0/5/10/20 m gates over the live image.
- Real MediaPipe Pose Landmarker loading with GPU -> CPU fallback.
- Readiness gates: camera, orientation, stability, pose model, athlete, calibration and direction.
- Gate drag/reset/flip controls are locked while calibrated or running.
- Start detection uses sustained forward displacement and is direction-aware.
- Calibrated piecewise spatial mapping for velocity and gate crossing.
- Frame timestamps, split interpolation and robust velocity filtering.
- Physically implausible/backward velocity jumps are rejected.
- Recording through MediaRecorder and local video storage where supported.
- Local athlete/result history, PB, comparison, leaderboard and CSV export.
- Result quality classification; no fabricated measurements.

Scope: 5 m / 10 m / 20 m only.

Important: camera + pose accuracy still requires real-device validation with an athlete and a reference timing system. This package does not claim laboratory validation.
