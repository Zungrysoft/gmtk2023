import * as game from './core/game.js'
import * as gfx from './core/webgl.js'
import Board from './board.js'
import TitleScreen from './titlescreen.js'

//game.config.width = 1600 * 3/4
//game.config.height = 1200 * 3/4
//game.config.isWebglEnabled = false
document.title = 'You Are Person Guy'

await game.loadAssets({
  images: {
    // Player
    player_person: 'images/guy.png',
    player_fire: 'images/fireguy.png',
    player_golem: 'images/golemguy.png',
    player_wind: 'images/windguy2.png',
    player_wind_front: 'images/windguy3.png',
    player_wind_back: 'images/windguy4.png',
    player_ice: 'images/iceguy.png',
    player_vine: 'images/vineguy.png',
    player_water: 'images/waterguy.png',

    // Blob guy
    player_blob: 'images/blobguy.png',
    player_blob_front: 'images/blobguy2.png',
    player_blob_back: 'images/blobguy3.png',
    player_fire_blob: 'images/blobguy_fireguy.png',
    player_golem_blob: 'images/blobguy_golemguy.png',
    player_wind_blob: 'images/blobguy_windguy2.png',
    player_wind_front_blob: 'images/blobguy_windguy3.png',
    player_wind_back_blob: 'images/blobguy_windguy4.png',
    player_ice_blob: 'images/blobguy_iceguy.png',
    player_vine_blob: 'images/blobguy_vineguy.png',
    player_water_blob: 'images/blobguy_waterguy.png',

    // Deco Objects
    deco_rock: 'images/rock.png',
    deco_waterlogged_rock: 'images/waterlogged_rock.png',
    deco_wood: 'images/plant1.png',
    deco_ice: 'images/ice.png',
    deco_waterlogged_ice: 'images/ice.png',
    deco_vine: 'images/vine_h.png',
    deco_vine_v: 'images/vine_v.png',
    deco_box: 'images/box.png',
    deco_waterlogged_box: 'images/waterlogged_box.png',
    deco_fire: 'images/fire1.png',
    deco_wind: 'images/wind.png',
    deco_wave: 'images/wave.png',
    deco_mine: 'images/mine.png',
    sign: 'images/sign.png',

    // UI
    iconNearest: 'images/selection_arrows.png',
    selectorArrow: 'images/selector_arrow.png',
    aimArrow: 'images/aim_arrow.png',
    aimArrowBlob: 'images/aim_arrow_blob.png',
    skull: 'images/skull.png',
    goal: 'images/win_flag.png',
    you_win: 'images/you_win.png',
    you_died: 'images/you_died.png',
    title: 'images/title.png',
    checkbox_unchecked: 'images/checkbox_unchecked.png',
    checkbox_checked: 'images/checkbox_checked.png',
    undefined: 'images/mystery.png',
  },

  json: {
    swim: 'json/levels/swim.json',
    shutter: 'json/levels/shutter.json',
    maze: 'json/levels/maze.json',
    dodging: 'json/levels/dodging.json',
    corners: 'json/levels/corners.json',
    windy: 'json/levels/windy.json',
    swamp: 'json/levels/swamp.json',
    vine: 'json/levels/vine.json',
    blocking: 'json/levels/blocking.json',
    big: 'json/levels/big.json',
    islands: 'json/levels/islands.json',
    islets: 'json/levels/islets.json',
    sokoban: 'json/levels/sokoban.json',
    boat: 'json/levels/boat.json',
    snowblower: 'json/levels/snowblower.json',
    // corridors: 'json/levels/corridors.json',
    intro: 'json/levels/intro.json',
    four: 'json/levels/four.json',
    fire: 'json/levels/fire.json',
    cove: 'json/levels/cove.json',
    fountain: 'json/levels/fountain.json',
    bird: 'json/levels/bird.json',
    lake: 'json/levels/lake.json',
    safety: 'json/levels/safety.json',
    ferry: 'json/levels/ferry.json',
    distance: 'json/levels/distance.json',
    windwall: 'json/levels/windwall.json',
    vineice: 'json/levels/vineice.json',
    // iceshuffle: 'json/levels/iceshuffle.json',
    iceshuffle2: 'json/levels/iceshuffle2.json',
    corridors2: 'json/levels/corridors2.json',
    icecrawl: 'json/levels/icecrawl.json',
    dodging2: 'json/levels/dodging2.json',
    dodging3: 'json/levels/dodging3.json',
    vinewall: 'json/levels/vinewall.json',
    icerace: 'json/levels/icerace.json',
    blob: 'json/levels/blob.json',
  },

  sounds: {
    step: 'sounds/step.wav',
    vine: 'sounds/vine.wav',
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
    menu_move: 'sounds/menu_move.wav',
    menu_ok: 'sounds/menu_ok.wav',
    menu_back: 'sounds/menu_back.wav',
    puzzle_music: 'sounds/personguy_puzzle1.mp3',
    title_music: 'sounds/personguy_title.mp3',
  },
})


const { assets } = game

// console.log(assets)

game.globals.levelCount = 50
game.globals.levelCompletions = []
game.globals.usingGamepad = false
game.globals.musicOn = true
game.globals.soundOn = true

for (let i = 0; i < game.globals.levelCount; i++) {
  game.globals.levelCompletions.push(false)
}
game.globals.level = 1
game.globals.showTitle = true

if (localStorage.levelCompletions && localStorage.personGuyVersion === '1') {
  try {
    game.globals.levelCompletions = JSON.parse(localStorage.levelCompletions)
  } catch (e) {
    game.globals.levelCompletions = []
  }
}
localStorage.personGuyVersion = '1'

game.setScene(() => {
  game.addThing(new Board())
  if (game.globals.showTitle) {
    game.addThing(new TitleScreen())
    game.globals.showTitle = false
  }
})
