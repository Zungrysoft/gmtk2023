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

  constructor () {
    super()
    game.setThingName(this, 'board')

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

    // Set up camera
    // let cameras = this.getThingsByName('camera')
    // if (cameras.length) {
    //   this.cameraPosition = cameras[0].position
    // }
    //game.getCamera2D().position = this.getActivePlayer()?.position || [0, 0]

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
    if (game.keysPressed.ShiftLeft || game.buttonsPressed[1]) {
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
              'burn',
              'ice',
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
        else if (adv === 'burn') {
          this.advanceBurn()
        }
        else if (adv === 'ice') {
          this.advanceIce()
        }
        else if (adv === 'waterlog') {
          this.advanceWaterlog()
        }

        blocked = this.isAnimationBlocking()
      }

      // Update camera to follow player
      const newPosition = this.getActivePlayer()?.position
      if (newPosition) {
        game.getCamera2D().position = [newPosition[0] * tileWidth, newPosition[1] * tileDepth]
      }
    }

    // Advance animations
    this.advanceAnimations()

    //game.config.width = Math.round(window.innerWidth / 2) - 8
    //game.config.height = Math.round(window.innerHeight / 2) - 8

    // TODO: Check for win
    // if (this.state.cratesDelivered >= this.state.cratesRequired && this.state.level > 0) {
    //   game.globals.levelCompletions[this.state.level-1] = true
    // }

  }

  defaultAnimation() {
    return {
      position: [0, 0, 0],
      endPosition: [0, 0, 0],
      speed: 0,
      moveType: 'none',
      spinSpeed: 0,
      spinAngle: 0,
      scale: 1.0,
      scrollTime: 0,
      scrollPosition: 0,
      laserThickness: 0,
      laserLength: 0,
      rotation: 0,
      endRotation: 0,
      shrinkHeight: 0,
    }
  }

  resetAnimations() {
    // this.animState = this.state.elements.map(e => this.defaultAnimation())
  }

  advanceAnimations() {

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

    // Player can't swim
    if (this.getTileHeight(newPosition) <= 0 && !(newPosition in this.state.waterlogged)) {
      return
    }

    // Player can't scale cliffs
    if (this.getTileHeight(newPosition) > this.getThingHeight(player)) {
      return
    }

    // Check if there is an thing blocking us
    const blockingThing = this.state.things.filter(x => vec2.equals(newPosition, x.position) && ['deco', 'player'].includes(x.name))[0]
    if (blockingThing) {
      const canBeMovedByGolem = blockingThing.name === 'player' || (blockingThing.name === 'deco' && blockingThing.type === 'rock')
      if (player.type === 'golem' && canBeMovedByGolem) {
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
  }

  advanceSwitch(control) {
    if (control !== 'switch') {
      return
    }

    let player = this.getActivePlayer()
    if (!player) {
      return undefined
    }

    let otherPlayer = this.getNextPlayer()

    if (otherPlayer) {
      player.active = false
      otherPlayer.active = true

      player.lastActive = this.state.turns - 1
    }
  }

  advanceBurn() {
    // Iterate over fire guys
    const firePlayers = this.getThingsByName('player').filter((t) => t.type === 'fire')
    for (const player of firePlayers) {
      if (!player.active) {
        this.executeFire(player)
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
            console.log("ICE")
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

  advanceWaterlog() {
    // Iterate over entities and see if they should be waterlogged
    for (let i = this.state.things.length-1; i >= 0; i --) {
      let thing = this.state.things[i]

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
    const deltas = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]

    // Check all adjacent tiles
    const beamHeight = this.getThingHeight(player)
    for (const delta of deltas) {
      const pos = vec2.add(player.position, delta)

      // Don't deal damage if the ground of a different height
      if (this.getTileHeight(pos) !== beamHeight) {
        continue
      }

      // Loop over things and see if we have struck something
      for (let j = 0; j < this.state.things.length; j ++) {
        let thing = this.state.things[j]
        if (vec2.equals(thing.position, pos)) {
          // Player
          if (thing.name === 'player') {
            this.state.things.splice(j, 1)
            j --
          }
          // Wood
          if (thing.name === 'deco' && thing.type === 'wood') {
            this.state.things.splice(j, 1)
            j --
          }
        }

      }
    }
  }

  draw () {
    const { ctx } = game

    // Move camera
    // this.cameraPosition = vec2.lerp(this.cameraPosition, this.getActivePlayer().position, 0.3)

    // {
    //   const auxControls = [
    //     "WASD / Arrow Keys: Move",
    //     "Space / U: Undo",
    //     "Backspace: Restart",
    //   ].reverse()
    //   const auxControlsGamepad = [
    //     "D-Pad: Move",
    //     "RB: Undo",
    //     "LB: Restart",
    //   ].reverse()
    //   ctx.save()
    //   ctx.translate(game.config.width - 7, game.config.height)
    //   ctx.font = 'italic 6px Times New Roman'
    //   ctx.textAlign = 'right'
    //   for (const control of (game.globals.usingGamepad ? auxControlsGamepad : auxControls)) {
    //     ctx.translate(0, -7)
    //     const str = control
    //     ctx.fillStyle = 'black'
    //     ctx.fillText(str, 0, 0)
    //     ctx.fillStyle = 'white'
    //     ctx.fillText(str, 4, -4)
    //   }
    //   ctx.restore()
    // }

    // // Draw the score HUD
    // {
    //   ctx.save()
    //   ctx.translate(32, 72)
    //   ctx.font = 'italic 6px Times New Roman'
    //   const str = this.state.cratesDelivered + "/" + this.state.cratesRequired + " crates correctly sorted"
    //   ctx.fillStyle = 'black'
    //   ctx.fillText(str, 0, 0)
    //   ctx.fillStyle = 'white'
    //   ctx.fillText(str, 4, -4)
    //   ctx.restore()
    // }

    // // Draw the victory text
    // const victory = this.state.cratesDelivered >= this.state.cratesRequired
    // if (victory) {
    //   // You win message
    //   {
    //     ctx.save()
    //     ctx.translate(game.config.width/2, game.config.height/2 - 100)
    //     ctx.font = 'italic 130px Times New Roman'
    //     ctx.textAlign = 'center'
    //     const str = this.state.level === 0 ? "Level Complete!" : "Level " + this.state.level + " Complete!"
    //     ctx.fillStyle = 'black'
    //     ctx.fillText(str, 0, 0)
    //     ctx.fillStyle = 'white'
    //     ctx.fillText(str, 4, -4)
    //     ctx.restore()
    //   }

    //   // Level change guide
    //   if (this.state.level !== 0) {
    //     ctx.save()
    //     ctx.translate(game.config.width/2, game.config.height/2 + 100)
    //     ctx.font = 'italic bold 50px Times New Roman'
    //     ctx.textAlign = 'center'
    //     const str = game.globals.usingGamepad ? "Use LT and RT to change levels" : "Use - and + to change levels"
    //     ctx.fillStyle = 'black'
    //     ctx.fillText(str, 0, 0)
    //     ctx.fillStyle = 'white'
    //     ctx.fillText(str, 4, -4)
    //     ctx.restore()
    //   }
    // }
    // if (!victory || this.state.level === 0) {
    //   // Draw the level Name
    //   {
    //     ctx.save()
    //     ctx.translate(game.config.width/2, 14)
    //     ctx.font = 'italic 11px Times New Roman'
    //     ctx.textAlign = 'center'
    //     const str = this.state.level === 0 ? this.state.levelTitle : "Level " + this.state.level
    //     ctx.fillStyle = 'black'
    //     ctx.fillText(str, 0, 0)
    //     ctx.fillStyle = 'white'
    //     ctx.fillText(str, 4, -4)
    //     ctx.restore()
    //   }

    //   // Draw completion text
    //   if (game.globals.levelCompletions[this.state.level-1] === true) {
    //     ctx.save()
    //     ctx.translate(game.config.width/2, 24)
    //     ctx.font = 'italic 6px Times New Roman'
    //     ctx.textAlign = 'center'
    //     const str = "Complete!"
    //     ctx.fillStyle = 'black'
    //     ctx.fillText(str, 0, 0)
    //     ctx.fillStyle = 'white'
    //     ctx.fillText(str, 4, -4)
    //     ctx.restore()
    //   }
    // }

    // ==========
    // Draw board
    // ==========

    // Set up camera
    const tilesX = (game.config.width / tileWidth)
    const tilesY = (game.config.height / tileDepth)
    const minX = Math.round(game.getCamera2D().position[0] / tileWidth - Math.floor(tilesX/2) - 1)
    const maxX = Math.round(game.getCamera2D().position[0] / tileWidth + Math.floor(tilesX/2) + 1)
    const minY = Math.round(game.getCamera2D().position[1] / tileWidth - Math.floor(tilesY/2) - 1)
    const maxY = Math.round(game.getCamera2D().position[1] / tileWidth + Math.floor(tilesY/2) + 4)

    // Determine nearest player
    const nearestPlayerId = this.getNextPlayer()?.id

    // Render terrain
    for (let y = minY; y <= maxY; y ++) {
      // Terrain
      for (let x = minX; x <= maxX; x ++) {
        // Determine terrain height at this coordinate
        const tileHeight = this.getTileHeight([x, y])

        // Determine where this tile will be rendered on screen
        let screenX, screenY
        ;[screenX, screenY] = this.positionOnScreen([x, y])

        // If height is zero, render it as water
        if (tileHeight <= 0) {
          //ctx.drawImage(assets.images.tileWater, screenX, screenY - waterHeight, tileWidth, tileDepth)
          ctx.fillStyle = '#3569CC'
          ctx.fillRect(screenX, screenY, tileWidth, tileDepth)
        }
        // Otherwise, render it as terrain
        else {
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
          //const grassImage = (x%2 !== y%2) ? assets.images.tileGrass : assets.images.tileGrassBlades
          //ctx.drawImage(grassImage, screenX, screenY, tileWidth, tileDepth)
          ctx.fillStyle = (x%2 !== y%2) ? '#F7FFDB' : '#D4FFAA'
          if (tileHeight > 1) {
            ctx.fillStyle = 'gray'
          }
          ctx.fillRect(screenX, screenY, tileWidth, tileDepth)
        }
      }

      // Overlays
      for (let x = minX; x <= maxX; x ++) {
        // Determine terrain height at this coordinate
        const tileHeight = this.getTileHeight([x, y])

        // Determine where these overlays will be rendered on screen
        let screenX, screenY
        ;[screenX, screenY] = this.positionOnScreen([x, y])

        // Render
        if (tileHeight > 0) {
          // Get heights of adjacent tiles
          const leftHeight = this.getTileHeight([x-1, y])
          const rightHeight = this.getTileHeight([x+1, y])
          const topHeight = this.getTileHeight([x, y-1])
          const bottomHeight = this.getTileHeight([x, y+1])

          // Rock wall
          for (let i = 0; i < tileHeight; i ++) {
            if (i >= this.getTileHeight([x, y+1])) {
              // Left
              if (i >= leftHeight) {
                //ctx.drawImage(assets.images.conGrassCliffRight, screenX - tileWidth, screenY, tileWidth, tileDepth)
              }
              // Right
              if (i >= rightHeight) {
                //ctx.drawImage(assets.images.conGrassCliffLeft, screenX + tileWidth, screenY, tileWidth, tileDepth)
              }
            }
            screenY -= wallDepth
          }

          // Grass hanging overlays
          // Left
          /*
          if (leftHeight < tileHeight) {
            ctx.drawImage(assets.images.conGrassRight, screenX - tileWidth, screenY, tileWidth, tileDepth)
          }
          // Right
          if (rightHeight < tileHeight) {
            ctx.drawImage(assets.images.conGrassLeft, screenX + tileWidth, screenY, tileWidth, tileDepth)
          }
          // Top
          if (topHeight !== tileHeight) {
            ctx.drawImage(assets.images.conGrassBottom, screenX, screenY - tileDepth, tileWidth, tileDepth)
          }
          // Bottom
          if (bottomHeight < tileHeight) {
            ctx.drawImage(assets.images.conGrassTop, screenX, screenY + tileDepth, tileWidth, tileDepth)
          }
          */
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

        // Items
        if (thing.name === 'item') {
          // Determine which textures should be used
          const baseImage = baseMapping[thing.direction] || 'iconItemBase'
          const iconImage = iconMapping[thing.type] || 'iconItemIconEmpty'

          // Render
          ctx.drawImage(assets.images[baseImage], screenX, screenY, tileWidth, tileDepth)
          ctx.drawImage(assets.images[iconImage], screenX, screenY, tileWidth, tileDepth)
        }

        // Player
        if (thing.name === 'player') {
          // Selected Marker
          if (thing.active) {
            //ctx.drawImage(assets.images.iconSelected, screenX, screenY-1, tileWidth, tileDepth)
          }

          // Nearest Marker
          if (thing.id === nearestPlayerId) {
            ctx.drawImage(assets.images.iconNearest, screenX, screenY-1, tileWidth, tileDepth)
          }

          // Player sprite
          const frame = [0, 0]
          const image = "player_" + (thing.type || 'fire')
          //ctx.drawImage(assets.images[image], frame[0]*16, frame[1]*16, (frame[0]+1)*16, (frame[1]+1)*16, screenX, screenY-2, tileWidth, tileDepth)
          ctx.drawImage(assets.images[image], screenX, screenY - 2)
        }

        // Deco Objects
        if (thing.name === 'deco') {
          const image = "deco_" + thing.type
          if (image) {
            ctx.drawImage(assets.images[image], screenX, screenY - 2, tileWidth, tileDepth)
          }
        }
      }
    }
  }
}