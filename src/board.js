import * as game from './core/game.js'
import * as u from './core/utils.js'
import * as soundmanager from './core/soundmanager.js'
import * as gfx from './core/webgl.js'
import * as mat from './core/matrices.js'
import * as vec2 from './core/vector2.js'
import * as vec3 from './core/vector3.js'
import Thing from './core/thing.js'
import { assets } from './core/game.js'
import { getLevel, levelList } from './levelloader.js'
import Character from './character.js'
import Fire from './fire.js'
import Sign from './sign.js'
import Wave from './wave.js'
import DeathScreen from './deathscreen.js'
import PauseMenu from './pausemenu.js'

const tileWidth = 64
const tileDepth = 64
const wallDepth = 12
const waterHeight = 6

const iconMapping = {
  'bolt': 'iconItemIconBolt',
  'fire': 'iconItemIconFire',
}
const baseMapping = {
  'up': 'iconItemBaseUp',
  'down': 'iconItemBaseUp',
  'left': 'iconItemBaseLeft',
  'right': 'iconItemBaseRight',
}

export default class Board extends Thing {
  state = {}
  animState = {}
  advancementData = {
    control: '',
    queue: [],
  }
  stateStack = []
  time = 0
  nextId = 1000
  depth = -1
  lastActivePlayer = null
  movementDisabled = false

  constructor () {
    super()
    game.setThingName(this, 'board')
    game.addThing(new Walls())

    // Build board state from level file
    if (game.globals.level === 0) {
      this.state = JSON.parse(game.globals.customLevelState)
    }
    else {
      this.state = getLevel(game.globals.level)
    }

    // Add extra values to state
    this.state.level = game.globals.level
    this.state.clock = 0
    this.state.actionQueue = []
    this.state.waterlogged = {}
    this.state.turns = 0

    // Update all players
    let didActive = false
    for (const thing of this.state.things) {
      if (thing.name === 'player') {
        if (thing.type === 'person' && !didActive) {
          didActive = true
          thing.active = true
        }
        if (thing.type === 'vine') {
          this.executeExtendVines(thing, true)
        }
        if (thing.type === 'blob') {
          thing.isBlob = true
        }
      }
    }
    this.requeueAdvancements()

    // Set nextId
    this.nextId = this.state.things.at(-1).id + 1

    // Initial setup of animations
    this.resetAnimations()
  }

  update () {
    super.update()

    if (game.getThing('titlescreen') || game.getThing('levelselect')) {
      game.assets.sounds.puzzle_music.pause()
    } else {
      game.assets.sounds.title_music.pause()
      if (game.assets.sounds.puzzle_music.paused) {
        soundmanager.playMusic('puzzle_music', 0.125)
      }
    }

    this.time ++

    // Blob logic
    const blobPlayers = this.state.things.filter(x => x.name === 'player' && x.isBlob)
    for (const player of blobPlayers) {
      delete player.switchedFrom
    }

    // Decide whether to show keyboard controls or gamepad controls based on which was used most recently
    if (Object.keys(game.buttonsPressed).length) {
      game.globals.usingGamepad = true
    }
    if (Object.keys(game.keysPressed).length) {
      game.globals.usingGamepad = false
    }

    // Camera controls
    let setControl = ''
    if (!this.movementDisabled) {
      if (game.keysPressed.ArrowUp || game.keysPressed.KeyW || game.buttonsPressed[12]) {
        setControl = 'up'
      }
      if (game.keysPressed.ArrowDown || game.keysPressed.KeyS || game.buttonsPressed[13]) {
        setControl = 'down'
      }
      if (game.keysPressed.ArrowRight || game.keysPressed.KeyD || game.buttonsPressed[15]) {
        setControl = 'right'
      }
      if (game.keysPressed.ArrowLeft || game.keysPressed.KeyA || game.buttonsPressed[14]) {
        setControl = 'left'
      }
      if (game.keysPressed.Space || game.keysPressed.Enter || game.buttonsPressed[0]) {
        setControl = 'action'
      }
      if (game.keysPressed.Escape || game.keysPressed.Backspace || game.buttonsPressed[8] || game.buttonsPressed[9]) {
        game.addThing(new PauseMenu())
      }
      if (game.keysPressed.ShiftLeft || game.buttonsPressed[1]) {
        setControl = 'switch'
      }

      // Undo function
      if (game.keysPressed.KeyU || game.keysPressed.KeyZ || game.buttonsPressed[4] || game.buttonsPressed[5]) {
        // Make sure there are actually things to undo
        if (this.stateStack.length > 0) {
          let newState = this.stateStack.pop()
          let oldState = JSON.stringify(this.state)

          // If the new state matches the old state, that means one duplicate state got pushed
          // So go to the next state
          if (newState === oldState && this.stateStack.length > 0) {
            newState = this.stateStack.pop()
          }
          this.state = JSON.parse(newState)

          // Reset all animations
          this.resetAnimations()

          soundmanager.playSound('undo', 0.3)

          // Clear advancement queue
          this.advancementData.queue = []
        }
      }
    }

    if (this.time % 15 === 0) {
      if (this.getActivePlayer()) {
        const x = u.random(game.config.width / -2, game.config.width / 2)
        const y = u.random(game.config.height / -2, game.config.height / 2)
        const position = [...this.getActivePlayer().position]
        position[0] += Math.round(x / 64)
        position[1] += Math.round(y / 64)
        if (this.getTileHeight(position) === 0) {
          game.addThing(new Wave(position))
        }
      }
    }

    // Store the last active player, so that when the currently active player dies
    // the game knows what death to focus on
    this.lastActivePlayer = this.getActivePlayer() || this.lastActivePlayer

    // =============
    // Game controls
    // =============

    // Determine if blocked
    let blocked = this.isAnimationBlocking()

    // If not blocked...
    if (!blocked) {
      // If advancement queue is empty, accept user input
      if (this.advancementData.queue.length === 0) {
        // If the user pressed a control key...
        if (setControl) {
          // Create action queue
          this.advancementData = {
            control: setControl,
            queue: [
              'move',
              'action',
              'switch',
            ]
          }

          // Push current state to undo stack (but only if it's different from the previous state)
          let curState = JSON.stringify(this.state)
          if (this.stateStack[this.stateStack.length-1] !== curState) {
            this.state.turns += 1
            curState = JSON.stringify(this.state)

            this.stateStack.push(curState)
          }
        }
      }

      // If there are elements in advancement queue, execute them
      while (!blocked && this.advancementData.queue.length > 0) {
        const adv = this.advancementData.queue.shift()
        if (adv === 'move') {
          this.advanceMove(this.advancementData.control)
        }
        else if (adv === 'action') {
          this.advanceAction(this.advancementData.control)
        }
        else if (adv === 'switch') {
          this.advanceSwitch(this.advancementData.control)
        }
        else if (adv === 'wind') {
          this.advanceWind()
        }
        else if (adv === 'fire') {
          this.advanceFire()
        }
        else if (adv === 'ice') {
          this.advanceIce()
        }
        else if (adv === 'vine') {
          this.advanceVine()
        }
        else if (adv === 'waterlog') {
          this.advanceWaterlog()
        }
        else if (adv === 'mine') {
          this.advanceMine()
        }
        else if (adv === 'blob') {
          this.advanceBlob()
        }
        else if (adv === 'magnet') {
          this.advanceMagnet()
        }

        blocked = this.isAnimationBlocking()
      }
    }
  }

