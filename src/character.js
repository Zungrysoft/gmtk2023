import * as game from './core/game.js'
import * as u from './core/utils.js'
import * as soundmanager from './core/soundmanager.js'
import * as gfx from './core/webgl.js'
import * as mat from './core/matrices.js'
import * as vec2 from './core/vector2.js'
import * as vec3 from './core/vector3.js'
import Thing from './core/thing.js'
import Fire from './fire.js'
import Wind from './wind.js'
import WinScreen from './winscreen.js'

export default class Character extends Thing {
  sprite = 'player_fire'
  time = 0
  wasActive = true
  wasSelected = false
  isSelected = false
  newlySelected = false
  lastPosition = [0, 0]
  drawPosition = [0, 0]
  walkBob = 0
  depth = 10
  squish = 0
  animations = {
    idle: { frames: [0, 1], speed: 0.035 },
    think: { frames: [2, 3], speed: 0.1 },
    swim: { frames: [2, 3], speed: 0.075 },
    none: { frames: [0] }
  }
  lastDestination = [0, 0]

  constructor (tileThingReference) {
    super()
    this.tileThingReference = tileThingReference

    this.updateSprite()

    this.position = this.getDestination()
    this.drawPosition = [...this.position]
    this.lastPosition = [...this.position]
    this.lastDestination = [...this.position]
    this.lastType = this.tileThingReference.type
    this.npcAnimations(true)
    if (game.getThing('board').getActivePlayer() === this.tileThingReference) {
      game.getCamera2D().position = [...this.position]
      game.setThingName(this, 'playercharacter')
    }
  }

  update () {
    this.time += 1
    this.updateTimers()
    this.animate()
    const board = game.getThing('board')

    this.scale = [1.0, 1.0]

    // Do a little animation when I become selected
    if (this.tileThingReference.active && !this.wasActive) {
      this.announce()
      this.cancelTimer('fire')
      this.cancelTimer('wind')
      this.after(12, null, 'focusCamera')

      if (this.tileThingReference.type === 'person') {
        if (board && board.getActivePlayer()) {
        soundmanager.playSound('stop_possession', 0.2)
        }
      } else {
        soundmanager.playSound('start_possession', 0.2)
      }
    }
    if (this.timer('announce')) {
      const scalar = u.squareMap(this.timer('announce'), 0, 1, 1.5, 1)
      this.scale = [scalar, scalar]
    }

    // Squishing
    const squishFactor = 0.18
    this.scale[0] *= u.map(this.squish, 0, 1, 1.0, squishFactor)
    this.scale[1] /= u.map(this.squish, 0, 1, 1.0, squishFactor)

    // Move towards and face towards my destination
    const destination = this.getDestination()
    this.position = vec2.lerp(this.position, destination, 0.25)
    if (this.tileThingReference.type === 'wind') {
      if (vec2.directionToVector(this.tileThingReference.direction)[0] === -1) {
        this.scale[0] = Math.abs(this.scale[0]) * -1
      }
    }
    else if (this.tileThingReference.isBlob && vec2.directionToVector(this.tileThingReference.blobDirection)[0] === -1) {
      this.scale[0] = Math.abs(this.scale[0]) * -1
    }
    else if (this.tileThingReference.isBlob && vec2.directionToVector(this.tileThingReference.blobDirection)[0] === 1) {
      this.scale[0] = Math.abs(this.scale[0])
    }
    else {
      if (destination[0] < this.position[0]) {
        this.scale[0] = Math.abs(this.scale[0]) * -1
      } else {
        this.scale[0] = Math.abs(this.scale[0])
      }
    }

    if (destination[0] !== this.lastDestination[0] || destination[1] !== this.lastDestination[1]) {
      soundmanager.playSound('step', 0.05, [0.55, 1.45])
    }
    this.lastDestination = [...destination]

    // Walk animation and bobbing
    this.walkBob += u.distance(this.position, this.lastPosition)
    this.drawPosition[0] = this.position[0]
    this.drawPosition[1] = this.position[1] + Math.sin(this.walkBob / 10) * 3
    this.rotation = Math.sin(this.walkBob / 30) * 0.12

    if (this.tileThingReference.dead && u.distance(this.position, destination) < 2 && this.timers.death === undefined && !this.dead) {
      this.after(120, () => this.dead = true, 'death')
      soundmanager.playSound('death', 0.2)
    }

    // Camera should follow me when I'm the active player
    if (board) {
      if (!board.movementDisabled) {
        if (this.timers.focusCamera) {
          game.getCamera2D().position = vec2.lerp(game.getCamera2D().position, this.position, 0.25)
        } else {
          if (this.tileThingReference === board.lastActivePlayer) {
            game.getCamera2D().position = vec2.lerp(game.getCamera2D().position, this.position, 0.75)
          } else {
            this.rotation = 0
          }
        }
      }

      if (this.tileThingReference.type === 'person') {
        const goal = board.state.things.filter(x => vec2.equals(this.tileThingReference.position, x.position) && x.name === 'goal')[0]
        if (goal && !game.getThing('winscreen')) {
          board.movementDisabled = true
          soundmanager.playSound('win', 0.45, [1, 1])
          game.addThing(new WinScreen())
        }
      }
    }

    this.npcAnimations()

    this.wasActive = this.tileThingReference.active
    this.lastPosition = [...this.position]
    const selected = this.tileThingReference.id === board.getSwitchPlayer()?.id
    if (selected && !this.wasSelected && this.tileThingReference.type !== 'person') {
      this.after(10, null, 'newlySelected')
      soundmanager.playSound('select', 0.2)
    }
    this.isSelected = selected
    this.wasSelected = selected

    // ============
    // Transforming
    // ============

    // Detect if the player changed type
    const transformTime = 10
    if (this.tileThingReference.type !== this.lastType) {
      this.after(transformTime * 2, null, 'changedType')
    }
    this.lastType = this.tileThingReference.type

    // Sprite change
    if (this.timers.changedType?.time === transformTime) {
      this.updateSprite()
    }

    // Squish and morph animation
    if (this.timers.changedType) {
      const t = this.timers.changedType.time
      this.squish = 1.0 - (Math.abs(t - transformTime) / transformTime)
    }
    else {
      this.squish = 0
    }
  }

