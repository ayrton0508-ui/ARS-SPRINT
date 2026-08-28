ARS SPRINT 5.2 — VERSIÓN FINAL DE PRUEBA

Herramienta local de evaluación de sprint lineal para iPad/Safari.

PRUEBAS
5 m, 10 m, 20 m, 30 m, 40 m y distancia personalizada.

PRECISIÓN
- El tiempo se registra desde la línea temporal del vídeo.
- Avance/retroceso por frame requiere conocer el FPS de la grabación.
- El FPS no se inventa: si no se conoce, se muestra como no verificado.
- Cuando el FPS es declarado, se muestra la resolución nominal por frame y una incertidumbre conservadora de lectura.
- requestVideoFrameCallback se usa cuando el navegador lo soporta para observar metadatos del frame presentado.

IMPORTANTE
Un navegador no convierte automáticamente un vídeo en una medición de fotocélula. La exactitud final depende de la grabación, FPS, estabilidad de cámara, protocolo, criterio de inicio/final y validación externa.

DATOS
- localStorage para datos de uso cotidiano.
- Respaldo JSON para conservar/trasladar la base.
- Exportación CSV.
- Ficha imprimible/PDF.

IA
Motor inteligente local: comparación histórica, consistencia de serie, velocidad y control de calidad. No se presenta como visión artificial avanzada. La visión automática del atleta requiere un modelo de computer vision validado.

SEGURIDAD
No colocar claves API privadas en GitHub Pages. Si se incorpora IA externa, usar un backend seguro.