  resetAnimations() {
    if (game.getThing('deathscreen')) {
      game.getThing('deathscreen').dead = true
    }

    for (const thing of game.getThings()) {
      if (thing instanceof Character) {
        thing.dead = true
      }
    }

    // Create visual representations for each thing
    this.state.things.forEach(thing => {
      if (thing.name === 'player') {
        game.addThing(new Character(thing))
      }
      if (thing.name === 'sign') {
        game.addThing(new Sign(thing))
      }
    })
  }

  isAnimationBlocking() {
    // for (const anim of this.animState) {
    //   if (anim.moveType != 'none') {
    //     return true
    //   }
    // }
    return false
  }

  getTileHeight(coords) {
    // Determine which chunk this coordinate should be in
    const chunkCoord = [Math.floor(coords[0]/64), Math.floor(coords[1]/64)]

    // Get that chunk's data
    const chunkData = this.state.grid[chunkCoord]

    // If this chunk isn't defined, the height defaults to 0
    if (!chunkData) {
      return 0
    }

    // Get the tile index
    const tileIndex = (coords[0] % 64) + (coords[1] % 64) * 64

    // Calculate height
    let height = chunkData[tileIndex]

    return height
  }

  setTileHeight(coords, newHeight) {
    // Determine which chunk this coordinate should be in
    const chunkCoord = [Math.floor(coords[0]/64), Math.floor(coords[1]/64)]

    // Get that chunk's data
    let chunkData = this.state.grid[chunkCoord]

    // If this chunk isn't defined, create it first
    if (!chunkData) {
      chunkData = new Array(64*64).fill(0)
      this.state.grid[chunkCoord] = chunkData

    }

    // Get the tile index
    const tileIndex = (coords[0] % 64) + (coords[1] % 64) * 64

    // Calculate height
    chunkData[tileIndex] = newHeight
  }

  getThingHeight(thing) {
    let height = this.getTileHeight(thing.position)
    if (height === 0 && !thing.waterlogged) {
      return 1
    }
    return height
  }

  getPositionOnScreen(pos) {
    let screenX = tileWidth * pos[0]
    let screenY = tileDepth * pos[1]
    return [screenX, screenY]
  }

  getThingsFromRow(y) {
    let ret = []
    for (const posKey in this.state.waterlogged) {
      const thing = this.state.waterlogged[posKey]
      if (thing.position[1] === y) {
        ret.push(thing)
      }
    }
    for (const thing of this.state.things) {
      if (thing.position[1] === y) {
        ret.push(thing)
      }
    }
    return ret
  }

  getThingsByName(name) {
    let ret = []
    for (const thing of this.state.things) {
      if (thing.name === name) {
        ret.push(thing)
      }
    }
    return ret
  }

  getActivePlayer() {
    let players = this.getThingsByName('player')
    for (const player of players) {
      if (player.active) {
        return player
      }
    }
    return undefined
  }

  getLookingAt(player, directionKey='direction') {
    let curPos = player.position
    for (let i = 0; i < 15; i ++) {
      curPos = vec2.add(curPos, vec2.directionToVector(player[directionKey]))
      if (this.getTileHeight(curPos) > 1) {
        return undefined
      }
      const blockingThing = this.state.things.filter(x => vec2.equals(curPos, x.position) && ['deco'].includes(x.name))[0]
      if (blockingThing) {
        return undefined
      }
      const hitPlayer = this.state.things.filter(x => vec2.equals(curPos, x.position) && (!x.dead) && ['player'].includes(x.name))[0]
      if (hitPlayer) {
        return hitPlayer
      }
    }
    return undefined
  }

