import * as game from './core/game.js'
import * as u from './core/utils.js'
import * as soundmanager from './core/soundmanager.js'
import * as gfx from './core/webgl.js'
import * as mat from './core/matrices.js'
import * as vec2 from './core/vector2.js'
import * as vec3 from './core/vector3.js'
import Thing from './core/thing.js'

export default class Sign extends Thing {
  sprite = 'sign'
  depth = 10000
  text = []
  width = 0
  height = 0
  time = 0

  constructor (tileThingReference) {
    super()
    this.tileThingReference = tileThingReference
    this.position = this.getDestination()
    this.text = tileThingReference.text.split('$')

    const { ctx } = game
    ctx.save()
    ctx.font = '28px Arial'
    for (const text of this.text) {
      this.width = Math.max(this.width, ctx.measureText(text).width + 64)
    }
    ctx.restore()
    this.height = this.text.length * 32 + 32
  }

  update () {
    super.update()
    if (this.timer('announce')) {
      const scalar = u.squareMap(this.timer('announce'), 0, 1, 1.5, 1)
      this.scale = [scalar, scalar]
    }

    const board = game.getThing('board')
    if (board && !board.movementDisabled) {
      const player = board.getActivePlayer()
      if (player && vec2.distance(this.tileThingReference.position, player.position) < 3) {
        this.time += 1
      } else {
        this.time = 0
      }
    }

    this.scale = [
      1,//u.map(Math.cos(this.time / 10), -1, 1, 0.8, 1.2),
      u.map(Math.sin(this.time / 10), -1, 1, 0.9, 1.3),
    ]
  }

  draw () {
    super.draw()
    const { ctx } = game
    const board = game.getThing('board')
    if (!board || board.movementDisabled) {
      return
    }
    const player = board.getActivePlayer()
    if (!player) { return }
    if (vec2.distance(this.tileThingReference.position, player.position) < 3) {
      ctx.save()
      ctx.fillStyle = '#21235B'
      ctx.globalAlpha = 0.75
      ctx.translate(...this.position)
      ctx.translate(this.width / -2, this.height * -1)
      ctx.translate(0, -64)
      ctx.fillRect(0, 0, this.width, this.height)
      ctx.restore()

      ctx.save()
      ctx.font = '28px Arial'
      ctx.translate(...this.position)
      ctx.translate(0, -64 - this.height)
      ctx.translate(0, 40)
      ctx.fillStyle = 'white'
      ctx.textAlign = 'center'
      for (const text of this.text) {
        ctx.fillText(text, 0, 0)
        ctx.translate(0, 32)
      }
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
}
