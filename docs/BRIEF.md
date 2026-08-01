# Saporium App — Documento fundacional

> **Propósito de este documento:** base de discusión y contexto inicial para el desarrollo de
> Saporium App, la aplicación móvil offline de recetas. Nace en el repo `saporium` (la web) el
> 2026-08-01 y debe viajar al repo nuevo (`saporium-app`) como `docs/BRIEF.md`. El agente que
> trabaje en ese repo debe leerlo entero antes de tocar nada. Las decisiones aquí marcadas como
> ABIERTAS se discuten con el propietario antes de implementar.

---

## 1. Qué es

Una app móvil para que **cada persona tenga su librito de recetas personal**. Individual,
privada y completamente offline.

### Principios innegociables

1. **Todo offline.** La app funciona sin conexión. No hay backend nuestro, ni sync en nube
   nuestra, ni servidores que mantener.
2. **Cero datos nuestros.** No hay cuentas, ni login, ni registro. No almacenamos nada de
   nadie: las recetas viven en el dispositivo del usuario. La etiqueta de privacidad de la
   App Store debe poder decir "No se recopilan datos" — eso es parte del producto.
3. **Los datos son del usuario.** Formato de almacenamiento abierto y exportable en un
   estándar de la industria (schema.org/Recipe). Si el usuario quiere irse a otra app, puede.
4. **La IA nunca depende de nosotros.** O corre en el dispositivo (gratis, sin claves), o el
   usuario trae su propia clave de un vendor (BYO-key). Nunca pasa por servidores nuestros.
5. **Coste de operación ~0€.** Los únicos costes fijos son las cuentas de desarrollador
   (Apple 99 $/año, Google Play 25 $ una vez).

### Lo que NO es (por ahora)

- No es una red social. No hay compartir entre usuarios, seguidores, comentarios ni feeds.
- No tiene sincronización multi-dispositivo propia (el backup del sistema — iCloud/Google —
  cubre el caso básico gratis).
- No tiene web app. La web existente (saporium.vercel.app) queda como escaparate personal del
  propietario y, como mucho, landing de promoción de la app.

---

## 2. Por qué (mercado y hueco)

- Categoría probada: **Mela** y **Paprika** son las referencias (apps de pago, ~5-10 €,
  usuarios fieles). **Crouton**, la tercera en discordia, desapareció del App Store en enero
  de 2026 — hay hueco.
- El modelo local-first es exactamente el de esas apps: datos en el dispositivo, importación
  de recetas como killer feature (URL, foto, texto).
- Diferenciadores posibles de Saporium App: gratuita (o freemium honesto), privacidad
  absoluta verificable, IA de importación on-device (ver §6), formato de datos abierto.

---

## 3. Decisiones ya tomadas (2026-08-01)

| Tema | Decisión |
|---|---|
| Producto | App móvil offline individual; se construye seguro. |
| Repo | Repo nuevo e independiente (`saporium-app`). El repo `saporium` (web) no se mezcla. |
| Web existente | Se congela tras el milestone M1. Sirve como escaparate del propietario y promoción de la app. No se invierte más en ella. |
| Backend | No hay. Nada de APIs propias, ni usuarios, ni telemetría. |
| Datos | SQLite en el dispositivo como base de datos viva; JSON schema.org/Recipe como formato de export/import/backup; fotos como ficheros en el sandbox de la app. |
| IA | On-device donde exista (iOS: Apple Foundation Models); BYO-key como alternativa/fallback (el usuario pone su clave de Anthropic/OpenAI en ajustes y la app llama directo al vendor). |

---

## 4. Stack técnico recomendado

**React Native + Expo (TypeScript).** Razones:

- Un solo codebase para iOS y Android; builds y distribución resueltos con EAS.
- Máxima reutilización del trabajo hecho en la web: mismo lenguaje, mismas librerías de
  dominio (ver §5). Drizzle ORM funciona sobre `expo-sqlite` con migraciones empaquetadas en
  la app y live queries (`useLiveQuery`).
- Alternativas descartadas: **Flutter** (cero reutilización, otro lenguaje), **Capacitor**
  sobre la web actual (los server components de Next.js no funcionan ahí; habría que
  reescribir igual con peor resultado), **Swift nativo** (mejor tacto en iOS pero dos
  codebases y sin reuso de TypeScript).

**Arquitectura de datos:**

- `expo-sqlite` + Drizzle ORM. Schema derivado del de la web, simplificado: sin `profiles`,
  sin tablas sociales, sin `author_id`, sin `visibility` (todo es "mío"), **manteniendo**
  `deleted_at` (papelera restaurable) y el modelo recipes/ingredients/steps/tags.