  getSwitchPlayer() {
    let activePlayer = this.getActivePlayer()
    if (!activePlayer) {
      return undefined
    }

    // Get all other players
    let players = this.getThingsByName('player')

    // If there is only one (or zero) players, there is no player to switch to
    if (players.length <= 0) {
      return undefined
    }

    // If this is person guy, do LOS check
    if (activePlayer.type === 'person') {
      return this.getLookingAt(activePlayer)
    }
    // Otherwise, go back to person guy
    else {
      return players.filter((x) => x.type === 'person')[0]
    }
  }

  tileIsInWindTunnel(position, direction) {
    let delta = vec2.directionToVector(vec2.oppositeDirection(direction))
    let curPos = position
    for (let i = 0; i < 12; i ++) {
      curPos = vec2.add(curPos, delta)

      // Found a wind guy
      let foundWind = this.state.things.filter(x =>
        vec2.equals(curPos, x.position) &&
        x.name === 'player' &&
        x.type === 'wind' &&
        x.direction === direction &&
        !(x.active)
      )[0]
      if (foundWind) {
        return true
      }

      // Wind is blocked by walls
      const tileHeight = this.getTileHeight(curPos)
      if (tileHeight > 1) {
        break
      }

      // Wind is blocked by deco objects
      const blockingThing = this.state.things.filter(x => vec2.equals(curPos, x.position) && ['deco', 'player'].includes(x.name))[0]
      if (blockingThing) {
        break
      }
    }
    return false
  }

  requeueAdvancements() {
    // Define what counts as a "movement advancement"
    const advancements = ['ice', 'magnet', 'wind', 'blob', 'waterlog', 'mine', 'fire', 'vine']

    // Remove all pre-existing movement items from the queue
    for (let i = this.advancementData.queue.length-1; i >= 0; i --) {
      if (advancements.includes(this.advancementData.queue[i])) {
        this.advancementData.queue.splice(i, 1)
      }
    }

    // Reinstate movement items in queue
    this.advancementData.queue.push(...advancements)
  }

  canBeMovedByAny(thing) {
    if (thing.name === 'deco' && thing.type === 'box') {
      return true
    }
    return false
  }

  canBeMovedByGolem(thing) {
    if (thing.name === 'player') {
      return true
    }
    if (thing.name === 'deco') {
      if (thing.type === 'rock' || thing.type === 'metal') {
        return true
      }
    }
    return false
  }

  advanceMove(control) {
    // Check control
    if (!['left', 'right', 'up', 'down'].includes(control)) {
      return
    }

    // Get player
    let player = this.getActivePlayer()
    if (!player) {
      return
    }

    const newPosition = vec2.add(player.position, vec2.directionToVector(control))

    // Rotate person guy
    if (player.type === 'person') {
      player.direction = control
    }

    // Player can't swim
    if (this.getTileHeight(newPosition) <= 0 && !(newPosition in this.state.waterlogged)) {
      // ...but waterguy can
      if (!(player.type === 'water')) {
        return
      }
    }

    // Player can't scale cliffs
    if (this.getTileHeight(newPosition) > this.getThingHeight(player)) {
      return
    }

    // Player can't move towards a headwind
    if (this.tileIsInWindTunnel(player.position, vec2.oppositeDirection(control))) {
      // Play wind sound
      soundmanager.playSound('wind', 0.2)

      return
    }

    // Check if there is an thing blocking us
    const blockingThing = this.state.things.filter(x => vec2.equals(newPosition, x.position) && ['deco', 'player'].includes(x.name))[0]
    if (blockingThing) {
      if (this.canBeMovedByAny(blockingThing) || (player.type === 'golem' && this.canBeMovedByGolem(blockingThing))) {
        // Check if the space behind this is free
        const newPosition2 = vec2.add(newPosition, vec2.directionToVector(control))

        // Check terrain height
        if (this.getTileHeight(newPosition2) > this.getThingHeight(player)) {
          return
        }

        // Check for another thing
        const blockingThing2 = this.state.things.filter(x => vec2.equals(newPosition2, x.position) && ['deco', 'player'].includes(x.name))[0]
        if (blockingThing2) {
          return
        }

        // Move the other thing
        blockingThing.position = newPosition2
        this.playerMoved(blockingThing)
        soundmanager.playSound('move_stone', 0.2, [0.95, 1.05])
      }
      else {
        return
      }
    }

    // Move into this new position
    player.position = newPosition

    // Queue advancements
    this.requeueAdvancements()
  }

  advanceAction(control) {
    if (control !== 'action') {
      return
    }

    let player = this.getActivePlayer()
    if (!player) {
      return undefined
    }

    if (player.type === 'fire') {
      this.executeFire(player)
      soundmanager.playSound('fire', 0.2)
    }
    if (player.type === 'wind') {
      this.executeWind(player)
      soundmanager.playSound('wind', 0.2)

      // Play the wind animation on the wind guy's character
      for (const thing of game.getThings()) {
        if (thing.tileThingReference === player) {
          thing.createWind()
        }
      }
    }
    if (player.type === 'person') {
      this.advanceSwitch('switch')
    }
  }

