import * as game from './core/game.js'
import * as soundmanager from './core/soundmanager.js'
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
    player_magnet: 'images/magnetguy.png',
    player_magnet_alt: 'images/magnetguy_alt.png',
    player_void: 'images/voidguy.png',
    player_butter: 'images/butterguy.png',
    player_butter_front: 'images/butterguy2.png',

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
    player_magnet_blob: 'images/blobguy_magnetguy.png',
    player_void_blob: 'images/blobguy_voidguy.png',

    // Deco Objects
    deco_rock: 'images/rock.png',
    deco_rock_waterlogged: 'images/rock_waterlogged.png',
    deco_wood: 'images/plant1.png',
    deco_ice: 'images/ice.png',
    deco_ice_waterlogged: 'images/ice.png',
    deco_vine: 'images/vine_h.png',
    deco_vine_v: 'images/vine_v.png',
    deco_box: 'images/box.png',
    deco_box_waterlogged: 'images/box_waterlogged.png',
    deco_fire: 'images/fire1.png',
    deco_wind: 'images/wind.png',
    deco_wave: 'images/wave.png',
    deco_mine: 'images/mine.png',
    deco_metal: 'images/metal.png',
    deco_metal_waterlogged: 'images/metal_waterlogged.png',
    deco_electricity: 'images/electricity.png',
    deco_electricity_alt: 'images/electricity_alt.png',
    deco_foliage_1: 'images/foliage1.png',
    deco_foliage_2: 'images/foliage2.png',
    deco_foliage_3: 'images/foliage3.png',
    deco_foliage_4: 'images/foliage4.png',
    deco_foliage_5: 'images/foliage5.png',
    deco_xray: 'images/xray.png',
    deco_xray_waterlogged: 'images/xray_waterlogged.png',
    deco_leaf: 'images/leaf.png',
    deco_void_particle: 'images/void_particle.png',
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
    undefined_sprite: 'images/mystery.png',
  },

  json: {
    // Level definition file
    levelList: 'json/levellist.json',

    // Level files
    test: 'json/levels/test.json',
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
    corridors: 'json/levels/corridors.json',
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
    iceshuffle: 'json/levels/iceshuffle.json',
    iceshuffle2: 'json/levels/iceshuffle2.json',
    corridors2: 'json/levels/corridors2.json',
    icecrawl: 'json/levels/icecrawl.json',
    dodging2: 'json/levels/dodging2.json',
    dodging3: 'json/levels/dodging3.json',
    vinewall: 'json/levels/vinewall.json',
    icerace: 'json/levels/icerace.json',
    blobtest: 'json/levels/blobtest.json',
    twoblobs: 'json/levels/twoblobs.json',
    blob: 'json/levels/blob.json',
    shielding: 'json/levels/shielding.json',
    blobfish: 'json/levels/blobfish.json',
    blobchain: 'json/levels/blobchain.json',
    preplaced: 'json/levels/preplaced.json',
    sewers: 'json/levels/sewers.json',
    blobvine: 'json/levels/blobvine.json',
    blobice: 'json/levels/blobice.json',
    firemaze: 'json/levels/firemaze.json',
    snowmaze: 'json/levels/snowmaze.json',
    doublestack: 'json/levels/doublestack.json',
    sorting: 'json/levels/sorting.json',
    blobsight: 'json/levels/blobsight.json',
    warehouse: 'json/levels/warehouse.json',
    snowmaze2: 'json/levels/snowmaze2.json',
    magnettest: 'json/levels/magnettest.json',
    magnetintro: 'json/levels/magnetintro.json',
    vacuum: 'json/levels/vacuum.json',
    longshort: 'json/levels/longshort.json',
    metalmaze: 'json/levels/metalmaze.json',
    hallways: 'json/levels/hallways.json',
    magnetfire: 'json/levels/magnetfire.json',
    magnetwind: 'json/levels/magnetwind.json',
    magnetwind2: 'json/levels/magnetwind2.json',
    shape: 'json/levels/shape.json',
    transport: 'json/levels/transport.json',
    compact: 'json/levels/compact.json',
    hold: 'json/levels/hold.json',
    magnettrip: 'json/levels/magnettrip.json',
    delaychain: 'json/levels/delaychain.json',
    twomagnets: 'json/levels/twomagnets.json',
    magnetvine: 'json/levels/magnetvine.json',
    magnetvinewind: 'json/levels/magnetvinewind.json',
    split: 'json/levels/split.json',
    xray: 'json/levels/xray.json',
    xraymagnet: 'json/levels/xraymagnet.json',
    magnetfire2: 'json/levels/magnetfire2.json',
    blobdodge: 'json/levels/blobdodge.json',
    shape2: 'json/levels/shape2.json',
    blobmagnet: 'json/levels/blobmagnet.json',
    headwind: 'json/levels/headwind.json',
    windstop: 'json/levels/windstop.json',
    windwall2: 'json/levels/windwall2.json',
    blobchain2: 'json/levels/blobchain2.json',
    blobchain3: 'json/levels/blobchain3.json',
    windoban: 'json/levels/windoban.json',
    vineoban: 'json/levels/vineoban.json',
    vineoban2: 'json/levels/vineoban2.json',
    snowboxes: 'json/levels/snowboxes.json',
    windoban2: 'json/levels/windoban2.json',
    windsquad: 'json/levels/windsquad.json',
    metaltransport: 'json/levels/metaltransport.json',
    snowboxes2: 'json/levels/snowboxes2.json',
    bridge: 'json/levels/bridge.json',
    bridge2: 'json/levels/bridge2.json',
    seatbelt: 'json/levels/seatbelt.json',
    safety2: 'json/levels/safety2.json',
    bridge3: 'json/levels/bridge3.json',
    around: 'json/levels/around.json',
    ferry2: 'json/levels/ferry2.json',
    doublestop: 'json/levels/doublestop.json',
    windcontrol: 'json/levels/windcontrol.json',
    windintro: 'json/levels/windintro.json',
    melt: 'json/levels/melt.json',
    clamp: 'json/levels/clamp.json',
    blobchain4: 'json/levels/blobchain4.json',
    blobchain5: 'json/levels/blobchain5.json',
    blobfire: 'json/levels/blobfire.json',
    voidtest: 'json/levels/voidtest.json',
    voidfire: 'json/levels/voidfire.json',
    voidintro: 'json/levels/voidintro.json',
    stand: 'json/levels/stand.json',
    voidfire2: 'json/levels/voidfire2.json',
    voidring: 'json/levels/voidring.json',
    phaseperson: 'json/levels/phaseperson.json',
    voiddouble: 'json/levels/voiddouble.json',
    buttertest: 'json/levels/buttertest.json',
    butterintro: 'json/levels/butterintro.json',
    snowlabyrinth: 'json/levels/snowlabyrinth.json',
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
    attach: 'sounds/attach.wav',
    detach: 'sounds/detach.wav',
    squish: 'sounds/squish.wav',
    xray: 'sounds/xray2.wav',
    phase_out: 'sounds/phase_out.wav',
    phase_in: 'sounds/phase_in.wav',

    // Music
    puzzle_music: 'sounds/personguy_puzzle1.mp3',
    title_music: 'sounds/personguy_title.mp3',
  },
})


const { assets } = game

// console.log(assets)

game.globals.usingGamepad = false

game.globals.level = 'intro'
game.globals.showTitle = true

// Load localstorage data
if (localStorage.personGuyVersion === '2') {
  try {
    game.globals.levelCompletions = JSON.parse(localStorage.levelCompletions)
  } catch (e) {
    game.globals.levelCompletions = {}
  }
  try {
    game.globals.settings = JSON.parse(localStorage.settings)
  } catch (e) {
    game.globals.settings = {
      musicOn: true,
      soundOn: true,
    }
  }
}
localStorage.personGuyVersion = '2'

// Apply initial settings
soundmanager.setMusicVolume(game.globals.settings.musicOn ? 1 : 0)
soundmanager.setSoundVolume(game.globals.settings.soundOn ? 1 : 0)

game.setScene(() => {
  game.addThing(new Board())
  if (game.globals.showTitle) {
    game.addThing(new TitleScreen())
    game.globals.showTitle = false
  }
})
