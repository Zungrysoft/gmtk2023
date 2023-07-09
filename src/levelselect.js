import * as game from './core/game.js'
import * as u from './core/utils.js'
import * as soundmanager from './core/soundmanager.js'
import * as gfx from './core/webgl.js'
import * as mat from './core/matrices.js'
import * as vec2 from './core/vector2.js'
import * as vec3 from './core/vector3.js'
import Thing from './core/thing.js'
import { levelList, getLevel } from './levelloader.js'
import Board from './board.js'

export default class LevelSelect extends Thing {
  time = -10
  selection = 0
  menu = levelList
  offsets = this.menu.map(_ => 0)
  selected = false
  fadeout = 0

  constructor () {
    super()
    game.setThingName(this, 'levelselect')
    game.getThing('board').movementDisabled = true
  }

  update () {
    this.time += 1
    if (this.selected) {
      this.offsets[this.selection] += 2
      this.fadeout += 0.1
      if (this.fadeout > 1) {
        game.resetScene()
      }
      return
    }
    if (this.time > 10) {
      if (game.keysPressed.Space || game.buttonsPressed[0]) {
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
      game.getThing('board').dead = true
      game.globals.level = this.selection + 1
      game.addThing(new Board())
      game.getThing('board').movementDisabled = true
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
    ctx.save()
    ctx.fillStyle = '#21235B'
    ctx.globalAlpha = 0.45
    if (this.fadeout > 0) {
      ctx.globalAlpha = u.map(this.fadeout, 0, 1, 1, 0, true)
    }
    ctx.fillRect(0, 0, game.config.width, game.config.height)
    ctx.restore()

    ctx.save()
    ctx.globalAlpha = u.squareMap(this.time, 0, 30, 0, 1, true)
    ctx.translate(game.config.width / 2 - 200, 128)
    ctx.font = 'italic bold 32px Arial'
    ctx.textAlign = 'left'
    for (let i = 0; i < this.menu.length; i += 1) {
      ctx.save()
      if (this.fadeout > 0) {
        if (i === this.selection) {
          ctx.globalAlpha = 1
        } else {
          ctx.globalAlpha = u.map(this.fadeout, 0, 1, 1, 0, true)
        }
      }
      ctx.translate(this.offsets[i] * 48, i * 48)
      const factor = Math.min(this.offsets[i], 1)
      ctx.translate(u.lerp(0, Math.cos(this.time / 51) * 4, factor), u.lerp(0, Math.sin(this.time / 30) * 4, factor))
      const levelName = `Level ${i}: ${this.menu[i].name}`
      ctx.fillStyle = '#21235B'
      ctx.fillText(levelName, 0, 0)
      ctx.fillStyle = 'white'
      ctx.fillText(levelName, -4, -4)
      ctx.restore()
    }
    ctx.restore()

    ctx.save()
    ctx.translate(game.config.width - 64, game.config.height - 64)
    ctx.font = 'italic 30px Arial'
    ctx.textAlign = 'right'
    ctx.fillStyle = 'white'
    ctx.globalAlpha = u.map(this.time, 0, 30, 0, u.map(Math.sin(this.time / 10), -1, 1, 0.6, 0.9), true)
    if (this.fadeout > 0) {
      ctx.globalAlpha = u.map(this.fadeout, 0, 1, 1, 0, true)
    }
    ctx.fillText('Press space to select!', 0, 0)
    ctx.restore()
  }
}