  advanceSwitch(control) {
    if (control !== 'switch') {
      return
    }

    let player = this.getActivePlayer()
    if (!player) {
      return undefined
    }

    let otherPlayer = this.getSwitchPlayer()

    if (otherPlayer) {
      player.active = false
      otherPlayer.active = true

      player.lastActive = this.state.turns - 1

      // Clear out all current fire animation things
      /*
      for (const thing of game.getThings()) {
        if (thing instanceof Fire) {
          thing.dead = true
        }
        if (thing instanceof Character) {
          thing.cancelTimer('fire')
        }
      }
      */

      // Vine guy ability
      if (player.type === 'vine' || player.isBlob) {
        this.executeExtendVines(player)
      }
      if (otherPlayer.type === 'vine' || otherPlayer.isBlob) {
        this.executeRetractVines(otherPlayer)
      }

      // Wind guy should immediately show a visual of his wind once you lose control of him
      if (player.type === 'wind') {
        for (const thing of game.getThings()) {
          if (thing.tileThingReference === player) {
            thing.createWind()
          }
        }
      }

      this.requeueAdvancements()
    }
  }

  advanceFire() {
    // Iterate over fire guys
    const firePlayers = this.getThingsByName('player').filter((t) => t.type === 'fire')
    for (const player of firePlayers) {
      if (!player.active) {
        this.executeFire(player)
      }
    }
  }

  executeFire(player) {
    if (player.dead) {
      return
    }

    const deltas = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]

    let destroyedSomething = false

    // Check all adjacent tiles
    for (const delta of deltas) {
      const pos = vec2.add(player.position, delta)

      if (player.active) {
        game.addThing(new Fire(pos))
      }

      // Loop over things and see if we have struck something
      for (let j = 0; j < this.state.things.length; j ++) {
        let thing = this.state.things[j]
        if (vec2.equals(thing.position, pos)) {
          // Player
          if (thing.name === 'player' && !(['golem'].includes(thing.type))) {
            this.executePlayerDeath(thing)
            this.state.things.splice(j, 1)
            j --
            destroyedSomething = true
          }
          // Wood
          if (thing.name === 'deco' && ['wood'].includes(thing.type)) {
            this.state.things.splice(j, 1)
            j --
            destroyedSomething = true
          }
        }
      }
    }

