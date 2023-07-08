import * as game from './core/game.js'
import * as u from './core/utils.js'
import * as soundmanager from './core/soundmanager.js'
import * as gfx from './core/webgl.js'
import * as mat from './core/matrices.js'
import * as vec2 from './core/vector2.js'
import * as vec3 from './core/vector3.js'
import Thing from './core/thing.js'

export default class Character extends Thing {
  sprite = 'player_fire'
  time = 0
  wasActive = false

  constructor (tileThingReference) {
    super()
    this.tileThingReference = tileThingReference
    this.sprite = "player_" + tileThingReference.type
    this.position = this.getDestination()
  }

  update () {
    this.time += 1
    this.updateTimers()

    // Do a little animation when I become selected
    if (this.tileThingReference.active && !this.wasActive) {
      this.announce()
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

    // Camera should follow me when I'm the active player
    const board = game.getThing('board')
    if (board) {
      if (this.tileThingReference === board.getActivePlayer()) {
        game.getCamera2D().position = this.position
      }
    }

    if (this.tileThingReference.dead) { this.dead = true }

    this.wasActive = this.tileThingReference.active
  }

  draw () {
    super.draw()
    const { ctx } = game

    // Draw cursor over myself when i'm the next to be selected
    const board = game.getThing('board')
    if (board) {
      if (this.tileThingReference.id === board.getNextPlayer()?.id) {
        ctx.save()
        ctx.translate(this.position[0], this.position[1])
        ctx.rotate(this.time / 120)
        const scale = u.map(Math.sin(this.time / 60), -1, 1, 1, 1.25)
        ctx.translate(-64, -64)
        ctx.drawImage(game.assets.images.iconNearest, 0, 0)
        ctx.restore()
      }
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
}
