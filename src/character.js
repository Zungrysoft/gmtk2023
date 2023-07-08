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

export default class Character extends Thing {
  sprite = 'player_fire'
  time = 0
  wasActive = false
  wasSelected = false
  isSelected = false
  newlySelected = false
  lastPosition = [0, 0]
  drawPosition = [0, 0]
  walkBob = 0
  depth = 10
  animations = {
    idle: { frames: [0, 1], speed: 0.035 }
  }

  constructor (tileThingReference) {
    super()
    this.tileThingReference = tileThingReference
    this.sprite = "player_" + tileThingReference.type
    this.position = this.getDestination()
    this.drawPosition = [...this.position]
    this.lastPosition = [...this.position]
  }

  update () {
    this.time += 1
    this.updateTimers()
    this.animate()

    // Do a little animation when I become selected
    if (this.tileThingReference.active && !this.wasActive) {
      this.announce()
      this.cancelTimer('fire')
      this.cancelTimer('wind')
    }
    if (this.timer('announce')) {
      const scalar = u.squareMap(this.timer('announce'), 0, 1, 1.5, 1)
      this.scale = [scalar, scalar]
    }

    // Move towards and face towards my destination
    const destination = this.getDestination()
    this.position = vec2.lerp(this.position, destination, 0.25)
    if (destination[0] < this.position[0]) {
      this.scale[0] = Math.abs(this.scale[0]) * -1
    } else {
      this.scale[0] = Math.abs(this.scale[0])
    }

    // Walk animation and bobbing
    this.walkBob += u.distance(this.position, this.lastPosition)
    this.drawPosition[0] = this.position[0]
    this.drawPosition[1] = this.position[1] + Math.sin(this.walkBob / 10) * 3
    this.rotation = Math.sin(this.walkBob / 30) * 0.12

    // Camera should follow me when I'm the active player
    const board = game.getThing('board')
    if (board) {
      if (this.tileThingReference === board.getActivePlayer()) {
        game.getCamera2D().position = this.position
      } else {
        this.rotation = 0
      }
    }

    // NPC animations
    if (this.tileThingReference !== board.getActivePlayer()) {
      if (this.tileThingReference.type === 'fire') {
        if (!this.timer('fire')) {
          this.after(50, () => this.createFire(false), 'fire')
        }
      }
      if (this.tileThingReference.type === 'wind') {
        if (!this.timer('wind')) {
          this.after(50, () => this.createWind(), 'wind')
        }
      }
    }

    if (this.tileThingReference.dead) { this.dead = true }

    this.wasActive = this.tileThingReference.active
    this.lastPosition = [...this.position]
    const selected = this.tileThingReference.id === board.getSwitchPlayer()?.id
    if (selected && !this.wasSelected && this.tileThingReference.type !== 'person') {
      this.after(10, null, 'newlySelected')
    }
    this.isSelected = selected
    this.wasSelected = selected
  }

  draw () {
    const { ctx } = game
    // Draw the vine behind the plant guy
    const board = game.getThing('board')
    if (this.tileThingReference !== board?.getActivePlayer()) {
      if (this.tileThingReference.type === 'vine') {
        ctx.save()
        ctx.translate(...this.drawPosition)
        ctx.translate(-32, -30)
        ctx.drawImage(game.assets.images.deco_vine, 0, 0)
        ctx.restore()
      }
    }

    super.draw(...this.drawPosition)

    const tileThing = this.tileThingReference

    // Draw cursor over myself when i'm the next to be selected
    if (board) {
      if (this.isSelected) {
        ctx.save()
        ctx.translate(this.position[0], this.position[1])
        ctx.rotate(this.time / (tileThing.type === 'person' ? 120 : 30))
        const scale = this.timers.newlySelected !== undefined ? u.map(this.timer('newlySelected'), 0, 1, 4, 1) : 1
        ctx.scale(scale, scale)
        if (tileThing.type === 'person') {
          ctx.globalAlpha = 0.5
        }
        ctx.translate(-64, -64)
        ctx.drawImage(game.assets.images.iconNearest, 0, 0)
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

  createFire (fade = true) {
    for (let a = 0; a < 8; a += 1) {
      const angle = a * Math.PI / 4
      const x = this.tileThingReference.position[0] + Math.round(Math.cos(angle))
      const y = this.tileThingReference.position[1] + Math.round(Math.sin(angle))
      game.addThing(new Fire([x, y], fade))
    }
  }

  createWind () {
    for (let i = 0; i < 4; i += 1) {
      const dir = vec2.directionToVector(this.tileThingReference.direction)
      const pos = vec2.add(this.tileThingReference.position, vec2.scale(dir, i + 1))
      game.addThing(new Wind(pos, dir))
    }
  }
}