    // If something was destroyed, play the sound effect and requeue advancements
    if (destroyedSomething) {
      soundmanager.playSound('fire', 0.2)
      this.requeueAdvancements()
    }
  }



  advanceIce() {
    // Iterate over ice guys
    const icePlayers = this.getThingsByName('player').filter((t) => t.type === 'ice' || t.isBlob)
    for (const player of icePlayers) {
      this.executeIce(player)
    }
  }

  advanceWaterlog() {
    let waterloggedSomething = false

    // Iterate over entities and see if they should be waterlogged
    for (let i = this.state.things.length-1; i >= 0; i --) {
      let thing = this.state.things[i]

      // Do not waterlog vines
      if (thing.name === 'deco' && thing.type === 'vine') {
        continue
      }

      // Do not waterlog water guy
      if (thing.name === 'player' && thing.type === 'water') {
        continue
      }

      // If this position is water...
      if (this.getTileHeight(thing.position) === 0) {
        // If there is not already a waterlogged thing at this position...
        if (!(thing.position in this.state.waterlogged)) {
          // Add this thing to the waterlogged list
          // But kill players
          if (thing.name !== 'player') {
            thing.waterlogged = true
            this.state.waterlogged[thing.position] = thing
          }

          // And remove it from the main thing list
          this.executePlayerDeath(thing)
          this.state.things.splice(i, 1)

          waterloggedSomething = true
        }
      }
    }

    // If something was put into the water, play the sound effect and requeue advancements
    if (waterloggedSomething) {
      soundmanager.playSound('sploosh', 0.4)
      this.requeueAdvancements()
    }
  }

  triggersMine(thing) {
    if (thing.name === 'player') {
      return true
    }
    if (thing.name === 'deco' && thing.type !== 'vine') {
      return true
    }
    return false
  }

  advanceMine() {
    let mineIds = []
    let thingIds = []

    // Iterate over mines
    for (let j = this.state.things.length-1; j >= 0; j --) {
      let mine = this.state.things[j]

      // Skip this thing if it's not a mine
      if (mine.name !== 'mine') {
        continue
      }

      // Iterate over entities and see if they should be waterlogged
      for (let i = this.state.things.length-1; i >= 0; i --) {
        let thing = this.state.things[i]

        // Skip this thing if it doesn't trigger mines
        if (!this.triggersMine(thing)) {
          continue
        }

        // Skip this thing if it's not in the same position
        if (!vec2.equals(mine.position, thing.position)) {
          continue
        }

        // Add this to list of indices to remove
        mineIds.push(mine.id)
        thingIds.push(thing.id)
      }
    }

    // Remove entities
    for (let i = this.state.things.length-1; i >= 0; i --) {
      let thing = this.state.things[i]
      if (thingIds.includes(thing.id)) {
        thing.dead = true
        this.executePlayerDeath(thing)
        this.state.things.splice(i, 1)
      }
      if (mineIds.includes(thing.id)) {
        this.executePlayerDeath(thing)
        this.state.things.splice(i, 1)
      }
    }

    // If something was put into the water, play the sound effect and requeue advancements
    if (mineIds.length > 0) {
      soundmanager.playSound('sploosh', 0.4)
      this.requeueAdvancements()
    }
  }

  advanceBlob() {
    // Iterate over blob guys
    // Sort them so that the active blob guy is first; resolves certain index conditions
    let blobPlayers = this.getThingsByName('player').filter((t) => t.isBlob).sort((a, b) => Number(a.active) - Number(b.active))
    for (const player of blobPlayers) {
      this.executeBlob(player)
    }
  }

  executeBlob(player) {
    let lookingAt = this.getLookingAt(player, 'blobDirection')
    let previousState = {...player}
    if (lookingAt && lookingAt.type !== 'person') {
      player.type = lookingAt.type
      player.direction = lookingAt.direction
    }
    else {
      player.type = 'blob'
    }

    // If our type changed, we need to requeue advancements
    if (previousState.type !== player.type) {
      this.requeueAdvancements()
      player.switchedFrom = previousState
    }
  }

  advanceMagnet() {
    // Iterate over metal deco objects
    const metalThings = this.getThingsByName('deco').filter((t) => t.type === 'metal')

    // Iteratively get magnetic things to follow
    // We have to do this in a while loop so we don't get index conditions
    let everMoved = false
    while (true) {
      let anyMoved = false
      for (const thing of metalThings) {
        anyMoved = anyMoved || this.executeMagnetFollow(thing)
      }
      everMoved = everMoved || anyMoved

      if (!anyMoved) {
        break
      }
    }
    // Attach magnetic things
    while (true) {
      let anyAttached = false
      for (const thing of metalThings) {
        anyAttached = anyAttached || this.executeMagnetAttach(thing)
      }
      if (!anyAttached) {
        break
      }
    }
    if (everMoved) {
      this.requeueAdvancements()
    }
  }

  isMagnetic(thing) {
    if (thing.name === 'player' && thing.type === 'magnet') {
      return true
    }
    if (thing.name === 'deco' && thing.type === 'metal' && thing.attached) {
      return true
    }
    return false
  }

  executeMagnetAttach(thing) {
    // If this metal is not attached to anything, look for things to attach to
    if (!thing.attached) {
      for (const delta of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        // TODO: Sort things by position to remove index conditions
        const adjacent = this.state.things.filter(x => vec2.equals(x.position, vec2.add(thing.position, delta)))[0]
        if (adjacent && this.isMagnetic(adjacent)) {
          // Make sure something else isn't already attached. Only one thing can be attached at each link in the chain
          const alreadyAttached = this.state.things.filter(x => x.attached === adjacent.id)[0]
          if (!alreadyAttached) {
            thing.attached = adjacent.id
            thing.attachPosition = [...adjacent.position]
            // console.log(`Attaching ${thing.name}-${thing.type}-${thing.id} to ${adjacent.name}-${adjacent.type}-${adjacent.id}`)
            // TODO: Sound effect and animation
            return true
          }
        }
      }
    }
    return false
  }

  executeMagnetFollow(thing) {
    // Follow thing it's attached to
    if (thing.attached) {
      const attached = this.state.things.filter(x => x.id === thing.attached)[0]
      // Follow attached thing
      if (attached) {
        // Determine if we should break the connection

        // Make sure the attached thing is still adjacent to the attachment point
        let isAttachedStillNearby = false
        for (const delta of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]]) {
          if (vec2.equals(attached.position, vec2.add(thing.attachPosition, delta))) {
            isAttachedStillNearby = true
            break
          }
        }

        // Make sure we're still adjacent to the attachment point
        let isStillNearbyAttachmentPoint = false
        for (const delta of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
          if (vec2.equals(thing.position, vec2.add(thing.attachPosition, delta))) {
            isStillNearbyAttachmentPoint = true
            break
          }
        }

        if (isAttachedStillNearby && isStillNearbyAttachmentPoint && this.isMagnetic(attached)) {
          // If adjacent thing has moved...
          if (!vec2.equals(thing.attachPosition, attached.position)) {
            // Move into this position if the attachment is still valid
            if (!this.isBlockingAt(thing.attachPosition)) {
              thing.position = thing.attachPosition
              thing.attachPosition = [...attached.position]
              return true
            }
            // Can't move into this position; break attachment
            else {
              this.breakAttachment(thing)
              // TODO: Sound effect and animation
              return false
            }
          }
        }
        else {
          this.breakAttachment(thing)
          // TODO: Sound effect and animation
          return false
        }
      }
      // If attached thing doesn't exist anymore, remove attachment
      else {
        this.breakAttachment(thing)
        // TODO: Sound effect and animation
        return false
      }
    }
    return false
  }

  breakAttachment(thing) {
    const attachedToThis = this.state.things.filter(x => x.attached === thing.id)
    for (const t of attachedToThis) {
      this.breakAttachment(t)
    }
    delete thing.attached
    delete thing.attachPosition
    // console.log(`Broke attachment of ${thing.name}-${thing.type}-${thing.id}`)
  }

  isBlockingAt (curPos, players=true) {
    // Blocked by walls
    const tileHeight = this.getTileHeight(curPos)
    if (tileHeight > 1) {
      return true
    }

    // Blocked by deco objects
    const blockingThing = this.state.things.filter(x => vec2.equals(curPos, x.position) && ['deco'].includes(x.name))[0]
    if (blockingThing) {
      return true
    }

    const foundThing = this.state.things.filter(x => vec2.equals(curPos, x.position) && ['player'].includes(x.name))[0]
    if (foundThing && players) {
      return true
    }

    return false
  }

  advanceWind() {
    // Iterate over wind guys
    const windPlayers = this.getThingsByName('player').filter((t) => t.type === 'wind')
    for (const player of windPlayers) {
      if (!player.active) {
        this.executeWind(player)
      }
    }
  }

  isPushableByWind(thing) {
    if (thing.name === 'player') {
      return true
    }
    if (thing.name === 'deco' && thing.type === 'box') {
      return true
    }
    return false
  }

  executeWind(player) {
    if (player.dead) {
      return
    }

    let curPos = player.position
    let delta = vec2.directionToVector(player.direction)
    const blowDistance = 12
    let foundThing = undefined
    let i = 0

    let didPush = false

    while (i < blowDistance) {
      // Advance
      curPos = vec2.add(curPos, delta)
      i ++

      // Wind is blocked by walls
      const tileHeight = this.getTileHeight(curPos)
      if (tileHeight > 1) {
        return
      }

      // Wind is blocked by deco objects
      const blockingThing = this.state.things.filter(x => vec2.equals(curPos, x.position) && !this.isPushableByWind(x))[0]
      if (blockingThing) {
        return
      }

      // Found a player to push
      foundThing = this.state.things.filter(x => vec2.equals(curPos, x.position) && this.isPushableByWind(x))[0]
      if (foundThing) {
        break
      }
    }

    // If we found a player to push, push them
    if (foundThing) {
      while (i <= blowDistance) {
        // Advance
        curPos = vec2.add(curPos, delta)
        i ++

        // Push is blocked by walls
        const tileHeight = this.getTileHeight(curPos)
        if (tileHeight > 1) {
          break
        }

        // Push is blocked by players and deco objects
        const blockingThing = this.state.things.filter(x => vec2.equals(curPos, x.position) && ['deco', 'player'].includes(x.name))[0]
        if (blockingThing) {
          break
        }

        // Wasn't blocked. Push player.
        foundThing.position = curPos
        didPush = true
      }
    }

    // If something was pushed at least one tile, play sound effect and requeue advancements
    if (didPush) {
      soundmanager.playSound('wind', 0.2)
      this.requeueAdvancements()
      this.playerMoved(foundThing)
    }
  }

  executeIce(player) {
    const iceRadius = 1

    let didRemoveIce = false

    // Delete all ice owned by this player that is now too far away
    for (const key in this.state.waterlogged) {
      let thing = this.state.waterlogged[key]
      let distance = Math.max(Math.abs(thing.position[0] - player.position[0]), Math.abs(thing.position[1] - player.position[1]))
      if (thing.type === 'ice' && thing.owner === player.id) {
        if (distance > iceRadius || player.type !== 'ice') {
          delete this.state.waterlogged[key]
          didRemoveIce = true
        }
      }
    }

    // Build ice around this player
    if (player.type === 'ice') {
      const [px, py] = player.position
      for (let x = px-iceRadius; x <= px+iceRadius; x ++) {
        for (let y = py-iceRadius; y <= py+iceRadius; y ++) {
          const icePos = [x, y]

          // If this is a valid spot for ice...
          if (this.getTileHeight(icePos) === 0 && !(icePos in this.state.waterlogged)) {
            // Build the ice
            this.state.waterlogged[icePos] = {
              name: 'deco',
              type: 'ice',
              waterlogged: true,
              owner: player.id,
              id: this.nextId ++,
              position: icePos,
            }
          }
        }
      }
    }


    if (didRemoveIce) {
      this.requeueAdvancements()
    }
  }

  advanceVine() {
    // Iterate over vine guys
    const vinePlayers = this.getThingsByName('player').filter((t) => t.type === 'vine' || t.isBlob)
    for (const player of vinePlayers) {
      if (!player.active) {
        this.executeExtendVines(player)
      }
    }
  }

  executeExtendVines(player, noSound=false) {
    // Do not extend vines if this is the active player
    if (player.active) {
      return
    }

    // Do not extend vines if dead
    if (player.dead) {
      return
    }

    // Retract any vines which are no longer aligned with this guy
    const onlyMisaligned = (player.type === 'vine')
    this.executeRetractVines(player, onlyMisaligned)

    // Early exit if this is not a vine guy since only vine guys create vines
    if (player.type !== 'vine') {
      return
    }

    // Track updates
    let createdVine = false

    // Do both directions
    const vineLength = 20
    for (const direction of [player.direction, vec2.oppositeDirection(player.direction)]) {
      // Get delta
      const delta = vec2.directionToVector(direction)

      // Iterate forwards until we hit something
      let curPos = player.position
      for (let i = 0; i < vineLength; i ++) {
        curPos = vec2.add(curPos, delta)

        // Blocked by wall
        if (this.getTileHeight(curPos) > 1) {
          break
        }

        // Blocked by deco
        const blockingDeco = this.state.things.filter(x => vec2.equals(curPos, x.position) && ['deco'].includes(x.name))[0]
        if (blockingDeco) {
          if (blockingDeco.owner === player.id) {
            // Skip past own vines
            continue
          }
          else {
            break
          }
        }

        // Kill players that get in the way
        for (let i = this.state.things.length-1; i >= 0; i --) {
          const thing = this.state.things[i]
          if (vec2.equals(thing.position, curPos) && thing.name === 'player') {
            this.executePlayerDeath(thing)
            this.state.things.splice(i, 1)
          }
        }

        // Create vine object
        this.state.things.push({
          name: 'deco',
          type: 'vine',
          owner: player.id,
          id: this.nextId ++,
          position: curPos,
          direction
        })
        createdVine = true
      }
    }

    if (createdVine && !noSound) {
      soundmanager.playSound('vine', 0.2, [1.8, 1.8])
    }
  }

  executeRetractVines(player, onlyMisaligned=false) {
    // Iterate over and delete all vine objects which are owned by this
    let destroyedVine = false
    for (let i = this.state.things.length-1; i >= 0; i --) {
      const thing = this.state.things[i]
      if (thing.name === 'deco' && thing.type === 'vine' && thing.owner === player.id) {
        const axis = ['right', 'left', 'east', 'west'].includes(player.direction) ? 1 : 0
        const misaligned = player.position[axis] !== thing.position[axis]
        if (!onlyMisaligned || misaligned) {
          this.state.things.splice(i, 1)
          destroyedVine = true
        }
      }
    }
    if (destroyedVine) {
      soundmanager.playSound('vine', 0.2, [1.1, 1.1])
      this.requeueAdvancements()
    }
  }

  playerMoved(player) {
    // Exit if this is not a player
    if (player.name !== 'player') {
      return
    }

    // Wind guy should reset his wind visual
    if (player.type === 'wind') {
      for (const thing of game.getThings()) {
        if (thing.tileThingReference === player) {
          thing.createWind()
        }
      }
    }
  }

  executePlayerDeath(player) {
    // Exit if this is not a player
    if (player.name !== 'player') {
      return
    }

    player.dead = true

    // Requeue advancements
    this.requeueAdvancements()

    // Vine guys must update their vines
    if (player.type === 'vine' || player.isBlob) {
      this.executeRetractVines(player)
    }

    // Ice guy must kill all his ice
    if (player.type === 'ice') {
      for (const key in this.state.waterlogged) {
        let thing = this.state.waterlogged[key]
        if (thing.type === 'ice' && thing.owner === player.id) {
          delete this.state.waterlogged[key]
        }
      }
    }

    // If person guy is killed, bring up death screen
    if (player.type === 'person') {
      game.addThing(new DeathScreen())
    }

    // Reset active player
    if (player.active && player.type !== 'person') {
      player.active = false
      player.wasActiveBeforeDeath = true
      const person = this.state.things.filter((x) => x.type === 'person')[0]
      if (person) {
        this.after(80, () => person.active = true, 'deathWait')
        return true
      }
    }
  }

  tileBlocked(position, {ignoreNames=[], ignoreTypes=[]}={}) {
    if (this.getTileHeight(position) >= 2) {
      return true
    }

    for (const thing of this.state.things) {
      if (vec2.equals(thing.position, position)) {
        if (ignoreNames.includes(thing.name)) {
          continue
        }
        if (ignoreTypes.includes(thing.type)) {
          continue
        }

        return thing
      }

    }

    return false
  }

  preDraw () {
    // Draw blue for ocean
    const { ctx } = game
    ctx.fillStyle = '#3569CC'
    ctx.fillRect(0, 0, game.config.width, game.config.height)
  }

  postDraw () {
    if (game.getThing('winscreen')) { return }
    if (game.getThing('titlescreen')) { return }
    if (game.getThing('levelselect')) { return }
    if (game.getThing('pausemenu')) { return }
    if (game.getThing('optionsmenu')) { return }
    const { ctx } = game

    {
      ctx.save()
      ctx.translate(32, game.config.height - 32)
      ctx.font = 'italic bold 20px Arial'
      ctx.fillStyle = '#21235B'
      const levelName = `Level ${game.globals.level}: ${levelList[game.globals.level - 1].name}`
      ctx.fillText(levelName, 0, 0)
      ctx.translate(4, -4)
      ctx.fillStyle = 'white'
      ctx.fillText(levelName, 0, 0)
      ctx.restore()
    }

    {
      ctx.save()
      ctx.translate(game.config.width - 32, game.config.height - 32)
      ctx.font = 'italic bold 32px Arial'
      ctx.fillStyle = '#21235B'
      ctx.textAlign = 'right'
      let levelName = 'You are dead'
      let activePlayer = this.getActivePlayer()
      if (activePlayer) {
        const name = activePlayer.type
        const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1)
        levelName = `You are ${capitalizedName} Guy`

        // Question mark on blob guy clones
        if (activePlayer.isBlob && activePlayer.type !== 'blob') {
          levelName += '?'
        }
      }
      ctx.fillText(levelName, 0, 0)
      ctx.translate(4, -4)
      ctx.fillStyle = 'white'
      ctx.fillText(levelName, 0, 0)
      ctx.restore()
    }

    {
      ctx.save()
      ctx.translate(game.config.width - 32, game.config.height - 32 - 48)
      ctx.font = 'italic bold 20px Arial'
      ctx.fillStyle = '#21235B'
      ctx.textAlign = 'right'
      let color = 'white'
      let text = ''
      if (this.getActivePlayer()?.type === 'fire') {
        text = 'Press space to shoot fire!'
        color = '#FF711C'
      }
      if (this.getActivePlayer()?.type === 'wind') {
        text = 'Press space to blow wind!'
        color = '#C1F3FF'
      }
      ctx.fillText(text, 0, 0)
      ctx.translate(2, -2)
      ctx.fillStyle = color
      ctx.fillText(text, 0, 0)
      ctx.restore()
    }
  }

  draw () {
    const { ctx } = game

    // Set up camera
    const tilesX = (game.config.width / tileWidth)
    const tilesY = (game.config.height / tileDepth)
    const minX = Math.round(game.getCamera2D().position[0] / tileWidth - Math.floor(tilesX/2) - 1)
    const maxX = Math.round(game.getCamera2D().position[0] / tileWidth + Math.floor(tilesX/2) + 1)
    const minY = Math.round(game.getCamera2D().position[1] / tileWidth - Math.floor(tilesY/2) - 1)
    const maxY = Math.round(game.getCamera2D().position[1] / tileWidth + Math.floor(tilesY/2) + 4)

    // Render terrain
    for (let y = minY; y <= maxY; y ++) {
      // Terrain
      for (let x = minX; x <= maxX; x ++) {
        // Determine terrain height at this coordinate
        const tileHeight = this.getTileHeight([x, y])

        // Determine where this tile will be rendered on screen
        let screenX, screenY
        ;[screenX, screenY] = this.getPositionOnScreen([x, y])

        // Otherwise, render it as terrain
        if (tileHeight === 1) {
          // Create rock wall pattern
          for (let i = 0; i < tileHeight; i ++) {
            if (i >= this.getTileHeight([x, y+1])) {
              //ctx.drawImage(assets.images.wallRock, screenX, screenY, tileWidth, tileDepth)
              ctx.fillStyle = '#21235B'
              ctx.fillRect(screenX, screenY, tileWidth, tileDepth)
            }
            screenY -= wallDepth
          }

          // Grass tile
          if (tileHeight <= 1) {
            ctx.fillStyle = (x%2 !== y%2) ? '#F7FFDB' : '#D4FFAA'
            ctx.fillRect(screenX, screenY, tileWidth, tileDepth)
          }
        }
      }

      // Things
      const thisRowThings = this.getThingsFromRow(y)
      for (const thing of thisRowThings) {
        // Determine where to render it.
        const getThingHeight = this.getThingHeight(thing)
        let screenX, screenY
        ;[screenX, screenY] = this.getPositionOnScreen(thing.position)
        screenY -= (wallDepth * getThingHeight)
        if (thing.waterlogged) {
          screenY -= 2
        }

        // Deco Objects
        if (thing.name === 'deco') {
            let image = thing.type ? ('deco_' + thing.type) : 'undefined'
            if (thing.type === 'vine' && vec2.directionToVector(thing.direction)[1] !== 0) {
              image = 'deco_vine_v'
            }
            if (thing.waterlogged) {
              image += '_waterlogged'
            }
            if (image && assets.images[image]) {
              ctx.drawImage(assets.images[image], screenX, screenY - 2, tileWidth, tileDepth)
            }
        }

        // Vine guy vine
        if (thing.name === 'player' && thing.type === 'vine' && !(thing.active)) {
          const image = vec2.directionToVector(thing.direction)[1] !== 0 ? 'deco_vine_v' : 'deco_vine'
          ctx.drawImage(assets.images[image], screenX, screenY - 2, tileWidth, tileDepth)
        }

        // Mine
        if (thing.name === 'mine') {
          const mineTime = 40
          const frame = (this.time % mineTime) > mineTime / 2 ? 0 : tileWidth
          ctx.drawImage(assets.images.deco_mine, frame, 0, tileWidth, tileDepth, screenX, screenY, tileWidth, tileDepth)
        }

        // Goal
        if (thing.name === 'goal') {
          ctx.drawImage(assets.images.goal, screenX, screenY - 2, tileWidth, tileDepth)
        }
      }
    }
  }
}

