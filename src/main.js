import * as game from './core/game.js'
import * as gfx from './core/webgl.js'
import Board from './board.js'
import Character from './character.js'

//game.config.width = 1600 * 3/4
//game.config.height = 1200 * 3/4
//game.config.isWebglEnabled = false
document.title = 'Elemental Cave'

await game.loadAssets({
  images: {
    square: 'images/square.png',

    // Player
    player_person: 'images/guy.png',
    player_fire: 'images/fireguy.png',
    player_golem: 'images/rockguy.png',
    player_rock: 'images/plantguy.png',
    player_wind: 'images/windguy2.png',
    player_ice: 'images/iceguy.png',
    player_vine: 'images/plantguy.png',
    player_water: 'images/waterguy.png',

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
    deco_rock: 'images/rock.png',
    deco_waterlogged_rock: 'images/waterlogged_rock.png',
    deco_wood: 'images/plant1.png',
    deco_ice: 'images/ice.png',
    deco_vine: 'images/vine_v.png',
    deco_box: 'images/box.png',
    deco_waterlogged_box: 'images/waterlogged_box.png',
    deco_fire: 'images/fire1.png',
    deco_wind: 'images/wind.png',
    deco_wave: 'images/wave.png',

    // UI
    iconSelected: 'images/icon_occupied_player.png',
    iconNearest: 'images/selection_arrows.png',
    selectorArrow: 'images/selector_arrow.png',
    aimArrow: 'images/aim_arrow.png',
    skull: 'images/skull.png',
    undefined: 'images/mystery.png',
  },

  json: {
    intro: 'json/levels/intro.json',
    swim: 'json/levels/swim.json',
    shutter: 'json/levels/shutter.json',
    maze: 'json/levels/maze.json',
  },

  sounds: {
    step: 'sounds/step.wav',
    death: 'sounds/death.wav',
    select: 'sounds/select.wav',
    start_possession: 'sounds/start_possession.wav',
    stop_possession: 'sounds/stop_possession.wav',
    move_stone: 'sounds/move_stone.wav',
    sploosh: 'sounds/sploosh.wav',
    wind: 'sounds/wind.wav',
  },
})


const { assets } = game

// console.log(assets)

game.globals.levelCount = 4
game.globals.levelCompletions = []
game.globals.usingGamepad = false

for (let i = 0; i < game.globals.levelCount; i++) {
  game.globals.levelCompletions.push(false)
}
game.globals.level = 1


game.setScene(() => {
  game.addThing(new Board())
  //game.addThing(new Character())
})
