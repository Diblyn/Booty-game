# Cómo editar y crear bodegas

El barco está en `levels.js`: un array de bodegas. La bodega 1 es donde empieza el jugador. Cada bodega es un mapa ASCII de **32 columnas x 21 filas** (cada carácter es una casilla de 8x8 píxeles) más la lista de a dónde llevan sus puertas.

En el mapa del juego (TAB) las bodegas se colocan de 5 en 5: 1 a 5 en la cubierta de arriba, 6 a 10 debajo, y así sucesivamente.

## Leyenda

| Carácter | Qué es |
|---|---|
| `#` | Pared o casco (sólido) |
| `=` | Cubierta (suelo sólido) |
| `-` | Cubierta que se desmorona (vuelve a los 5 s) |
| `H` | Escalera |
| `+` | Escalera que atraviesa una cubierta |
| `$` | Botín |
| `!` | Botín con trampa (explota 1 s después de cogerlo) |
| `a` a `i` | Llave 1 a 9 |
| `1` a `9` | Puerta cerrada con ese número (2 casillas de alto) |
| `D` | Puerta a otra bodega (2 casillas de alto, encima de una cubierta) |
| `@` | Inicio del jugador (solo en la bodega 1) |
| `P` `R` `V` | Pirata, rata, loro |
| `o` `O` `L` `K` `z` `~` | Decoración: barril, ojo de buey, farol, cañón, bandera pirata, mar |

## Estructura de una bodega

```js
{
  name: "CARGO HOLD",
  tip: "TWO KEYS, TWO DOORS. YOU CAN ONLY CARRY ONE KEY.",
  theme: { bg: "#000000", floor: "#D70000", floorHi: "#FF4848", floorLo: "#6A0000",
           ladder: "#00D7D7", wall: "#8B4A1C", wallHi: "#C07438", crumble: "#FF8C00" },
  links: [{ to: 13 }, { to: 11 }, { to: 17 }],
  lifts: [ { x: 13, y: 15, w: 2, dx: 4, spd: 0.5 } ],
  map: [ ...21 filas de 32 caracteres... ]
}
```

* `tip` aparece la primera vez que entras en la bodega (en mayúsculas: la fuente no tiene minúsculas).
* `theme` son los colores de la bodega.

## Puertas entre bodegas (`links`)

Hay una entrada en `links` por cada puerta `D` del mapa, **en orden de lectura**: de arriba abajo y, en la misma fila, de izquierda a derecha.

* `{ to: 7 }`: la puerta lleva a la bodega 7. En la bodega 7 tiene que haber una puerta con `{ to: N }` (ida y vuelta) o `{ from: N }`, donde N es esta bodega.
* `{ from: 3 }`: puerta de llegada de un solo sentido. Se entra por ella desde la bodega 3, pero no se puede volver. Se dibuja roja con una X.

Al cruzar una puerta apareces delante de la puerta emparejada de la otra bodega.

## Ascensores (`lifts`)

| Campo | Significado |
|---|---|
| `x`, `y` | Casilla de inicio (esquina superior izquierda de la plataforma) |
| `w` | Ancho en casillas |
| `dx` | Recorrido horizontal en casillas |
| `dy` | Recorrido vertical en casillas (negativo = hacia arriba) |
| `spd` | Velocidad en píxeles por fotograma |
| `phase` | Desfase de 0 a 1 para sincronizar varios ascensores |

Deja un hueco en las cubiertas por donde pasa el ascensor. Consejo: elige `spd` para que la vuelta completa dure 128 o 256 fotogramas (`spd = 2 x recorrido x 8 / 256`); así el comprobador va rápido.

## Reglas de diseño que funcionan

* Cubiertas en las filas 5, 10, 15 y 20: dejan 4 filas de aire, justo lo que necesita el jugador.
* El salto es de arco fijo: unas 3 casillas de largo y 2 de alto. Un hueco de 2 casillas es cómodo; uno de 3 es exigente.
* Caer más de 8 casillas mata; caer una cubierta (5 filas) es seguro.
* Las llaves no salen de su bodega: la llave y su puerta tienen que estar en la misma bodega.
* No pongas una puerta `D` en la misma columna que una escalera.

## Comprobar el barco

Con Node.js instalado:

```bash
node tools/check-levels.js       # el barco completo (2 o 3 minutos)
node tools/check-levels.js 7     # solo la bodega 7
```

El comprobador usa la física real del juego y avisa si:

* hay botín que no se puede alcanzar,
* una llave no tiene puerta o una puerta no se puede abrir,
* existe un punto del que no se puede salir (ni volver a la puerta de entrada ni salir por otra),
* alguna bodega queda aislada o alguna puerta de un solo sentido te deja sin forma de llegar al resto del barco.

Los enemigos no se tienen en cuenta: comprueba jugando que siempre se puedan esquivar o saltar.

## Añadir una bodega

1. Añade la bodega al final de `levels.js`.
2. Conéctala: pon al menos una puerta `D` en ella y otra en una bodega existente, con sus `links` emparejados.
3. Ejecuta `node tools/check-levels.js` hasta que salga `OK`.

El total de botín y el número de bodegas se calculan solos. Si añades más de 20 bodegas, el mapa del barco solo muestra las 20 primeras.
