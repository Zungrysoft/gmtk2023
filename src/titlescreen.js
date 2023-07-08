import * as game from './core/game.js'
import * as u from './core/utils.js'
import * as soundmanager from './core/soundmanager.js'
import * as gfx from './core/webgl.js'
import * as mat from './core/matrices.js'
import * as vec2 from './core/vector2.js'
import * as vec3 from './core/vector3.js'
import Thing from './core/thing.js'

export default class DeathScreen extends Thing {
  time = -10

  constructor () {
    super()
    game.setThingName(this, 'titlescreen')
    game.getThing('board').movementDisabled = true
  }

  update () {
    this.time += 1
    if (Object.keys(game.keysPressed).length > 0 || Object.keys(game.buttonsPressed).length > 0) {
      game.resetScene()
    }
  }

  postDraw () {
    const { ctx } = game
    ctx.save()
    ctx.fillStyle = '#21235B'
    ctx.globalAlpha = 0.45
    ctx.fillRect(0, 0, game.config.width, game.config.height)
    ctx.restore()

    ctx.save()
    ctx.globalAlpha = u.squareMap(this.time, 0, 120, 0, 1, true)
    ctx.translate(256 + 64, 180)
    ctx.translate(-200, -100 + Math.sin(this.time / 40) * 10)
    ctx.drawImage(game.assets.images.title, 0, 0)
    ctx.restore()

    ctx.save()
    ctx.translate(game.config.width - 64, game.config.height - 64)
    ctx.font = 'italic bold 28px Arial'
    ctx.textAlign = 'right'
    ctx.fillStyle = 'white'
    ctx.globalAlpha = u.map(this.time, 80, 120, 0, u.map(Math.sin(this.time / 15), -1, 1, 0.8, 1), true)
    ctx.fillText('Press any key', 0, 0)
    ctx.restore()
  }
}
