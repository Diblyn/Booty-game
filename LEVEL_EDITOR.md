# Cómo crear y editar bodegas (niveles)

Todas las bodegas están en `levels.js`. Cada una es un mapa ASCII de **32 columnas x 21 filas**. Cada carácter es una casilla de 8x8 píxeles.

## Leyenda

| Carácter | Qué es |
|---|---|
| `#` | Pared o casco (sólido) |
| `=` | Cubierta (suelo sólido) |
| `-` | Cubierta que se desmorona (desaparece si te quedas encima y vuelve a los 5 s) |
| `H` | Escalera |
| `+` | Escalera que atraviesa una cubierta (se puede pisar y trepar) |
| `$` | Botín |
| `!` | Botín con trampa: explota 1 segundo después de cogerlo |
| `a` a `i` | Llave 1 a 9 |
| `1` a `9` | Puerta cerrada con ese número (2 casillas de alto) |
| `X` | Puerta de salida (2 casillas de alto). Se abre al coger todo el botín |
| `G` | Llave dorada (solo en la bodega final, con `finale: true`) |
| `@` | Inicio del jugador (casilla de los pies) |
| `P` `R` `V` | Pirata, rata, loro |
| `o` `O` `L` `K` `z` `~` | Decoración: barril, ojo de buey, farol, cañón, bandera pirata, mar |

## Estructura de una bodega

```js
{
  name: "CARGO HOLD",
  tip: "KEYS OPEN THE DOOR WITH THE SAME NUMBER.",
  theme: { bg: "#000000", floor: "#D70000", floorHi: "#FF4848", floorLo: "#6A0000",
           ladder: "#00D7D7", wall: "#8B4A1C", wallHi: "#C07438", crumble: "#FF8C00" },
  lifts: [ { x: 13, y: 15, w: 2, dx: 4, spd: 0.5 } ],
  map: [ ...21 filas de 32 caracteres... ]
}
```

* `name` y `tip` se muestran en la pantalla de presentación de la bodega (en mayúsculas, la fuente no tiene minúsculas).
* `theme` son los colores de esa bodega.
* `finale: true` convierte la bodega en la final: al coger todo el botín aparece la llave dorada `G` y hay 45 segundos para cogerla.

## Ascensores (`lifts`)

| Campo | Significado |
|---|---|
| `x`, `y` | Casilla de inicio (esquina superior izquierda de la plataforma) |
| `w` | Ancho en casillas |
| `dx` | Recorrido horizontal en casillas (ascensor horizontal) |
| `dy` | Recorrido vertical en casillas, negativo hacia arriba (ascensor vertical) |
| `spd` | Velocidad en píxeles por fotograma (0.5 recomendado) |
| `phase` | Desfase de 0 a 1 para sincronizar varios ascensores |

Deja un hueco en las cubiertas por donde pasa el ascensor. En los extremos del recorrido la plataforma queda al nivel de la cubierta para que se pueda subir y bajar andando.

## Reglas de diseño que funcionan

* Cubiertas en las filas 5, 10, 15 y 20: dejan 4 filas de aire, justo lo que necesita el jugador (2 de alto) para saltar sin chocar.
* El salto es de arco fijo, como en 1984: unas 3 casillas de largo y 2 de alto. Un hueco de 2 casillas es cómodo; uno de 3 es exigente.
* Caer más de 8 casillas mata. Caer una cubierta (5 filas) es seguro; caer dos, no.
* Solo se puede llevar una llave. Si coges otra, la que llevabas se queda en su sitio.
* Cada escalera que baja debe tener forma de volver a subir, o el jugador quedará atrapado.

## Comprobar que una bodega se puede completar

Con Node.js instalado:

```bash
node tools/check-levels.js        # todas las bodegas
node tools/check-levels.js 4      # solo la bodega 4
```

El comprobador usa la física real del juego y prueba todos los movimientos posibles. Avisa si:

* hay botín, llaves o salida inalcanzables,
* una puerta no se puede abrir,
* existe algún sitio del que no se puede volver al inicio (trampa).

Los enemigos no se tienen en cuenta: comprueba que siempre se puedan esquivar o saltar.

## Añadir una bodega nueva

1. Copia la última bodega de `levels.js` y pégala al final del array.
2. Cambia `name`, `tip`, `theme` y dibuja el `map` (21 filas de exactamente 32 caracteres).
3. Ejecuta `node tools/check-levels.js` hasta que salga `OK`.
4. Abre `index.html` en el navegador y juega.

El juego detecta automáticamente cuántas bodegas hay. Si quieres que la nueva sea la final, mueve `finale: true` a ella.
