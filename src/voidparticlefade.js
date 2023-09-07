import * as game from './core/game.js'
import * as u from './core/utils.js'
import Thing from './core/thing.js'

export default class VoidParticleFade extends Thing {
  sprite = 'deco_void_particle'
  time = 0
  liveTime = 6
  scale = 1.0
  alpha = 1.0

  constructor (position, rotation, alpha) {
    super()
    this.position = position
    this.rotation = rotation
    this.alpha = alpha
  }

  update () {
    this.time += 1

    if (this.time > this.liveTime) {
      this.dead = true
    }
  }

  draw () {
    const { ctx } = game
    ctx.save()
    ctx.globalAlpha = u.map(this.time, 0, this.liveTime, 1.0, 0.0, true) * this.alpha
    super.draw()
    ctx.restore()
  }
}
