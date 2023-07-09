import * as game from './core/game.js'
import * as u from './core/utils.js'
import * as soundmanager from './core/soundmanager.js'
import * as gfx from './core/webgl.js'
import * as mat from './core/matrices.js'
import * as vec2 from './core/vector2.js'
import * as vec3 from './core/vector3.js'
import Thing from './core/thing.js'
import { levelList, getLevel } from './levelloader.js'
import LevelSelect from './levelselect.js'

export default class PauseMenu extends Thing {
  time = 0
  selection = 0
  menu = ['Resume', 'Restart', 'Exit & Switch Level']
  offsets = this.menu.map(_ => 0)
  selected = false
  fadeout = 0

  constructor () {
    super()
    game.setThingName(this, 'pausemenu')
    game.getThing('board').movementDisabled = true
    //this.snapCamera()
  }

  snapCamera () {
    game.getCamera2D().position = [...game.getThing('playercharacter').position]
    game.getCamera2D().position[0] -= 350
  }

  update () {
    this.updateTimers()
    this.time += 1
    this.scroll = u.lerp(this.scroll, this.scrollTarget, 0.25)

    if (game.keysPressed.Escape) {
      this.selection = 0
      this.offsets = this.menu.map(_ => 0)
      this.offsets[0] = 1
    }

    if (this.time > 10) {
      if (game.keysPressed.Space || game.keysPressed.Enter || game.buttonsPressed[0] || game.keysPressed.Escape) {
        if (!this.selected) {
          let callback = () => { this.dead = true; game.getThing('board').movementDisabled = false }
          if (this.selection === 1) {
            callback = () => { this.dead = true; game.resetScene() }
          }
          if (this.selection === 2) {
            callback = () => { this.dead = true; game.addThing(new LevelSelect()) }
          }
          this.after(20, callback, 'fadeout')
          soundmanager.playSound('menu_ok', 0.1, [0.75, 0.85])
        }
        this.selected = true
      }
    }
    if (this.selected) return

    const lastSelection = this.selection
    if (game.keysPressed.ArrowUp || game.keysPressed.KeyW || game.buttonsPressed[12]) {
      this.selection = Math.max(0, this.selection - 1)
    }
    if (game.keysPressed.ArrowDown || game.keysPressed.KeyS || game.buttonsPressed[13]) {
      this.selection = Math.min(this.menu.length - 1, this.selection + 1)
    }
    if (this.selection !== lastSelection) {
      soundmanager.playSound('menu_move', 0.2)
    }

    for (let i = 0; i < this.menu.length; i += 1) {
      if (this.selection === i) {
        this.offsets[i] = u.lerp(this.offsets[i], 1, 0.25)
      } else {
        this.offsets[i] = u.lerp(this.offsets[i], 0, 0.2)
      }
    }
  }

  postDraw () {
    const { ctx } = game
    const slideIn = u.squareMap(this.time, -10, 10, -800, 0, true)
    ctx.save()
    ctx.fillStyle = '#21235B'
    ctx.globalAlpha = 0.45
    if (this.timers.fadeout) {
      ctx.globalAlpha = u.map(this.timer('fadeout'), 0, 1, 0.45, 0, true)
    }
    ctx.fillRect(0, 0, game.config.width, game.config.height)
    ctx.restore()

    ctx.save()
    ctx.globalAlpha = u.squareMap(this.time, 0, 30, 0, 1, true)
    ctx.translate(game.config.width / 2 - 100, 360)
    ctx.font = 'italic bold 32px Arial'
    ctx.textAlign = 'left'
    for (let i = 0; i < this.menu.length; i += 1) {
      ctx.save()
      if (this.timers.fadeout) {
        if (i === this.selection) {
          ctx.globalAlpha = 1
        } else {
          ctx.globalAlpha = u.map(this.timer('fadeout'), 0, 1, 1, 0, true)
        }
      }
      ctx.translate(0, i * 48)

      ctx.save()
      ctx.translate(this.offsets[i] * 48, 0)
      const factor = Math.min(this.offsets[i], 1)
      ctx.translate(u.lerp(0, Math.cos(this.time / 51) * 4, factor), u.lerp(0, Math.sin(this.time / 30) * 4, factor))
      const levelName = this.menu[i]
      ctx.fillStyle = '#21235B'
      ctx.fillText(levelName, 0, 0)
      ctx.fillStyle = 'white'
      ctx.fillText(levelName, 4, -4)
      ctx.restore()

      ctx.restore()
    }
    ctx.restore()

    ctx.save()
    ctx.globalAlpha = u.map(this.time, 0, 10, 0, 1, true)
    //ctx.translate(slideIn, 0)
    if (this.timers.fadeout) {
      ctx.globalAlpha = u.map(this.timer('fadeout'), 0, 1, 1, 0, true)
    }
    ctx.fillStyle = 'white'
    ctx.font = 'italic bold 48px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('Paused', game.config.width / 2, 300)
    ctx.restore()

    ctx.save()
    ctx.translate(game.config.width - 64, game.config.height - 64)
    ctx.font = 'italic 24px Arial'
    ctx.textAlign = 'right'
    ctx.fillStyle = 'white'
    ctx.globalAlpha = u.map(this.time, 0, 30, 0, u.map(Math.sin(this.time / 10), -1, 1, 0.6, 0.9), true)
    if (this.timers.fadeout) {
      ctx.globalAlpha = u.map(this.timer('fadeout'), 0, 1, 1, 0, true)
    }
    ctx.fillText('Press space to select!', 0, 0)
    ctx.restore()
  }
}