# Tooth Boutique Viewer

Construye una app interna (PWA instalable) para Tooth Boutique, una clínica dental, que reemplace el módulo de gestión de fotos de pacientes de Dolphin Imaging (NO necesitamos cefalometría, solo fotos y progreso).

STACK: Conéctate a un proyecto Supabase YA EXISTENTE (no crear uno nuevo) — project ref: dqjvtaktxsaqtgtmiagl. Ya tiene estas tablas con RLS habilitado (todo requiere auth.uid()):
- staff (id, name, role, email)
- patients (id, dentalink_id, name, birth_date, phone, treatment_type, start_date, status, notes)
- visits (id, patient_id, visit_date, visit_label, notes)
- photos (id, visit_id, photo_type, storage_path, thumbnail_path, file_size_bytes, width, height)
- bucket de storage privado "patient-photos" (límite 50MB por archivo, para fotos de cámaras de alta resolución)

FUNCIONALIDAD (MVP):
1. Login con email/password (tabla staff) usando Supabase Auth
2. Búsqueda de pacientes por nombre (barra de búsqueda arriba + lista/grid con thumbnail de última visita)
3. Crear/editar ficha de paciente (nombre, fecha nacimiento, teléfono, tipo tratamiento, fecha inicio, estado, notas)
4. Vista de perfil de paciente: datos + timeline visual de visitas con thumbnails
5. Nueva visita: subida de fotos por DRAG & DROP con checklist de tipos predefinidos (frontal, frontal sonrisa, perfil derecho, perfil izquierdo, oclusal superior, oclusal inferior, frontal en oclusión, otro) — soporta archivos pesados (hasta 50MB, fotos de cámara Canon)
6. Comparador antes/después: selector de 2 visitas + slider deslizable comparando las fotos
7. Export a PDF: seleccionar fotos de 1-2 visitas + generar PDF con logo Tooth Boutique, nombre paciente y fecha, para enviar al paciente
8. Configurar como PWA instalable (manifest + service worker) para que el staff la agregue como app de escritorio sin pasar por una URL cada vez

DISEÑO: limpio, profesional, tonos claros tipo clínica dental (blancos, celestes suaves), responsive porque se usará en tablet durante consultas. Es una herramienta interna, no pública — todo detrás de login.

Empieza por el setup de auth + la pantalla de búsqueda/lista de pacientes primero.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/815ae6c1-40fd-4c66-9e3a-c12d23d598d6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
