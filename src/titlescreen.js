import * as game from './core/game.js'
import * as u from './core/utils.js'
import * as soundmanager from './core/soundmanager.js'
import * as gfx from './core/webgl.js'
import * as mat from './core/matrices.js'
import * as vec2 from './core/vector2.js'
import * as vec3 from './core/vector3.js'
import Thing from './core/thing.js'
import LevelSelect from './levelselect.js'

export default class TitleScreen extends Thing {
  time = -10

  constructor () {
    super()
    game.setThingName(this, 'titlescreen')
    game.getThing('board').movementDisabled = true
    game.getCamera2D().position = [...game.getThing('playercharacter').position]
  }

  update () {
    if (game.assets.sounds.title_music.paused) {
      soundmanager.playMusic('title_music', 0.125)
    }
    this.time += 1
    this.updateTimers()
    if (this.time > 30) {
      if ((game.keysPressed.Space || game.keysPressed.Enter || game.buttonsPressed[0]) && !this.timers.transition) {
        this.selected = true
        this.after(20, () => { this.dead = true; game.addThing(new LevelSelect()) }, 'transition')
        soundmanager.playSound('menu_ok', 0.2)
      }
      //if (Object.keys(game.keysPressed).length > 0 || Object.keys(game.buttonsPressed).length > 0) {
        //game.resetScene()
        //this.dead = true
        //game.addThing(new LevelSelect())
      //}
    }
    if (this.timers.transition) {
      const pos = game.getThing('playercharacter').position
      const target = [pos[0] - 350, pos[1]]
      game.getCamera2D().position = vec2.lerp(game.getCamera2D().position, target, 0.25)
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
    ctx.globalAlpha = u.squareMap(this.time, 0, 30, 0, 1, true)
    if (this.timers.transition) {
      ctx.globalAlpha = u.squareMap(this.timer('transition'), 0, 0.25, 1, 0, true)
    }
    //ctx.translate(256 + 64, 180)
    ctx.translate(game.config.width / 2, game.config.height / 2 - 140)
    ctx.translate(-225, -100 + Math.sin(this.time / 40) * 10)
    ctx.drawImage(game.assets.images.title, 0, 0)
    ctx.restore()

    ctx.save()
    //ctx.translate(game.config.width - 64, game.config.height - 64)
    ctx.translate(game.config.width / 2, game.config.height / 2 + 75)
    ctx.font = 'italic 28px Arial'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'white'
    ctx.globalAlpha = u.map(this.time, 80, 120, 0, u.map(Math.sin(this.time / 15), -1, 1, 0.8, 1), true)
    if (this.timers.transition) {
      ctx.globalAlpha = u.squareMap(this.timer('transition'), 0, 0.25, 1, 0, true)
    }
    ctx.fillText('Press space to start!', 0, 0)
    ctx.restore()
  }
}