  draw () {
    const { ctx } = game
    const board = game.getThing('board')

    if (this.sprite.includes('fire') && !this.tileThingReference.active && !this.tileThingReference.wasActive) {
      if (this.timers.death === undefined) {
        ctx.save()
        ctx.translate(...this.position)
        for (let a = 0; a < 8; a += 1) {
          const angle = a * Math.PI / 4
          const delta = [Math.round(Math.cos(angle)), Math.round(Math.sin(angle))]
          if (board.getTileHeight(vec2.add(this.tileThingReference.position, delta)) > 1) { continue }
          ctx.save()
          ctx.translate(...vec2.scale(delta, 64))
          ctx.rotate(this.time / -20)
          ctx.translate(-32, -32)
          ctx.drawImage(game.assets.images.deco_fire, 0, 0)
          ctx.restore()
        }
        ctx.restore()
      }
    }

    ctx.save()
    const prevScale = this.scale
    if (this.timers.death !== undefined) {
      ctx.globalAlpha = u.map(this.timer('death'), 0.5, 1, 1, 0)
      this.scale = u.squareMap(this.timer('death'), 0.5, 1, 1, 0, true)
    }
    super.draw(...this.drawPosition)
    this.scale = prevScale
    ctx.restore()

  }

  postDraw () {
    const { ctx } = game
    const tileThing = this.tileThingReference
    const board = game.getThing('board')

    if (tileThing.dead) { return }
    if (game.getThing('titlescreen')) { return }
    if (game.getThing('levelselect')) { return }

    ctx.save()
    ctx.translate(game.config.width / 2, game.config.height / 2)
    ctx.translate(...game.getCamera2D().position.map(x => x * -1))
    // Draw cursor over myself when i'm the next to be selected
    if (board) {
      if (this.isSelected && tileThing.type !== 'person') {
        ctx.save()
        ctx.translate(this.position[0], this.position[1])
        ctx.rotate(this.time / 30)
        const scale = this.timers.newlySelected !== undefined ? u.map(this.timer('newlySelected'), 0, 1, 4, 1) : 1
        ctx.scale(scale, scale)
        ctx.translate(-64, -64)
        ctx.drawImage(game.assets.images.iconNearest, 0, 0)
        ctx.restore()
      }

      if (this.checkIsActive() && !(tileThing.type === 'person' || tileThing.isBlob)) {
        ctx.save()
        ctx.translate(this.position[0], this.position[1])
        ctx.globalAlpha = 0.5
        ctx.translate(-32, -80 + Math.sin(this.time / 20) * 4)
        ctx.drawImage(game.assets.images.selectorArrow, 0, 0)
        ctx.restore()
      }
    }

    // Draw the player's aim arrow
    if (this.checkIsActive() && tileThing.type === 'person') {
      const position = vec2.add(this.position, vec2.scale(vec2.directionToVector(tileThing.direction), 64))
      ctx.save()
      ctx.globalAlpha = 0.5
      ctx.translate(...position)
      ctx.rotate(u.angleTowards(0, 0, ...vec2.directionToVector(tileThing.direction)))
      ctx.translate(-32, -32)
      ctx.drawImage(game.assets.images.aimArrow, 0, 0)
      ctx.restore()
    }

    // Draw blob guy's aim arrow
    if (tileThing.isBlob) {
      const position = vec2.add(this.position, vec2.scale(vec2.directionToVector(tileThing.blobDirection), 64))
      ctx.save()
      ctx.globalAlpha = 0.9
      ctx.translate(...position)
      ctx.rotate(u.angleTowards(0, 0, ...vec2.directionToVector(tileThing.blobDirection)))
      ctx.translate(-32, -32)
      ctx.drawImage(game.assets.images.aimArrow, 0, 0)
      ctx.restore()
    }

    ctx.restore()
  }

