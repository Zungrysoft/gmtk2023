import * as game from './core/game.js'
import * as u from './core/utils.js'
import * as soundmanager from './core/soundmanager.js'
import * as gfx from './core/webgl.js'
import * as mat from './core/matrices.js'
import * as vec2 from './core/vector2.js'
import * as vec3 from './core/vector3.js'
import Thing from './core/thing.js'

export default class Wind extends Thing {
  sprite = 'deco_wind'
  time = 0
  liveTime = 30
  direction = [1, 0]

  constructor (position, direction) {
    super()
    this.position = position.map(x => x * 64 + 32)
    this.position[1] -= 10
    this.position[0] -= direction[0] * 16
    this.position[1] -= direction[1] * 16
    this.direction = direction
  }

  update () {
    this.time += 1
    this.position = vec2.add(this.position, vec2.scale(this.direction, 1))
    if (this.time > this.liveTime) {
      this.dead = true
    }
    if (this.direction[0] === 0) {
      this.rotation = Math.PI / 2
    }
  }

  draw () {
    const { ctx } = game
    ctx.save()
    ctx.globalAlpha = u.squareMap(this.time, 0, this.liveTime, 1, 0.0)
    super.draw()
    ctx.restore()
  }
}
