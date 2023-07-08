import * as game from './core/game.js'
import * as gfx from './core/webgl.js'
import Board from './board.js'

game.config.width = 256
game.config.height = 144
//game.config.isWebglEnabled = false
document.title = 'Elemental Cave'

await game.loadAssets({
  images: {
    square: 'images/square.png',

    // Player
    player_fire: 'images/player_fire.png',
    player_golem: 'images/player_golem.png',
    player_rock: 'images/player_rock.png',
    player_wind: 'images/player_wind.png',
    player_ice: 'images/player_ice.png',
    player_vine: 'images/player_plant.png',

    // Terrain
    tileGrass: 'images/tile_grass.png',
    tileGrassBlades: 'images/tile_grass_blades.png',
    tileWater: 'images/tile_water.png',
    wallRock: 'images/wall_rock.png',
    conGrassTop: 'images/con_grass_top.png',
    conGrassBottom: 'images/con_grass_bottom.png',
    conGrassLeft: 'images/con_grass_left.png',
    conGrassRight: 'images/con_grass_right.png',
    conGrassCliffTopLeft: 'images/con_grass_cliff_top_left.png',
    conGrassCliffTopRight: 'images/con_grass_cliff_top_right.png',
    conGrassCliffLeft: 'images/con_grass_cliff_left.png',
    conGrassCliffRight: 'images/con_grass_cliff_right.png',

    // Deco Objects
    deco_rock: 'images/deco_rocks.png',
    deco_wood: 'images/deco_wood.png',
    deco_ice: 'images/deco_ice.png',
    deco_vine: 'images/deco_ice.png',

    // UI
    iconSelected: 'images/icon_occupied_player.png',
    iconNearest: 'images/icon_occupied_small.png',
  },

  json: {
    intro: 'json/levels/intro.json',
  },

  sounds: {
    // collect: 'sounds/collect.wav',
    // laser: 'sounds/laser2.wav',
    // laserHit: 'sounds/laser.wav',
    // shift: 'sounds/shift2.wav',
    // thump: 'sounds/thump.wav',
    // wind: 'sounds/wind.wav',
    // fail: 'sounds/fail.wav',
    // whoosh: 'sounds/whoosh.wav',
  },
})


const { assets } = game

assets.textures = Object.fromEntries(
  Object.entries(assets.images).map(([name, image]) => [
    name, gfx.createTexture(image)
  ])
)

// console.log(assets)

game.globals.levelCount = 1
game.globals.levelCompletions = []
game.globals.usingGamepad = false

for (let i = 0; i < game.globals.levelCount; i++) {
  game.globals.levelCompletions.push(false)
}
game.globals.level = 1


game.setScene(() => {
  game.addThing(new Board())
})