class Walls extends Thing {
  depth = 1000

  draw () {
    const { ctx } = game
    const board = game.getThing('board')
    if (!board) return

    // Set up camera
    const tilesX = (game.config.width / tileWidth)
    const tilesY = (game.config.height / tileDepth)
    const minX = Math.round(game.getCamera2D().position[0] / tileWidth - Math.floor(tilesX/2) - 1)
    const maxX = Math.round(game.getCamera2D().position[0] / tileWidth + Math.floor(tilesX/2) + 1)
    const minY = Math.round(game.getCamera2D().position[1] / tileWidth - Math.floor(tilesY/2) - 1)
    const maxY = Math.round(game.getCamera2D().position[1] / tileWidth + Math.floor(tilesY/2) + 4)

    // Render terrain
    for (let y = minY; y <= maxY; y ++) {
      // Terrain
      for (let x = minX; x <= maxX; x ++) {
        // Determine terrain height at this coordinate
        const tileHeight = board.getTileHeight([x, y])

        // Determine where this tile will be rendered on screen
        let screenX, screenY
        ;[screenX, screenY] = board.getPositionOnScreen([x, y])

        // Create rock wall pattern
        if (tileHeight > 1) {
          for (let i = 0; i < tileHeight; i ++) {
            if (i >= board.getTileHeight([x, y+1])) {
              ctx.fillStyle = '#21235B'
              ctx.fillRect(screenX, screenY, tileWidth, tileDepth)
            }
            screenY -= wallDepth
          }

          if (tileHeight > 1) {
            ctx.fillStyle = '#323789'
            ctx.fillRect(screenX, screenY, tileWidth, tileDepth)
          }
        }
      }
    }
  }
}
