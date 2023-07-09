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
    // Player
    player_person: 'images/guy.png',
    player_fire: 'images/fireguy.png',
    player_golem: 'images/rockguy.png',
    player_rock: 'images/plantguy.png',
    player_wind: 'images/windguy2.png',
    player_ice: 'images/iceguy.png',
    player_vine: 'images/plantguy.png',
    player_water: 'images/waterguy.png',

    // Deco Objects
    deco_rock: 'images/rock.png',
    deco_waterlogged_rock: 'images/waterlogged_rock.png',
    deco_wood: 'images/plant1.png',
    deco_ice: 'images/ice.png',
    deco_waterlogged_ice: 'images/ice.png',
    deco_vine: 'images/vine_v.png',
    deco_box: 'images/box.png',
    deco_waterlogged_box: 'images/waterlogged_box.png',
    deco_fire: 'images/fire1.png',
    deco_wind: 'images/wind.png',
    deco_wave: 'images/wave.png',

    // UI
    iconNearest: 'images/selection_arrows.png',
    selectorArrow: 'images/selector_arrow.png',
    aimArrow: 'images/aim_arrow.png',
    skull: 'images/skull.png',
    goal: 'images/win_flag.png',
    you_win: 'images/you_win.png',
    you_died: 'images/you_died.png',
    undefined: 'images/mystery.png',
  },

  json: {
    intro: 'json/levels/intro.json',
    blocking: 'json/levels/blocking.json',
    swim: 'json/levels/swim.json',
    shutter: 'json/levels/shutter.json',
    maze: 'json/levels/maze.json',
    dodging: 'json/levels/dodging.json',
    corners: 'json/levels/corners.json',
    windy: 'json/levels/windy.json',
    swamp: 'json/levels/swamp.json',
    vine: 'json/levels/vine.json',
    big: 'json/levels/big.json',
  },

  sounds: {
    step: 'sounds/step.wav',
    death: 'sounds/death.wav',
    select: 'sounds/select1.wav',
    start_possession: 'sounds/start_possession.wav',
    stop_possession: 'sounds/stop_possession.wav',
    move_stone: 'sounds/move_stone.wav',
    sploosh: 'sounds/sploosh.wav',
    wind: 'sounds/wind.wav',
    game_over: 'sounds/game_over.wav',
    win: 'sounds/win.wav',
    undo: 'sounds/undo.wav',
    fire: 'sounds/fire.wav',
  },
})


const { assets } = game

// console.log(assets)

game.globals.levelCount = 50
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
