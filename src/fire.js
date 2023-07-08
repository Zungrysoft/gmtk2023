import * as game from './core/game.js'
import * as u from './core/utils.js'
import * as soundmanager from './core/soundmanager.js'
import * as gfx from './core/webgl.js'
import * as mat from './core/matrices.js'
import * as vec2 from './core/vector2.js'
import * as vec3 from './core/vector3.js'
import Thing from './core/thing.js'

export default class Fire extends Thing {
  sprite = 'deco_fire'
  time = 0
  liveTime = 45

  constructor (position) {
    super()
    this.position = position.map(x => x * 64 + 32)
    this.position[1] -= 10
  }

  update () {
    this.time += 1
    this.rotation = this.time / -8
    //this.scale = u.map(this.time, 0, 30, 1.2, 0.5)
    if (this.time > this.liveTime) {
      this.dead = true
    }
  }

  draw () {
    const { ctx } = game
    ctx.save()
    ctx.globalAlpha = u.squareMap(this.time, 0, this.liveTime, 1, 0.2)
    super.draw()
    ctx.restore()
  }
}