- Export/import: schema.org/Recipe JSON (serializador ya escrito en la web, se copia).
  Un fichero `.json` con todas las recetas = backup portable y formato de intercambio con
  otras apps (Mela/Paprika/Tandoor lo leen).
- Fotos: ficheros en el sandbox (`expo-file-system`), referenciadas por ruta relativa en la
  DB. Entran en el backup del sistema operativo.

**Nota de gestor de paquetes:** Expo convive mejor con npm/bun que con pnpm (pnpm requiere
`node-linker=hoisted`). Recomendación: npm en este repo, sin pelearse con el tooling.

---

## 5. Qué se hereda del repo `saporium` (web)

Copiar (no compartir en monorepo — son ficheros pequeños; la duplicación es asumible):

| Del repo web | Uso en la app |
|---|---|
| `src/lib/db/schema.ts` | Base del schema SQLite (simplificar según §4). |
| `src/lib/validations/recipe.ts` y `common.ts` | Validación Zod de recetas, intacta en su mayoría. |
| `src/lib/utils/schema-org.ts` (+ su test) | Export/import JSON-LD, casi literal. |
| `src/i18n/messages/es.json` | Punto de partida de los textos (recortar lo web-only). |
| Issues #33 (UI de tarjetas), #34 (pegar texto → IA), #35 (formulario ligero), #31 (importar por URL) del repo web | Los specs de producto portan casi enteros; la implementación cambia de plataforma. En #31, las protecciones SSRF de servidor dejan de aplicar (el fetch ocurre en el dispositivo del usuario). |

Lo que NO se hereda: todo Next.js (páginas, API routes, middleware), Supabase (auth, RLS,
storage, keep-alive), y el backlog de seguridad/infra de servidor — en una app offline no hay
servidor que proteger.

---

## 6. Estrategia de IA (importar recetas)

La barrera nº 1 de estas apps es meter recetas. Tres vías, por orden de implementación:

1. **Importar por URL** — sin IA. Parser de schema.org/Recipe JSON-LD embebido en las webs de
   recetas (cubre la gran mayoría). El diseño detallado está en el issue #31 del repo web.
2. **Pegar texto → receta estructurada:**
   - **iOS:** Apple Foundation Models framework (iOS 26+): LLM on-device, gratis, offline,
     sin API key, con salida estructurada (`@Generable`). Desde 2026 acepta también imagen →
     cubre "foto del libro de recetas" sin ningún vendor. Se integra desde React Native via
     módulo nativo (Expo Modules) — es el único trozo de Swift previsto en el proyecto.
   - **Android:** Gemini Nano on-device donde esté disponible; si no, BYO-key.
   - **BYO-key (ambas plataformas):** el usuario guarda su clave (Anthropic/OpenAI) en el
     almacenamiento seguro del dispositivo (Keychain/Keystore via `expo-secure-store`) y la
     app llama al vendor directamente. Regla de las stores: la app debe ser plenamente
     funcional sin la clave — la IA es un extra opcional, nunca requisito.
3. **Foto → receta** — mismo pipeline que (2) con entrada de imagen.

---

## 7. Distribución y beta (respuesta a "¿puedo hacer beta sin llevar cuenta de usuarios?")

Sí, sin problema — la gestión de testers la hacen las stores, no la app:

- **iOS — TestFlight:** hasta 100 testers internos y 10.000 externos **mediante un enlace
  público** que compartes donde quieras. No necesitas saber quiénes son ni gestionar nada;
  Apple lleva la lista. Builds de beta caducan a los 90 días (se resube y ya).
- **Android — Play Console:** pistas de internal testing (hasta 100), closed testing (listas
  o Google Groups) y open testing (enlace público, ilimitado). ⚠️ **Requisito importante:**
  las cuentas personales de desarrollador nuevas exigen un periodo de closed testing con
  ≥12 testers durante 14 días antes de poder publicar en producción — planificarlo.
- Mientras tanto, para probar en tu propio móvil no hace falta nada de esto: development
  builds de Expo (iOS/Android) desde el día 1, y en Android también APK directo (sideload).
- **Crashes/analytics:** por defecto, nada (coherente con §1). Los informes de crash que
  App Store/Play dan de serie (usuarios que optaron en su OS) son suficientes para empezar.
  Añadir un Sentry sería una decisión explícita contra el principio de cero datos — ABIERTA
  y por defecto NO.

---

## 8. Monetización — análisis (decisión ABIERTA, no bloquea el MVP)

