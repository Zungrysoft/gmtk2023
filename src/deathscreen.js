import * as game from './core/game.js'
import * as u from './core/utils.js'
import * as soundmanager from './core/soundmanager.js'
import * as gfx from './core/webgl.js'
import * as mat from './core/matrices.js'
import * as vec2 from './core/vector2.js'
import * as vec3 from './core/vector3.js'
import Thing from './core/thing.js'

export default class DeathScreen extends Thing {
  time = -80

  constructor () {
    super()
    game.setThingName(this, 'deathscreen')
  }

  update () {
    this.time += 1

    if (this.time === 20) {
      soundmanager.playSound('game_over', 0.45)
    }

    if (this.time >= 0) {
      if (Object.keys(game.keysPressed).length > 0 || Object.keys(game.buttonsPressed).length > 0) {
        game.resetScene()
      }
    }
  }

  postDraw () {
    const { ctx } = game
    ctx.save()
    ctx.fillStyle = 'black'
    ctx.globalAlpha = u.map(this.time, 0, 30, 0, 0.65, true)
    ctx.fillRect(0, 0, game.config.width, game.config.height)
    ctx.restore()

    if (this.time < 30) return
    ctx.save()
    ctx.translate(game.config.width / 2, game.config.height / 2)
    ctx.font = 'italic bold 80px Arial'
    ctx.textAlign = 'center'
    ctx.translate(-4, 4)
    ctx.fillStyle = '#21235B'
    ctx.fillText('You Died!', 0, 0)
    ctx.translate(4, -4)
    ctx.fillStyle = '#FF711C'
    ctx.fillText('You Died!', 0, 0)
    ctx.restore()

    ctx.save()
    ctx.translate(game.config.width - 64, game.config.height - 64)
    ctx.font = 'italic 30px Arial'
    ctx.textAlign = 'right'
    ctx.fillStyle = '#88ACEA'
    ctx.globalAlpha = u.map(this.time, 80, 120, 0, u.map(Math.sin(this.time / 10), -1, 1, 0.6, 0.9), true)
    ctx.fillText('Press any button to restart!', 0, 0)
    ctx.restore()
  }
}
