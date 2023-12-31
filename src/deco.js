import * as game from './core/game.js'
import { assets } from './core/game.js'
import * as u from './core/utils.js'
import * as soundmanager from './core/soundmanager.js'
import * as gfx from './core/webgl.js'
import * as mat from './core/matrices.js'
import * as vec2 from './core/vector2.js'
import * as vec3 from './core/vector3.js'
import Thing from './core/thing.js'

export default class Deco extends Thing {
  sprite = 'undefined_sprite'
  time = 0
  wasPhasedOut = false
  phaseTime = 0
  phaseScale = 1.0
  lastPosition = [0, 0]
  drawPosition = [0, 0]
  depth = 5
  alpha = 1.0
  wasAttached = false
  lastAttachmentCount = 0
  wasWaterlogged = false
  lastDestination = [0, 0]
  animations = {
    idle: { frames: [0], speed: 0.1 },
    computer: { frames: [0, 1], speed: 0.035 },
  }

  constructor (tileThingReference) {
    super()
    this.tileThingReference = tileThingReference

    this.updateSprite()

    this.position = this.getDestination()
    this.drawPosition = [...this.position]
    this.lastPosition = [...this.position]
    this.lastDestination = [...this.position]
    this.wasWaterlogged = tileThingReference.waterlogged
    this.wasAttached = tileThingReference.attached
    this.lastAttachmentCount = tileThingReference.attachmentCount
    this.phaseScale = tileThingReference.phasedOut ? 1.3 : 1.0
    this.wasPhasedOut = tileThingReference.phasedOut
    this.alpha = tileThingReference.phasedOut ? 0.4 : 1.0
  }

  update () {
    this.time += 1
    this.updateTimers()
    this.animate()
    const board = game.getThing('board')

    // Attachment animation
    if (this.tileThingReference.attached && (!this.wasAttached || (this.tileThingReference.attachmentCount > this.lastAttachmentCount))) {
      this.announce()
      soundmanager.playSound('attach', 0.4)
    }
    if (!this.tileThingReference.attached && this.wasAttached) {
      this.announce()
      soundmanager.playSound('detach', 0.4)
    }
    this.wasAttached = this.tileThingReference.attached
    this.lastAttachmentCount = this.tileThingReference.attachmentCount

    // Calculate scale
    this.scale = [1.0, 1.0]
    if (this.timer('announce')) {
      const scalar = u.squareMap(this.timer('announce'), 0, 1, 1.3, 1)
      this.scale = [scalar, scalar]
    }

    // Phase scale
    if (this.tileThingReference.phasedOut) {
      this.phaseScale = u.lerp(this.phaseScale, 1.3, 0.2)
    }
    else {
      this.phaseScale = u.lerp(this.phaseScale, 1.0, 0.2)
    }
    this.scale = vec2.scale(this.scale, this.phaseScale)

    // Calculate rotation
    if (this.tileThingReference.phasedOut) {
      this.phaseTime += 1/80
      this.rotation = Math.sin(this.phaseTime) * 0.7
    }
    else {
      this.phaseTime = 0
      this.rotation = vec2.lerpAngles(this.rotation, 0, 0.2)
    }

    // Phase alpha
    if (this.tileThingReference.phasedOut) {
      this.alpha = u.lerp(this.alpha, 0.4, 0.15)
    }
    else {
      this.alpha = u.lerp(this.alpha, 1.0, 0.15)
    }

    // Phase sprite update
    if (!!this.tileThingReference.phasedOut !== !!this.wasPhasedOut) {
      this.updateSprite()
    }
    this.wasPhasedOut = this.tileThingReference.phasedOut

    // Move towards and face towards my destination
    const destination = this.getDestination()
    this.position = vec2.lerp(this.position, destination, 0.25)

    this.lastDestination = [...destination]

    this.drawPosition[0] = this.position[0]
    this.drawPosition[1] = this.position[1]

    // Check for waterlogging
    if (this.tileThingReference.waterlogged && !this.wasWaterlogged && u.distance(this.position, this.getDestination()) < 10) {
      this.wasWaterlogged = true

      // Snap to destination position
      this.position = destination

      // Sound effect
      soundmanager.playSound('sploosh', 0.4)

      // Update the sprite
      this.updateSprite()
    }

    // Death
    if (this.tileThingReference.dead) {
      this.dead = true
    }
  }

  draw () {
    const { ctx } = game
    const board = game.getThing('board')

    ctx.save()
    const prevScale = this.scale
    ctx.globalAlpha = this.alpha
    super.draw(...this.drawPosition)
    this.scale = prevScale

    if (this.tileThingReference.attached && !this.tileThingReference.waterlogged) {
      ctx.save()
      const frame = Math.floor(board.time / 6) % 4
      const sprite = this.tileThingReference.altAttachment ? 'deco_electricity_alt' : 'deco_electricity'
      ctx.drawImage(assets.images[sprite], frame * 64, 0, 64, 64, this.drawPosition[0]-32, this.drawPosition[1]-32, 64, 64)
      ctx.restore()
    }

    ctx.restore()

  }

  getDestination () {
    const destination = this.tileThingReference.position.map(x => x * 64 + 32)
    destination[1] -= 12
    return destination
  }

  announce () {
    this.after(12, null, 'announce')
  }

  updateSprite (type, direction) {
    let thing = this.tileThingReference

    // If a custom type was not passed in, use the thing's type
    type = type || thing.type
    direction = direction || thing.direction

    // Update this sprite
    this.sprite = "deco_" + type

    if (thing.type === 'vine' && vec2.directionToVector(thing.direction)[1] !== 0) {
      this.sprite = 'deco_vine_v'
    }
    if (thing.waterlogged) {
      this.sprite += '_waterlogged'
    }

    // Render direction
    this.renderDirection = direction

    // Render depth
    this.depth = thing.waterlogged ? -5 : 5

    // Phased out
    if (thing.phasedOut) {
      this.depth = 4
    }

    // Animation
    this.animation = (type === 'xray' && !thing.waterlogged && !thing.phasedOut) ? 'computer' : 'idle'
  }
}
