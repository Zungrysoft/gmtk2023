import * as game from './core/game.js'
import * as u from './core/utils.js'
import * as vec2 from './core/vector2.js'
import Thing from './core/thing.js'
import VoidParticleFade from './voidparticlefade.js'

export default class VoidParticle extends Thing {
  sprite = 'deco_void_particle'
  time = 0
  liveTime = 10
  scale = 1.0
  alpha = 1.0

  constructor (position, targetPosition) {
    super()
    this.position = position.map(x => x * 64 + 32)
    this.targetPosition = targetPosition.map(x => x * 64 + 32)
    this.position[0] += (Math.random() - 0.5) * 32
    this.position[1] += (Math.random() - 0.5) * 32
    this.moveAngle = Math.random() * Math.PI*2
    this.rotation = Math.random() * Math.PI*2
  }

  update () {
    // Fade out if close to target
    if (vec2.distance(this.position, this.targetPosition) < 64) {
      this.time += 1
    }

    // Track previous position
    let prevPos = [...this.position]

    // Alpha
    this.alpha = u.squareMap(this.time, 0, this.liveTime, 1.0, 0.0, true) * u.squareMap(vec2.distance(this.position, this.targetPosition), 128, 0, 0.5, 0.0, true)

    // Home in on target
    let targetAngle = vec2.vectorToAngle(vec2.subtract(this.targetPosition, this.position))
    this.moveAngle = vec2.lerpAngles(this.moveAngle, targetAngle, vec2.angleDistance(this.moveAngle, targetAngle) * 0.2)

    if (this.time > this.liveTime) {
      this.dead = true
    }

    // Move
    this.position = vec2.add(this.position, vec2.angleToVector(this.moveAngle, 9))
    this.rotation += 0.0

    // Spawn fade particle
    game.addThing(new VoidParticleFade(vec2.lerp(this.position, prevPos, 0.5), this.rotation, this.alpha))
  }

  draw () {
    const { ctx } = game
    ctx.save()
    ctx.globalAlpha = this.alpha
    super.draw()
    ctx.restore()
  }
}
