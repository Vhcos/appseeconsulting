# Fix PDF Data Pack Ops — appseeconsulting

## Contexto
Se necesitaba que el endpoint de exportación **Data Pack semanal (operación)** entregue un **PDF válido** (abrible por navegador/Acrobat) y no un “PDF vacío/dañado”, y que use la **misma estructura probada** del PDF del **Reporte Semanal**.

Referencia del formato logrado (ejemplo de salida): `Data Pack semanal (operación)` con KPIs Plan vs Real y secciones 1–4. (Ver ejemplo generado en el proyecto). 

## Síntomas
- El navegador/Acrobat muestra: “No se pudo cargar el documento PDF” o “archivo dañado”.
- `curl -i` responde **200 OK** con `content-type: application/pdf`, pero al guardar el archivo queda **vacío**:
  - `file /tmp/datapack.pdf` → `empty`
  - `head -c 12 /tmp/datapack.pdf` no muestra `%PDF`

## Causas raíz (lo que estaba rompiendo)
1) **Body incorrecto en NextResponse**
   - `@react-pdf/renderer` puede devolver `Buffer`, `Uint8Array` o en algunos casos algo que termina tratándose como stream.
   - Si se pasa un tipo no compatible como body, Next puede responder 200 pero terminar escribiendo **0 bytes**.

2) **TSX/JSX dentro de route.ts**
   - En App Router, si dejas JSX directo en un `route.ts` (en especial con Turbopack), pueden aparecer errores tipo:
     - “Expected '>', got 'size'”
   - Solución: usar `React.createElement(...)` en lugar de JSX, o mover el componente PDF a un archivo TSX y sólo importar el elemento/función que retorna un `ReactElement`.

3) **Rutas duplicadas / confusión de endpoints**
   - Existían variantes dentro y fuera de `[locale]`, lo que hacía fácil “pegarle” a una ruta distinta a la que creías.

## Solución aplicada (patrón “igual al weekly-report/pdf”)
- Mantener endpoint en **Node runtime**:
  - `export const runtime = "nodejs";`
  - `export const dynamic = "force-dynamic";`
- Generar PDF con `@react-pdf/renderer`:
  - `const raw = await pdf(doc).toBuffer();`
- Normalizar el body **igual que en weekly-report**:
  - Si `raw` se comporta como stream -> convertir a `ArrayBuffer` y devolver `Uint8Array`.
  - Si es `Buffer/Uint8Array` -> devolver directo como `BodyInit`.
- Devolver headers correctos:
  - `Content-Type: application/pdf`
  - `Content-Disposition: inline; filename="datapack-ops-<reportId>.pdf"`
  - `Cache-Control: no-store`
