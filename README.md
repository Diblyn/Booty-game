# BOOTY (remake web)

Remake en HTML, CSS y JavaScript puro del clásico de plataformas y puzles **Booty** (Firebird, 1984). Eres un grumete atrapado en un barco pirata de **20 bodegas conectadas**: recórrelo libremente, recoge las **125 piezas de botín** y encuentra la llave dorada.

**Jugar:** abre `index.html` en el navegador o publícalo en GitHub Pages (instrucciones abajo).

## Mecánicas (como el original)

* **Barco de 20 bodegas** conectadas por puertas en la pared del fondo. Ponte delante y pulsa arriba para cruzar. El número de la puerta indica a qué bodega lleva.
* **Puertas de un solo sentido** (las rojas con una X): solo se abren desde el otro lado.
* **Llaves y puertas numeradas**: la llave 2 abre la puerta 2. Solo puedes llevar una llave a la vez, y las llaves nunca salen de su bodega: al irte vuelven a su sitio.
* **Escaleras** que atraviesan las cubiertas, **ascensores** verticales y **balsas** horizontales.
* **Salto de arco fijo**: decides la dirección antes de saltar, igual que en 1984.
* **Suelos que se desmoronan** si te quedas quieto encima (vuelven a los 5 segundos).
* **Botín con trampa**: algunas piezas explotan un segundo después de cogerlas. ¡Corre!
* **Caer demasiado mata**, y caer al mar también.
* **Enemigos**: piratas que patrullan, ratas rápidas y loros.
* **Final**: al coger las 125 piezas aparece la **llave dorada** en esa misma bodega y tienes 45 segundos para cogerla.

## Mejoras sobre el original

* **Mapa del barco** (tecla TAB): bodegas visitadas, botín que queda en cada una y conexiones.
* **Guardado automático** en cada puerta: puedes cerrar y continuar otro día (tecla C en el título).
* Vida extra cada 30 piezas, puntuación máxima y controles táctiles en el móvil.

## Controles

| Tecla | Acción |
|---|---|
| Flechas o WASD | Andar y usar escaleras |
| Arriba delante de una puerta | Cruzar a otra bodega |
| Espacio (o Z) | Saltar (con izquierda o derecha pulsada, salto en esa dirección) |
| TAB o N | Mapa del barco |
| P o Esc | Pausa |
| R | Volver a la puerta de entrada (cuesta una vida) |
| M | Música on/off |
| C | Continuar partida guardada (en la pantalla de título) |

## Publicar en GitHub Pages

1. Descomprime `booty-game.zip`.
2. En tu repositorio de GitHub, pulsa **Add file > Upload files**.
3. Arrastra **todo el contenido** de la carpeta (incluidas las carpetas `fonts` y `tools`) y pulsa **Commit changes**. Reemplaza los archivos antiguos.
4. **Settings > Pages**: Source **Deploy from a branch**, Branch **main**, carpeta **/ (root)**.
5. En 1 o 2 minutos el juego estará en `https://TU_USUARIO.github.io/NOMBRE_DEL_REPO/`. Recarga con Ctrl+Shift+R para evitar la caché.

## Estructura

```
index.html            página y controles táctiles
levels.js             las 20 bodegas (mapas ASCII y conexiones, fáciles de editar)
engine.js             física: cubiertas, escaleras, ascensores, saltos, puertas, enemigos
game.js               gráficos, sonido, música, mapa, pantallas y reglas del juego
fonts/                fuente Press Start 2P (licencia OFL)
tools/check-levels.js comprobador automático del barco completo (Node.js)
LEVEL_EDITOR.md       guía para editar y crear bodegas
```

## Comprobado

* `node tools/check-levels.js` usa la física real del juego para demostrar que las 125 piezas son alcanzables, que todas las llaves abren su puerta, que no hay ningún punto sin salida y que desde cualquier bodega se puede llegar a todas las demás.
* Un bot ha completado el barco entero dentro del juego (20 bodegas, 26 cambios de bodega, 125 piezas y llave dorada) en unos 8 minutos de juego perfecto. Una persona tardará bastante más.

## Créditos

* Inspirado en *Booty* (Firebird Software, 1984), de Kevin A. Moughtin. Homenaje sin ánimo de lucro: los gráficos, los nombres, los mapas y el código son originales.
* Música: *What Shall We Do with the Drunken Sailor* (tradicional, dominio público).
* Fuente: *Press Start 2P* de CodeMan38, licencia SIL Open Font License (`fonts/OFL.txt`).