| Modelo | Valoración |
|---|---|
| **Suscripción** | Difícil de justificar: no hay costes recurrentes nuestros ni servicio continuo (todo es local). En esta categoría las suscripciones sin sync generan rechazo. Solo tendría sentido el día que exista un servicio opcional de sync en nube — que hoy está fuera del producto. **No recomendada ahora.** |
| **Pago por descarga** | Modelo clásico de la categoría (Paprika). Máxima fricción para una marca desconocida; mata la adopción inicial. **No recomendada para el lanzamiento.** |
| **Free + desbloqueo Pro único (IAP one-time)** | El encaje natural: app gratis con el core completo (crear, organizar, exportar), y un pago único desbloquea extras (importación con IA, temas, quizá import masivo). Honesto con el usuario y coherente con "sin costes recurrentes". **Recomendada.** |
| **Donaciones / tip jar** | Complemento válido. Ojo: dentro de la app, las propinas deben ir por IAP (consumibles) — enlaces externos tipo "buy me a coffee" están restringidos en iOS según región. Compatible con el modelo Pro. |
| **Open source + binario de pago** | Modelo indie probado: código abierto en GitHub y app cobrada/freemium en stores. Decisión de licencia ABIERTA. |

**Recomendación:** lanzar la beta gratis sin monetizar nada; decidir entre "free + Pro
one-time" y "free + tip jar" antes del lanzamiento público. La decisión no afecta a la
arquitectura.

---

## 9. Topología de repos (respuesta a "¿uno o varios?")

**Un solo repo (`saporium-app`) — y resistir la tentación de crear más.** Razonamiento:

- No hay backend → no hay repos de APIs ni de servicios. Este es el punto clave: la app ES
  el producto entero.
- La modularidad que haga falta (dominio vs UI vs integraciones de IA) se resuelve con
  carpetas/paquetes dentro del repo, no con repos.
- Repos adicionales solo cuando exista la necesidad real, y hoy se prevén como mucho dos
  futuros posibles: una **landing** de la app (y ya existe la web `saporium`, que puede hacer
  ese papel), y un **servicio de sync opcional** si algún día se decide romper el principio
  nº 1 — ese día se discute; hoy no se diseña nada para ello más allá de mantener el formato
  de datos exportable (§4), que es la verdadera puerta a cualquier futuro.

Evolución prevista y cómo la soporta el repo único: MVP → IA de importación → pulido/beta →
lanzamiento → (¿futuro?) compartir recetas como ficheros/enlaces schema.org, sin servidor.

---

## 10. Roadmap propuesto (a discutir con el agente del repo nuevo)

- **F0 — Esqueleto** — Expo + TypeScript + expo-sqlite + Drizzle con schema migrado y
  seedeable; navegación básica (lista → detalle); export/import JSON funcionando desde el
  principio (es la red de seguridad de los datos).
- **F1 — MVP usable en mi móvil** — crear/editar con formulario ligero (spec del issue #35
  web), papelera, fotos, búsqueda local, tarjetas (spec #33). Development build en el móvil
  del propietario.
- **F2 — Importación** — por URL (spec #31); pegar texto con IA on-device (iOS) y BYO-key.
- **F3 — Beta** — TestFlight público + closed testing de Play (⚠️ requisito de 12 testers /
  14 días); pulido, i18n en/es, accesibilidad.
- **F4 — Lanzamiento** — decisión de monetización ejecutada, fichas de store, capturas,
  política de privacidad ("no recopilamos datos"), release.

## 11. Preguntas abiertas

1. Plataforma primera: ¿iOS primero (ahí está la IA on-device y TestFlight es cómodo) o
   ambas desde F0? Expo permite ambas; el coste real es probar y pulir en dos sitios.
2. Licencia: ¿open source? ¿Cuál?
3. Monetización final (§8) — decidir antes del lanzamiento público, no antes.
4. Idiomas de lanzamiento: ¿es + en desde el principio?
5. Nombre/marca en stores: ¿"Saporium" está libre? Comprobar antes de crear las fichas.
6. Sentry/crash reporting de terceros: por defecto no (§7) — ¿se confirma?

## 12. Notas para el agente del repo `saporium-app`

- Este documento es la fuente de verdad del producto hasta que exista un CLAUDE.md propio;
  al crear ese CLAUDE.md, derivarlo de aquí (y mantener este BRIEF como registro histórico).
- Convenciones sugeridas (heredadas del repo web): TypeScript estricto sin `any`, kebab-case
  en ficheros, commits e issues en inglés, comentarios de código en inglés, textos de UI
  siempre via i18n (nunca hardcodeados).
- El repo web (`github.com/dionivillos/saporium`) es material de consulta: su issue fijado
  #37 documenta la historia del producto, y los issues #31/#33/#34/#35 contienen specs
  reutilizables. No es código a mantener desde aquí.
- Los principios del §1 no se negocian por conveniencia técnica. Ante la duda: menos
  dependencias, menos datos, menos red.
