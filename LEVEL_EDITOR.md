# Booty Level Editor Guide

Este documento explica cómo crear y editar niveles en Booty.

## Estructura Básica de un Nivel

Cada nivel es un objeto JavaScript en el array `LEVELS` dentro de `game.js`:

```javascript
{
    name: 'Nombre del Nivel',
    playerStart: { x: 50, y: 450 },
    platforms: [],
    buttons: [],
    doors: [],
    movingBlocks: [],
    platforms2: [],
    exit: { x: 700, y: 350 }
}
```

## Componentes del Nivel

### 1. Player Start (`playerStart`)
Posición inicial del jugador.

```javascript
playerStart: { x: 50, y: 450 }
```

- `x`: posición horizontal (0-800)
- `y`: posición vertical (0-600)

### 2. Platforms (Plataformas Estáticas)
Plataformas que el jugador puede saltar y caminar.

```javascript
platforms: [
    { x: 0, y: 550, width: 800, height: 50 },    // Suelo
    { x: 200, y: 480, width: 150, height: 30 }   // Plataforma
]
```

- `x, y`: posición superior-izquierda
- `width`: ancho
- `height`: alto (mínimo 30 para saltar)

**Tips:**
- Incluir un suelo grande (ancho 800, alto 50) al y=550
- Espaciar plataformas ~80-120px verticalmente
- Ancho típico: 80-150px

### 3. Moving Blocks (Plataformas Móviles)
Plataformas que se mueven horizontalmente.

```javascript
movingBlocks: [
    {
        x: 300, y: 300,           // Posición inicial
        width: 80, height: 30,     // Tamaño
        startX: 250, endX: 550,    // Rango de movimiento
        speed: 2                   // Velocidad (1-4 recomendado)
    }
]
```

**Tips:**
- `startX` y `endX` definen los límites del movimiento
- `speed`: 1-1.5 (lento), 2-2.5 (normal), 3+ (rápido)
- El bloque rebota automáticamente al llegar al límite

### 4. Buttons (Botones)
Presionan el jugador para activar puertas.

```javascript
buttons: [
    { x: 420, y: 420, targetDoor: 'door1' }
]
```

- `x, y`: posición del botón
- `targetDoor`: ID de la puerta que abre (string)

**Tips:**
- Cambiar color de amarillo a verde cuando se presiona
- Colocar cerca de plataformas donde el jugador pasa

### 5. Doors (Puertas)
Barreras que se abren al presionar su botón asociado.

```javascript
doors: [
    { x: 300, y: 350, width: 60, height: 80, id: 'door1' }
]
```

- `x, y`: posición superior-izquierda
- `width, height`: tamaño
- `id`: identificador único (debe coincidir con `targetDoor` del botón)

**Tips:**
- Puertas verticales: height > width
- Alto típico: 60-100px
- Ancho típico: 50-70px

### 6. Exit (Salida)
Objetivo del nivel.

```javascript
exit: { x: 700, y: 350 }
```

- `x, y`: posición (aparece como ⭐)
- Automáticamente 30x30px

## Ejemplo Completo: Nivel Simple

```javascript
{
    name: 'First Challenge',
    playerStart: { x: 50, y: 450 },
    platforms: [
        { x: 0, y: 550, width: 800, height: 50 },      // Suelo
        { x: 150, y: 480, width: 100, height: 30 },    // Plataforma 1
        { x: 350, y: 400, width: 100, height: 30 },    // Plataforma 2
        { x: 550, y: 320, width: 100, height: 30 }     // Plataforma 3
    ],
    buttons: [],
    doors: [],
    movingBlocks: [],
    exit: { x: 700, y: 270 }
}
```

## Ejemplo Intermedio: Con Botón y Puerta

