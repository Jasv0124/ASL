# ASL · Control de cargue

Primera versión local con Vite + TypeScript. Código separado en interfaz, cálculos, lectura de Excel y acceso a Supabase.

## Ejecutar en Windows

```powershell
npm.cmd install
npm.cmd run dev
```

Abre la dirección que aparece en la terminal. `npm.cmd run build` comprueba los tipos y genera `dist`. `npm.cmd test` comprueba cálculos y reconciliación con el Excel.

## Preparar Supabase

La URL y clave pública entregadas están en `.env.local`, excluido de Git. Nunca uses una clave secreta en variables VITE_.

1. Abre https://supabase.com/dashboard/project/ohvalcbdwvkcqzivtxff/sql/new.
2. Ejecuta el contenido de `supabase/setup.sql`. Crea tablas, función transaccional, bucket privado y políticas por usuario. La clave pública no permite ejecutar este SQL administrativo.
3. En Supabase abre Authentication → Providers → Anonymous Sign-Ins y habilita el acceso anónimo. La aplicación crea esa sesión segura en segundo plano y no muestra formularios de conexión.
4. Pulsa «Importar Excel», selecciona el archivo y elige «Guardar archivo».

El archivo original se guarda en Storage/asl-excel. Los registros se guardan en asl_records y las importaciones en asl_imports. Un hash impide guardar dos veces el mismo archivo; los registros existentes se actualizan por usuario, Id, fecha, regional y centro. El Excel reutiliza dos Id en fechas y centros distintos, por eso no se deduplica solo por Id. El guardado de las filas es transaccional. Si falla la escritura de datos, se intenta retirar el archivo subido. Cada usuario consulta sus propios registros. Para colaboración entre usuarios se debe implementar después una estructura de organizaciones y roles.

## Datos y cálculo

La pantalla inicia vacía. Los indicadores, tablas y gráficos se completan únicamente después de importar un Excel. El archivo de referencia contiene 1.830 registros válidos, 40 centros, 54.450 vehículos programados y 53.093 cargados; dos filas que solamente contienen observaciones no se consideran registros.

- Programados: columna L. Cargados antes de 6:00 a. m.: columna M.
- Centro: primera celda no vacía de G a K. Regional: F. Fecha del registro: B (Hora de inicio), no fecha de operación independiente.
- Porcentaje: suma de cargados / suma de programados × 100, no promedio de porcentajes.
- Cumplió: cargados = programados con programación mayor que cero. No cumplió: cargados menores. Sin programación: ambas cantidades cero.
- Si cargados supera programados: «Revisar». Hay 17 registros así; se preservan en los totales, sin corregir ni recortar sus cifras. Un centro con alguno de esos registros también aparece como «Revisar».
- El resultado se calcula con las cantidades; no se usa la respuesta textual de cumplimiento, que presenta desplazamientos en algunas filas del archivo.

La importación acepta .xlsx de hasta 10 MB con la misma estructura en la primera hoja. Rechaza filas de datos incompletas, cantidades negativas o no enteras y registros repetidos con el mismo Id, fecha, regional y centro. La vista previa no persiste. Usa «Consultar Supabase» para recuperar los datos guardados.

`npm.cmd run refresh-data` vuelve a generar el archivo de referencia usado por las pruebas. El libro original no se modifica ni se muestra automáticamente en el tablero.