  getDestination () {
    const destination = this.tileThingReference.position.map(x => x * 64 + 32)
    destination[1] -= 16
    return destination
  }

  announce () {
    this.after(15, null, 'announce')
  }

  checkIsActive () {
    return this.tileThingReference.active
  }

  createWind () {
    const board = game.getThing('board')
    if (!board) return
    for (let i = 0; i < 12; i += 1) {
      const dir = vec2.directionToVector(this.tileThingReference.direction)
      const pos = vec2.add(this.tileThingReference.position, vec2.scale(dir, i + 1))
      if (board.isBlockingAt(pos, true)) {
        break
      }
      game.addThing(new Wind(pos, dir))
    }
  }

  updateSprite () {
    // Update this sprite
    this.sprite = "player_" + this.tileThingReference.type

    // Special logic for wind guy
    if (['wind'].includes(this.tileThingReference.type)) {
      if (vec2.directionToVector(this.tileThingReference.direction)[1] === -1) {
        this.sprite += '_back'
      }
      if (vec2.directionToVector(this.tileThingReference.direction)[1] === 1) {
        this.sprite += '_front'
      }
    }

    // Special logic for blob guy
    if (this.tileThingReference.type === 'blob') {
      if (vec2.directionToVector(this.tileThingReference.blobDirection)[1] === -1) {
        this.sprite += '_back'
      }
      if (vec2.directionToVector(this.tileThingReference.blobDirection)[1] === 1) {
        this.sprite += '_front'
      }
    }
    if (this.tileThingReference.isBlob && this.tileThingReference.type !== 'blob') {
      this.sprite += '_blob'
    }
  }

  npcAnimations (init = false) {
    this.animation = 'idle'
    const board = game.getThing('board')
    if (board && this.tileThingReference !== board.getActivePlayer() && !this.tileThingReference.dead) {
      if (this.tileThingReference.type === 'wind') {
        if (!this.timer('wind')) {
          if (init) { this.createWind() }
          this.after(50, () => this.createWind(), 'wind')
        }
      }
      if (this.tileThingReference.type === 'person') {
        this.animation = 'think'
      }
    }
    if (this.sprite.includes('water') &&
        board.getTileHeight(this.tileThingReference.position) === 0 &&
        !(this.tileThingReference.position in board.state.waterlogged)) {
      this.animation = 'swim'
    }
    if (this.timers.death !== undefined) {
      this.sprite = 'skull'
      this.animation = 'none'
    }
  }
}
