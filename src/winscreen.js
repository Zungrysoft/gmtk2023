import * as game from './core/game.js'
import * as u from './core/utils.js'
import Thing from './core/thing.js'
import { getLevelList, getNextLevel } from './levelloader.js'
import LevelSelect from './levelselect.js'

export default class WinScreen extends Thing {
  time = -10
  depth = 10000

  constructor () {
    super()
    game.setThingName(this, 'winscreen')
    game.globals.levelCompletions[game.globals.level] = true
    localStorage.levelCompletions = JSON.stringify(game.globals.levelCompletions)
  }

  update () {
    this.time += 1
    if (this.time >= 0) {
      if (Object.keys(game.keysPressed).length > 0 || Object.keys(game.buttonsPressed).length > 0) {
        const nextLevel = getNextLevel(game.globals.level)
        if (!nextLevel) {
          this.dead = true
          game.addThing(new LevelSelect())
        } else {
          game.globals.level = nextLevel
          game.resetScene()
        }
      }
    }
  }

  postDraw () {
    const { ctx } = game
    ctx.save()
    ctx.fillStyle = '#21235B'
    ctx.globalAlpha = u.map(this.time, 0, 30, 0, 1, true)
    ctx.fillRect(0, 0, game.config.width, game.config.height)
    ctx.restore()

    if (this.time < 30) return
    ctx.save()
    ctx.translate(game.config.width / 2, game.config.height / 2)
    ctx.translate(-150, -100 + Math.sin(this.time / 40) * 10)
    ctx.drawImage(game.assets.images.you_win, 0, 0)
    /*
    ctx.font = 'italic bold 100px Arial'
    ctx.textAlign = 'center'
    ctx.rotate(-0.05)
    ctx.translate(-6, 6)
    ctx.fillStyle = '#21235B'
    ctx.fillText('You Win!', 0, 0)
    ctx.translate(6, -6)
    ctx.fillStyle = '#02A800'
    ctx.fillText('You Win!', 0, 0)
    */
    ctx.restore()

    ctx.save()
    ctx.translate(game.config.width - 64, game.config.height - 64)
    ctx.font = 'italic 30px Arial'
    ctx.textAlign = 'right'
    ctx.fillStyle = '#88ACEA'
    ctx.globalAlpha = u.map(this.time, 80, 120, 0, u.map(Math.sin(this.time / 10), -1, 1, 0.6, 0.9), true)
    ctx.fillText('Press any button to continue!', 0, 0)
    ctx.restore()
  }
}
