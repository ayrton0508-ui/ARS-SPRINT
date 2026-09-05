ARS SPRINT V35 PRO

Implementación original de medición de sprint por cámara inspirada funcionalmente en el flujo público de Metric Sprint.

ALCANCE OFICIAL
- 5 m / 10 m / 20 m.
- Cámara lateral única.
- Nivelación y estabilidad.
- Pose estimation real con MediaPipe Tasks Vision (GPU y fallback CPU).
- Gates 0/5/10/20 sobre la imagen de cámara.
- Armado bloqueado hasta cumplir prerequisitos.
- Inicio automático por movimiento sostenido.
- Cruces por timestamp e interpolación entre frames cuando hay evidencia.
- Trayectoria calibrada por segmentos.
- Velocidad frame a frame, Vmax y ubicación de Vmax.
- Perfil de velocidad.
- Grabación y almacenamiento local del vídeo (IndexedDB cuando está disponible).
- Historial, PB por distancia, comparación contra PB.
- Gestión de atletas.
- Ranking local por distancia.
- Exportación CSV.
- Biblioteca local de vídeos.

NO INCLUYE DELIBERADAMENTE
- 5-0-5.
- 5-10-5.
- Validación de giros.
- 30/40 m.
- Código, assets o recursos propietarios de Metric.
- Sincronización cloud multi-dispositivo.

VALIDACIÓN
Las pruebas automatizadas se ejecutan con: npm test
La validación de cámara, modelo y precisión de cronometraje con atleta real requiere un dispositivo y vídeo real; no se declara PASS físico sin esa prueba.
