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
    if (game.getThing('deathscreen')) {
      game.getThing('deathscreen').dead = true
    }
    game.setThingName(this, 'deathscreen')
  }

  update () {
    this.time += 1

    if (this.time === 20) {
      soundmanager.playSound('game_over', 0.45)
    }

    /*
    if (this.time >= 0) {
      if (Object.keys(game.keysPressed).length > 0 || Object.keys(game.buttonsPressed).length > 0) {
        game.resetScene()
      }
    }
    */
  }

  postDraw () {
    const { ctx } = game
    ctx.save()
    ctx.fillStyle = '#21235B'
    ctx.globalAlpha = u.map(this.time, 0, 30, 0, 0.25, true)
    ctx.fillRect(0, 0, game.config.width, game.config.height)
    ctx.restore()

    if (this.time < 30) return
    ctx.save()
    ctx.translate(game.config.width / 2, game.config.height / 4)
    ctx.translate(-200, -100 + Math.sin(this.time / 40) * 10)
    ctx.drawImage(game.assets.images.you_died, 0, 0)
    /*
    ctx.font = 'italic bold 80px Arial'
    ctx.textAlign = 'center'
    ctx.translate(-6, 6)
    ctx.fillStyle = '#21235B'
    ctx.fillText('You Died!', 0, 0)
    ctx.translate(6, -6)
    ctx.fillStyle = '#FF711C'
    ctx.fillText('You Died!', 0, 0)
    */
    ctx.restore()

    ctx.save()
    ctx.translate(game.config.width / 2, game.config.height / 4 + 96)
    //ctx.translate(game.config.width - 64, game.config.height - 64)
    ctx.font = 'italic bold 28px Arial'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'white'
    ctx.globalAlpha = u.map(this.time, 80, 120, 0, u.map(Math.sin(this.time / 15), -1, 1, 0.8, 1), true)
    ctx.fillText('Press U to undo your last move!', 0, 0)
    ctx.restore()
  }
}
