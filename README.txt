ARS SPRINT 10.0 — V18 CAMERA GUIDED BODY MARKS

ARS SPRINT 10.0 · V15 UNIFIED LIVE ENGINE SMART SPRINT

VERSIÓN ACTUAL — 10.0
Alcance exclusivo: pruebas lineales de 5 m, 10 m y 20 m.

Evolución profesional para evaluación de sprint 5, 10 y 20 m.

NOVEDADES
- Asistente de estandarización de grabación.
- Puertas virtuales asistidas de 5, 10 y 20 m .
- Splits y velocidad media por tramo.
- Velocidad máxima estimada a partir de los tramos registrados.
- PB y comparación con el mejor registro histórico.
- Mantiene vídeo, control por frames, series, historial, deportistas y ficha/PDF.

IMPORTANTE
Las puertas son asistidas/manuales en esta versión. La velocidad máxima es una estimación basada en los tramos registrados; no se presenta como detección automática de visión artificial ni como sustituto de fotocélulas.


NOVEDADES 7.3
- Dashboard de evolución por deportista y distancia.
- Curva de tendencia de mejores marcas.
- Perfil de velocidad por tramos registrados.
- Ranking del equipo por mejor tiempo o velocidad media.
- Todo el análisis funciona localmente sin depender de un servicio externo.


7.3 añade un asistente de captura que comprueba metadatos y checklist de estabilidad. No pretende ser un detector automático del atleta.


ALCANCE 7.3: solo pruebas lineales de 5 m, 10 m y 20 m. Los splits intermedios se muestran como estimaciones proporcionales cuando no se han marcado puertas reales.


ARS SPRINT 10.0 — CONTROL DE MEDICIÓN
- Alcance fijo: 5 m, 10 m y 20 m.
- La incertidumbre nominal del intervalo se expresa de forma conservadora a partir de la resolución temporal del vídeo.
- La variabilidad entre intentos se calcula con CV cuando hay una serie.
- El sistema distingue entre medición marcada, estimación de split y análisis; no presenta una estimación como detección automática de IA.


VALIDACIÓN 8.3
- La visión asistida genera candidatos de cruce; no se presenta como exactitud científica.
- El entrenador puede aceptar o rechazar la propuesta.
- Solo una propuesta aceptada queda marcada como validada por entrenador.
- Para estudios de alta precisión, contrastar periódicamente con fotocélulas u otro criterio de referencia.

8.3: la medición conserva si fue propuesta, validada por entrenador o manual; la confianza del algoritmo no representa exactitud científica.


VERSIÓN 8.3
- Se añade migración automática desde bases locales 7.3–8.1 para evitar pérdida de historial.
- Se corrigen todas las etiquetas internas de versión para que la aplicación, manifest, ficha y base de datos indiquen 8.3.

8.3: añade registro explícito del protocolo (salida, vista de cámara, FPS y estado de calibración) para mejorar la comparabilidad entre sesiones.

8.6: incorpora análisis de consistencia de intentos (media, SD, CV, rango y MDC aproximado) y conserva estos metadatos cuando la serie los proporciona.

8.6: incorpora módulo de acuerdo entre métodos con sesgo medio, error absoluto medio y límites de acuerdo aproximados.

9.1: control de precisión de captura y resolución temporal 1/FPS, con estado de medición condicionado a protocolo y validación.

9.2: refinamiento de eventos mediante ventana configurable de frames y criterio reproducible de selección.
\n9.4: evidencia del evento, interpolación y control de calidad de la captura alrededor del cruce.\n

V13 — MOTOR UNIFICADO EN VIVO
- Cámara real con FPS negociado desde getUserMedia y lectura de track.getSettings().
- Detección corporal MediaPipe integrada al cronometraje en vivo.
- Detección automática de dirección y cruce de líneas de inicio/final.
- Registro técnico de FPS cámara, FPS observado, resolución y método de detección en la ficha.
- Captura, visión asistida, Photo Finish e historial comparten el mismo registro de medición.
- La cámara se arma automáticamente si existe un deportista seleccionado; también conserva el botón de armado manual.
- El cronometraje en vivo es asistido por visión y depende del encuadre, iluminación, rendimiento del dispositivo y modelo de pose; debe revisarse antes de tratarlo como medición de referencia.


V18: selector de cámara trasera/frontal; el registro mantiene el deportista seleccionado y la cámara elegida. La calibración exige confirmar físicamente 5.00, 10.00 o 20.00 m y permite ajustar las líneas INICIO/FINAL sobre la imagen.
