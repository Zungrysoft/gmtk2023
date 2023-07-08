import * as game from './core/game.js'
import * as u from './core/utils.js'
import * as soundmanager from './core/soundmanager.js'
import * as gfx from './core/webgl.js'
import * as mat from './core/matrices.js'
import * as vec2 from './core/vector2.js'
import * as vec3 from './core/vector3.js'
import Thing from './core/thing.js'

export default class Wave extends Thing {
  sprite = 'deco_wave'
  time = 0
  liveTime = 60 * 2
  depth = -10

  constructor (position, fade = true) {
    super()
    this.position = position.map(x => x * 64 + 32)
  }

  update () {
    this.time += 1
    const scalar = Math.sin(u.map(this.time, 0, this.liveTime, 0, Math.PI))
    this.scale = [1, scalar]
    if (this.time > this.liveTime) {
      this.dead = true
    }
  }

  draw () {
    const { ctx } = game
    ctx.save()
    ctx.globalAlpha = u.map(this.time, this.liveTime * 0.75, this.liveTime, 1, 0)
    super.draw()
    ctx.restore()
  }
}