```javascript
{
    name: 'Button Puzzle',
    playerStart: { x: 50, y: 450 },
    platforms: [
        { x: 0, y: 550, width: 800, height: 50 },
        { x: 100, y: 480, width: 100, height: 30 },
        { x: 250, y: 400, width: 80, height: 30 },
        { x: 450, y: 320, width: 100, height: 30 }
    ],
    buttons: [
        { x: 280, y: 340, targetDoor: 'door1' }
    ],
    doors: [
        { x: 350, y: 350, width: 60, height: 80, id: 'door1' }
    ],
    movingBlocks: [],
    exit: { x: 700, y: 270 }
}
```

## Ejemplo Avanzado: Múltiples Plataformas Móviles

```javascript
{
    name: 'Master Timing',
    playerStart: { x: 50, y: 450 },
    platforms: [
        { x: 0, y: 550, width: 800, height: 50 }
    ],
    buttons: [
        { x: 110, y: 420, targetDoor: 'door1' },
        { x: 630, y: 260, targetDoor: 'door2' }
    ],
    doors: [
        { x: 400, y: 330, width: 50, height: 60, id: 'door1' },
        { x: 550, y: 250, width: 50, height: 60, id: 'door2' }
    ],
    movingBlocks: [
        { x: 250, y: 400, width: 70, height: 30, startX: 200, endX: 500, speed: 2.5 },
        { x: 600, y: 320, width: 70, height: 30, startX: 550, endX: 750, speed: 2 }
    ],
    exit: { x: 420, y: 190 }
}
```

## Guía de Dificultad

### Fácil (Niveles 1-2)
- Solo plataformas estáticas
- Espaciado generoso (120-150px verticales)
- Sin botones ni puertas
- Exit fácilmente alcanzable

### Intermedio (Niveles 3-5)
- Introducir 1 botón/puerta
- 1 plataforma móvil lenta (speed 1-2)
- Espaciado medio (100-120px)
- Timing simple

### Avanzado (Niveles 6-8)
- 2-3 botones/puertas
- 2-3 plataformas móviles (speed 2-3)
- Espaciado ajustado (80-100px)
- Requiere esperar el timing correcto

### Experto (Niveles 9-10)
- 3+ botones/puertas coordinadas
- 4+ plataformas móviles (speed 2-3.5)
- Espaciado muy ajustado (60-80px)
- Múltiples intentos necesarios
- Timing crítico en secuencias

## Fórmula de Distancia de Salto

Con `JUMP_POWER = -12`, el jugador puede saltar aproximadamente:

- **Sin impulso horizontal**: ~150px arriba
- **Alcance horizontal máximo**: ~120px

Para diseñar plataformas seguras:
```
Espacio vertical recomendado: 100-120px
Distancia horizontal: 80-150px
```

## Testing/Debugging

### Verificar Posiciones
Usa las coordenadas del canvas (800x600):
- `x: 0` = borde izquierdo
- `x: 800` = borde derecho
- `y: 0` = arriba
- `y: 600` = abajo

### Herramientas Útiles
1. **DevTools Console**: Editar `LEVELS[9]` y recargar
2. **Grid Visual**: Las líneas grises en el canvas ayudan a alinear (40px por tile)

## Checklist para Nuevo Nivel

- [ ] `playerStart` no superpone obstáculos
- [ ] Plataformas alineadas al grid (preferible)
- [ ] Exit es alcanzable desde la última plataforma
- [ ] Botones tienen ID único en `targetDoor`
- [ ] Puertas tienen ID único en `id`
- [ ] `platforms2` está vacío o completamente definido
- [ ] Testear el nivel 3+ veces
- [ ] Documentar dificultad esperada en `name`

## Agregar Nivel al Juego

1. Abre `game.js`
2. Busca el array `LEVELS`
3. Copia el último nivel y modifica
4. Guarda y recarga en navegador
5. El juego detecta automáticamente 10 niveles

**Nota**: Si agregas más de 10 niveles, actualiza la UI en `index.html` (línea que dice "Level: X/10").

---

¡Diviértete diseñando niveles! 🎮
