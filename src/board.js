import * as game from './core/game.js'
import * as u from './core/utils.js'
import * as soundmanager from './core/soundmanager.js'
import * as gfx from './core/webgl.js'
import * as mat from './core/matrices.js'
import * as vec2 from './core/vector2.js'
import * as vec3 from './core/vector3.js'
import Thing from './core/thing.js'
import { assets } from './core/game.js'
import { getLevel } from './levelloader.js'
import Character from './character.js'
import Fire from './fire.js'
import Wave from './wave.js'
import DeathScreen from './deathscreen.js'

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
        this.executeUpdatePlayer(thing)
        if (thing.type === 'person' && !didActive) {
          didActive = true
          thing.active = true
        }
      }
    }

    // Set nextId
    this.nextId = this.state.things.at(-1).id + 1

    // Initial setup of animations
    this.resetAnimations()
  }

  update () {
    super.update()

    this.time ++

    // Decide whether to show keyboard controls or gamepad controls based on which was used most recently
    if (Object.keys(game.buttonsPressed).length) {
      game.globals.usingGamepad = true
    }
    if (Object.keys(game.keysPressed).length) {
      game.globals.usingGamepad = false
    }

    // Level controls
    if (this.time > 5) {
      if (game.keysPressed.Backspace || game.keysPressed.KeyR || game.buttonsPressed[4]) {
        game.resetScene()
      }
      if (game.keysPressed.BracketLeft || game.keysPressed.Minus || game.keysPressed.NumpadSubtract || game.buttonsPressed[6]) {
        if (game.globals.level > 1) {
          game.globals.level --
          game.resetScene()
        }
      }
      if (game.keysPressed.BracketRight || game.keysPressed.Equal || game.keysPressed.NumpadAdd || game.buttonsPressed[7]) {
        if (game.globals.level < game.globals.levelCount) {
          game.globals.level ++
          game.resetScene()
        }
      }
    }

    // Camera controls
    let setControl = ''
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
    if (game.keysPressed.Space || game.buttonsPressed[0]) {
      setControl = 'action'
    }
    if (game.keysPressed.ShiftLeft || game.buttonsPressed[1] || (this.getActivePlayer()?.type === 'person' && (game.keysPressed.Space || game.buttonsPressed[0]))) {
      setControl = 'switch'
    }

    // Undo function
    if (game.keysPressed.KeyU || game.keysPressed.KeyZ || game.buttonsPressed[5]) {
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

        // Clear advancement queue
        this.advancementData.queue = []
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
              'wind',
              'waterlog',
              'action',
              'switch',
              'waterlog',
              'wind',
              'waterlog',
              'fire',
              'wind',
              'fire',
              'wind',
              'fire',
              'wind',
              'fire',
              'wind',
              'fire',
              'wind',
              'fire',
              'wind',
              'ice',
              'vine',
              'waterlog',
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
        else if (adv === 'waterlog') {
          this.advanceWaterlog()
        }
        else if (adv === 'vine') {
          this.advanceVine()
        }

        blocked = this.isAnimationBlocking()
      }
    }

    //game.config.width = Math.round(window.innerWidth / 2) - 8
    //game.config.height = Math.round(window.innerHeight / 2) - 8

    // TODO: Check for win
    // if (this.state.cratesDelivered >= this.state.cratesRequired && this.state.level > 0) {
    //   game.globals.levelCompletions[this.state.level-1] = true
    // }

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

  positionOnScreen(pos) {
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

  getNearestPlayer() {
    // Get active player
    let activePlayer = this.getActivePlayer()
    if (!activePlayer) {
      return undefined
    }

    // Get all other players
    let players = this.getThingsByName('player')

    // Find nearest player
    let closest_dist = Infinity
    let closest = undefined
    for (const player of players) {
      if (player.id !== activePlayer.id) {
        const dist = vec2.distance(activePlayer.position, player.position)
        if (dist < closest_dist || (dist === closest_dist && player.lastActive > closest?.lastActive)) {
          closest_dist = dist
          closest = player
        }
      }
    }
    return closest
  }

  getNextPlayer() {
    // Get active player
    let activePlayer = this.getActivePlayer()
    if (!activePlayer) {
      return undefined
    }

    // Get all other players
    let players = this.getThingsByName('player')

    // If there is only one (or zero) players, there is no next player
    if (players.length <= 0) {
      return undefined
    }

    // Iterate over players
    for (let i = 0; i < players.length; i ++) {
      if (players[i].id === activePlayer.id) {
        return players[i+1] || players[0]
      }
    }
    return players[0]
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
      let curPos = activePlayer.position
      for (let i = 0; i < 15; i ++) {
        curPos = vec2.add(curPos, vec2.directionToVector(activePlayer.direction))
        if (this.getTileHeight(curPos) > 1) {
          return undefined
        }
        const blockingThing = this.state.things.filter(x => vec2.equals(curPos, x.position) && ['deco'].includes(x.name))[0]
        if (blockingThing) {
          return undefined
        }
        const hitPlayer = this.state.things.filter(x => vec2.equals(curPos, x.position) && ['player'].includes(x.name))[0]
        if (hitPlayer) {
          return hitPlayer
        }
      }
    }
    // Otherwise, go back to person guy
    else {
      return players.filter((x) => x.type === 'person')[0]
    }
  }

  tileIsInWindTunnel(position) {
    for (const direction of ['up', 'down', 'right', 'left']) {
      let delta = vec2.directionToVector(direction)
      let curPos = position
      for (let i = 0; i < 12; i ++) {
        curPos = vec2.add(curPos, delta)

        // Found a wind guy
        let foundWind = this.state.things.filter(x =>
          vec2.equals(curPos, x.position) &&
          x.name === 'player' &&
          x.type === 'wind' &&
          x.direction === vec2.oppositeDirection(direction) &&
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

    // Don't move during the level win animation
    if (player.movementDisabled) {
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
        // ...but the play can enter a wind tunnel over water
        if (!this.tileIsInWindTunnel(newPosition)) {
          return
        }
      }
    }

    // Player can't scale cliffs
    if (this.getTileHeight(newPosition) > this.getThingHeight(player)) {
      return
    }

    // Check if there is an thing blocking us
    const blockingThing = this.state.things.filter(x => vec2.equals(newPosition, x.position) && ['deco', 'player'].includes(x.name))[0]
    if (blockingThing) {
      const canBeMovedByGolem = blockingThing.name === 'player' || (blockingThing.name === 'deco' && blockingThing.type === 'rock')
      const canBeMovedByAny = blockingThing.name === 'deco' && blockingThing.type === 'box'
      if (canBeMovedByAny || (player.type === 'golem' && canBeMovedByGolem)) {
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
        this.executeUpdatePlayer(blockingThing)
        soundmanager.playSound('move_stone', 0.2, [0.95, 1.05])
      }
      else {
        return
      }
    }

    // Move into this new position
    player.position = newPosition
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
    }
    if (player.type === 'wind') {
      this.executeWind(player)
      soundmanager.playSound('wind', 0.2)
    }
    // if (player.type === 'person') {
    //   this.advanceSwitch('switch')
    // }
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
      if (player.type === 'vine') {
        this.executeExtendVines(player)
      }
      if (otherPlayer.type === 'vine') {
        this.executeRetractVines(otherPlayer)
      }
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

  advanceVine() {
    // Iterate over vine guys
    const vinePlayers = this.getThingsByName('player').filter((t) => t.type === 'vine')
    for (const player of vinePlayers) {
      if (!player.active) {
        this.executeExtendVines(player)
      }
    }
  }

  advanceIce() {
    // Delete all existing ice things
    for (const key in this.state.waterlogged) {
      let thing = this.state.waterlogged[key]
      if (thing.type === 'ice') {
        delete this.state.waterlogged[key]
      }
    }

    // Iterate over ice guys
    const icePlayers = this.getThingsByName('player').filter((t) => t.type === 'ice')
    for (const player of icePlayers) {
      // Build ice around this player
      const [px, py] = player.position
      const iceRadius = 1
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
              id: this.nextId ++,
              position: icePos,
            }
          }
        }
      }
    }
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

  advanceWaterlog() {
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

          soundmanager.playSound('sploosh', 0.4)

          // And remove it from the main thing list
          this.executePlayerDeath(thing)
          this.state.things.splice(i, 1)
        }
      }
    }
  }

  executeBolt(direction) {
    const delta = vec2.directionToVector(direction)

    // Find the player
    let player = this.getThingsByName('player')[0]

    // Raytrace the bolt forward
    let pos = [...player.position]
    const beamHeight = this.getThingHeight(player)
    for (let i = 0; i < 20; i ++) {
      pos = vec2.add(pos, delta)

      // See if the terrain blocks this shot
      if (this.getTileHeight(pos) > beamHeight) {
        break
      }

      // Loop over things and see if we have struck something
      let blocked = false
      for (let j = 0; j < this.state.things.length; j ++) {
        let thing = this.state.things[j]
        if (vec2.equals(thing.position, pos)) {
          // Blocking Object
          if (thing.name === 'deco') {
            blocked = true
          }
          // Player
          else if (thing.name === 'player') {
            blocked = true
            this.executePlayerDeath(thing)
            this.state.things.splice(j, 1)
            j --
          }
        }

      }
      if (blocked) {
        break
      }
    }
  }

  executeFire(player) {
    if (player.dead) {
      return
    }


    const deltas = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]

    // Check all adjacent tiles
    for (const delta of deltas) {
      const pos = vec2.add(player.position, delta)

      if (player === this.getActivePlayer()) {
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
          }
          // Wood
          if (thing.name === 'deco' && ['wood', 'vine', 'box'].includes(thing.type)) {
            this.state.things.splice(j, 1)
            j --
          }
        }
      }
    }
  }

  isBlockingAt (curPos, players = false) {
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

  executeWind(player) {
    if (player.dead) {
      return
    }

    let curPos = player.position
    let delta = vec2.directionToVector(player.direction)
    const blowDistance = 12
    let foundThing = undefined
    let i = 0

    let didPushSound = false

    // Play the wind animation on the wind guy's character
    for (const thing of game.getThings()) {
      if (thing.tileThingReference === player) {
        thing.createWind()
      }
    }

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
      const blockingThing = this.state.things.filter(x => vec2.equals(curPos, x.position) && ['deco'].includes(x.name))[0]
      if (blockingThing) {
        return
      }

      // Found a player to push
      foundThing = this.state.things.filter(x => vec2.equals(curPos, x.position) && ['player'].includes(x.name))[0]
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
        didPushSound = true
      }
      this.executeUpdatePlayer(foundThing)
    }

    if (didPushSound) {
      soundmanager.playSound('wind', 0.2)
    }
  }

  executeExtendVines(player) {
    // Do not extend vines if this is the active player
    if (player.active) {
      return
    }

    // Do both directions
    const vineLength = 15
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
      }
    }
  }

  executeRetractVines(player) {
    // Iterate over and delete all vine objects which are owned by this
    for (let i = this.state.things.length-1; i >= 0; i --) {
      const thing = this.state.things[i]
      if (thing.name === 'deco' && thing.type === 'vine' && thing.owner === player.id) {
        this.state.things.splice(i, 1)
      }
    }
  }

  executeUpdatePlayer(player) {
    // Exit if this is not a player
    if (player.name !== 'player') {
      return
    }

    // Vine guys must update their vines
    if (player.type === 'vine') {
      this.executeRetractVines(player)
      this.executeExtendVines(player)
    }
  }

  executePlayerDeath(player) {
    // Exit if this is not a player
    if (player.name !== 'player') {
      return
    }

    player.dead = true

    // Vine guys must update their vines
    if (player.type === 'vine') {
      this.executeRetractVines(player)
    }

    // If person guy is killed, the active player dies too
    if (player.type === 'person') {
      if (this.getActivePlayer() && this.getActivePlayer().type !== 'person') {
        this.executePlayerDeath(this.getActivePlayer())
      }
      game.addThing(new DeathScreen())
    }

    // Reset active player
    if (player.active && player.type !== 'person') {
      player.active = false
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
    const { ctx } = game
    ctx.save()
    ctx.translate(32, game.config.height - 32)
    ctx.font = 'italic bold 40px Arial'
    ctx.fillStyle = '#21235B'
    ctx.fillText(`Level ${game.globals.level}`, 0, 0)
    ctx.translate(4, -4)
    ctx.fillStyle = 'white'
    ctx.fillText(`Level ${game.globals.level}`, 0, 0)
    ctx.restore()
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
        ;[screenX, screenY] = this.positionOnScreen([x, y])

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
        ;[screenX, screenY] = this.positionOnScreen(thing.position)
        screenY -= (wallDepth * getThingHeight)
        if (thing.waterlogged) {
          screenY -= 2
        }

        // Deco Objects
        if (thing.name === 'deco') {
          if (thing.waterlogged) {
            const image = thing.type ? ("deco_waterlogged_" + thing.type) : 'undefined'
            if (image) {
              ctx.drawImage(assets.images[image], screenX, screenY - 2, tileWidth, tileDepth)
            }
          } else {
            const image = thing.type ? ("deco_" + thing.type) : 'undefined'
            if (image) {
              ctx.drawImage(assets.images[image], screenX, screenY - 2, tileWidth, tileDepth)
            }
          }
        }

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
        ;[screenX, screenY] = board.positionOnScreen([x, y])

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
