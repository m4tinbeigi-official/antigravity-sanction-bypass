# 🚀 Bypass de Sanciones Antigravity (Vercel Relay)

Plugin oficial de Antigravity que proporciona acceso sin interrupciones ni errores 403 a Google Antigravity y a los modelos Gemini desde países con restricciones geográficas (como Cuba).

---

## ✨ Características Principales
- **Detección Automática de Restricciones**: Detecta la IP y enruta automáticamente el tráfico a través de Vercel Edge Relays globales.
- **Sin Errores 403 / Region Not Supported**: Las solicitudes son atendidas por servidores edge en EE. UU. y Europa.
- **Resistencia contra envenenamiento de DNS**: Uso automático de IPs Anycast directas de Vercel en caso de problemas con el DNS del proveedor de internet.
- **Soporte para Relay Personal Gratuito**: Despliegue en 1 minuto en una cuenta gratuita de Vercel.

---

## 🛠️ Comandos de Terminal (`agy-relay`)
```bash
agy-relay status          # Ver el estado del servicio y latencia
agy-relay set <url>       # Configurar un nuevo relay de Vercel
agy-relay test            # Probar la conexión a Gemini
agy-relay start           # Iniciar el puente local en segundo plano
agy-relay restart         # Reiniciar el servicio
agy-relay stop            # Detener el servicio
agy-relay lang es         # Establecer el idioma a español
agy-relay guide           # Guía rápida para desplegar un relay propio
```
