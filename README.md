# BOOTY (remake web)

Remake en HTML, CSS y JavaScript puro del clásico de plataformas y puzles **Booty** (Firebird, 1984). Eres un grumete atrapado en un barco pirata: recorre 10 bodegas, recoge las **125 piezas de botín** y encuentra la llave dorada.

**Jugar:** abre `index.html` en el navegador o publícalo en GitHub Pages (instrucciones abajo).

## Mecánicas (como el original)

* **Escaleras** que atraviesan las cubiertas para subir y bajar entre pisos.
* **Salto de arco fijo**: decides la dirección antes de saltar, igual que en 1984.
* **Llaves y puertas numeradas**: la llave 2 abre la puerta 2. Solo puedes llevar una llave a la vez: si coges otra, la tuya se queda en el suelo.
* **Ascensores** verticales y **plataformas móviles** horizontales que te transportan por el barco.
* **Suelos que se desmoronan** si te quedas quieto encima (vuelven a los 5 segundos).
* **Botín con trampa**: algunas piezas explotan un segundo después de cogerlas. ¡Corre!
* **Caer demasiado mata** (más de 8 casillas).
* **Enemigos**: piratas que patrullan, ratas rápidas y el loro del barco.
* La salida de cada bodega se abre al coger todo su botín.
* **Final**: en la bodega 10, al coger todo aparece la **llave dorada** y tienes 45 segundos.
* Vida extra cada 30 piezas, puntuación máxima y partida guardada (continuar desde la última bodega).

## Controles

| Tecla | Acción |
|---|---|
| Flechas o WASD | Andar, subir y bajar escaleras |
| Espacio (o Z) | Saltar (con izquierda o derecha pulsada, salto en esa dirección) |
| P o Esc | Pausa |
| R | Reiniciar la bodega |
| M | Música on/off |
| C | Continuar partida (en la pantalla de título) |

En móvil aparecen botones táctiles.

## Publicar en GitHub Pages

1. Descomprime `booty-game.zip`.
2. En tu repositorio de GitHub, pulsa **Add file > Upload files**.
3. Arrastra **todo el contenido** de la carpeta (incluidas las carpetas `fonts` y `tools`) y pulsa **Commit changes**. Si te pregunta, reemplaza los archivos antiguos.
4. **Settings > Pages**: Source **Deploy from a branch**, Branch **main**, carpeta **/ (root)**. Guarda.
5. En 1 o 2 minutos el juego estará en `https://TU_USUARIO.github.io/NOMBRE_DEL_REPO/`.

## Estructura

```
index.html            página y controles táctiles
levels.js             las 10 bodegas (mapas ASCII, fáciles de editar)
engine.js             física: cubiertas, escaleras, ascensores, saltos, enemigos
game.js               gráficos, sonido, música, pantallas y reglas del juego
fonts/                fuente Press Start 2P (licencia OFL)
tools/check-levels.js comprobador automático de niveles (Node.js)
LEVEL_EDITOR.md       guía para crear bodegas nuevas
```

## Añadir niveles

Lee `LEVEL_EDITOR.md`. Cada bodega es un mapa de texto de 32 x 21 caracteres, y `node tools/check-levels.js` comprueba con la física real del juego que se puede completar y que no hay trampas sin salida.

## Créditos

* Inspirado en *Booty* (Firebird Software, 1984), de Kevin A. Moughtin. Es un homenaje sin ánimo de lucro: los gráficos, los niveles y el código son originales.
* Música: *What Shall We Do with the Drunken Sailor* (tradicional, dominio público).
* Fuente: *Press Start 2P* de CodeMan38, licencia SIL Open Font License (`fonts/OFL.txt`).
