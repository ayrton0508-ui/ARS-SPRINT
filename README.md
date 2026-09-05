# ARS SPRINT PRO 47

Versión incremental profesional de ARS SPRINT. Implementación original, tomando Metric Sprint únicamente como referencia funcional pública.

## Flujo
Cámara lateral → nivelación/estabilidad → detección corporal → calibración 0/5/10/20 → armado automático → primer movimiento real → splits → resultado → vídeo → historial/PB/comparación.

## Distancias oficiales
Solo 5 m, 10 m y 20 m. Una carrera de 20 m conserva automáticamente los splits 0–5, 0–10 y 0–20.

## V47
- HUD de carrera visible mientras el sistema está armado/en carrera.
- Gates 0/5/10/20 arrastrables sobre la imagen y bloqueados durante la carrera.
- Gate objetivo resaltado y gates cruzados iluminados.
- Reinicio completo de estado entre intentos.
- Inicio automático mediante movimiento real sostenido.
- Medición por timestamps y cruce de gates con interpolación solo entre frames válidos.
- Vmax, ubicación de Vmax, perfil de velocidad y estimación de aceleración cuando hay evidencia suficiente.
- Vídeo real asociado al resultado cuando MediaRecorder está disponible.
- Historial, PB, anterior y comparación de los dos registros más recientes.
- Errores de cámara e IA separados.
- Sin simulación ni resultados inventados.

## Validación local
Ejecutar `npm test`. La suite debe informar exactamente el número real de pruebas ejecutadas.
