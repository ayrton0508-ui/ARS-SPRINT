ARS SPRINT V26.80 — Smart Sprint Audit

Línea V26. Mantiene el alcance oficial 5/10/20 m y añade correcciones de validación.

Cambios principales:
- Los splits automáticos solo usan cruces detectados/validados; no hay interpolación proporcional.
- Las puertas 5 y 10 m se muestran en LIVE cuando existen posiciones calibradas verificadas.
- El motor automático exige calibración 0–5–10–20 m antes de armarse.
- gateXForDistance ya no fabrica posiciones intermedias por interpolación.
- Se conserva IA corporal, tracking, START/FINAL, Photo Finish, biomecánica, Speed Score, historial y reportes.
- El resultado de biomecánica de una sola cámara se considera estimación y usa confianza.

Pruebas internas realizadas:
- node --check app.js: OK
- IDs HTML: revisión estructural
- referencias principales JS/DOM: revisión estructural
- no se usa liveOverlay/cameraEmpty en LIVE
- no se interpola un split no observado en renderSplits
