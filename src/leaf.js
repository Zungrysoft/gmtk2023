import * as game from './core/game.js'
import * as u from './core/utils.js'
import * as vec2 from './core/vector2.js'
import Thing from './core/thing.js'

export default class Leaf extends Thing {
  sprite = 'deco_leaf'
  time = 0
  liveTime = 20
  scale = 1.0

  constructor (position) {
    super()
    this.position = position.map(x => x * 64 + 32)
    this.position[0] += (Math.random() - 0.5) * 32
    this.position[1] += (Math.random() - 0.5) * 32
    this.velocity = vec2.angleToVector(Math.random() * Math.PI*2, 3)
    this.rotation = Math.random() * Math.PI*2
  }

  update () {
    this.time += 1
    this.position = vec2.add(this.position, this.velocity)
    this.rotation += 0.16
    if (this.time > this.liveTime) {
      this.dead = true
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
