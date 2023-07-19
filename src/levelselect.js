import * as game from './core/game.js'
import * as u from './core/utils.js'
import * as soundmanager from './core/soundmanager.js'
import * as vec2 from './core/vector2.js'
import Thing from './core/thing.js'
import { getLevelList } from './levelloader.js'
import Board from './board.js'
import TitleScreen from './titlescreen.js'

export default class LevelSelect extends Thing {
  time = -10
  selection = game.globals.level - 1
  menu = getLevelList()
  offsets = this.menu.map(_ => 0)
  selected = false
  fadeout = 0
  scroll = 0
  scrollTarget = 0

  constructor (previousMenu = TitleScreen) {
    super()
    game.setThingName(this, 'levelselect')
    this.preivousMenu = previousMenu
    for (const thing of game.getThings()) {
      if (thing !== this) {
        thing.dead = true
      }
    }
    game.addThing(new Board())
    game.getThing('board').movementDisabled = true
    this.snapCamera()
  }

  snapCamera () {
    game.getCamera2D().position = [...game.getThing('playercharacter').position]
    game.getCamera2D().position[0] -= 350
  }

  update () {
    this.updateTimers()
    this.time += 1
    this.scroll = u.lerp(this.scroll, this.scrollTarget, 0.25)

    if (game.assets.sounds.title_music.paused) {
      soundmanager.playMusic('title_music', 0.125)
    }

    if (this.timers.fadeout) {
      const pos = game.getThing('playercharacter').position
      game.getCamera2D().position = vec2.lerp(game.getCamera2D().position, pos, 0.25)
    }

    if (this.time > 10) {
      if (game.keysPressed.Space || game.keysPressed.Enter || game.buttonsPressed[0]) {
        if (!this.selected) {
          this.after(20, () => { this.dead = true; game.resetScene() }, 'fadeout')
          soundmanager.playSound('wind', 0.1, [0.75, 0.85])
        }
        this.selected = true
      }
    }
    if (this.selected) return

    const lastSelection = this.selection
    if (game.keysPressed.ArrowUp || game.keysPressed.KeyW || game.buttonsPressed[12]) {
      this.selection = u.mod((this.selection - 1), this.menu.length)
    }
    if (game.keysPressed.ArrowDown || game.keysPressed.KeyS || game.buttonsPressed[13]) {
      this.selection = u.mod((this.selection + 1), this.menu.length)
    }

    if (this.selection !== lastSelection) {
      soundmanager.playSound('menu_move', 0.2)
      for (const thing of game.getThings()) {
        if (thing !== this) {
          thing.dead = true
        }
      }
      game.globals.level = this.selection + 1
      game.addThing(new Board())
      game.getThing('board').movementDisabled = true
      this.snapCamera()
    }

    const scrollStart = 8
    // if (this.selection >= scrollStart) {
    //   this.scrollTarget = this.selection - scrollStart
    // }
    this.scrollTarget = Math.max(0, this.selection - scrollStart)

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
      //ctx.translate(u.squareMap(this.timer('fadeout'), 0, 1, 0, -800, true), 0)
    }
    ctx.fillRect(0, 0, game.config.width, game.config.height)
    ctx.restore()

    ctx.save()
    ctx.fillStyle = '#21235B'
    //ctx.globalAlpha = u.map(this.time, 0, 10, 0, 1, true)
    ctx.translate(slideIn, 0)
    if (this.timers.fadeout) {
      //ctx.globalAlpha = u.map(this.timer('fadeout'), 0, 1, 1, 0, true)
      ctx.translate(u.squareMap(this.timer('fadeout'), 0, 1, 0, -800, true), 0)
    }
    ctx.fillRect(0, 0, 700, game.config.height)
    ctx.restore()

    ctx.save()
    //ctx.globalAlpha = u.squareMap(this.time, 0, 30, 0, 1, true)
    ctx.translate(slideIn, 0)
    ctx.translate(128, 128)
    ctx.font = 'italic bold 32px Arial'
    ctx.textAlign = 'left'
    for (let i = 0; i < this.menu.length; i += 1) {
      ctx.save()
      if (this.timers.fadeout) {
        //if (i === this.selection) {
          //ctx.globalAlpha = 1
        //} else {
          //ctx.globalAlpha = u.map(this.timer('fadeout'), 0, 1, 1, 0, true)
          ctx.translate(u.squareMap(this.timer('fadeout'), 0, 1, 0, -800, true), 0)
        //}
      }
      ctx.translate(0, i * 48)
      ctx.translate(0, this.scroll * -48)

      const checkbox = game.globals.levelCompletions[i + 1] ? 'checkbox_checked' : 'checkbox_unchecked'
      ctx.drawImage(game.assets.images[checkbox], -80, -48)

      ctx.save()
      ctx.translate(this.offsets[i] * 48, 0)
      const factor = Math.min(this.offsets[i], 1)
      ctx.translate(u.lerp(0, Math.cos(this.time / 51) * 4, factor), u.lerp(0, Math.sin(this.time / 30) * 4, factor))
      const levelName = `Level ${i + 1}: ${this.menu[i].name}`
      ctx.fillStyle = '#21235B'
      ctx.fillText(levelName, 0, 0)
      ctx.fillStyle = 'white'
      ctx.fillText(levelName, 4, -4)
      ctx.restore()

      ctx.restore()
    }
    ctx.restore()

    ctx.save()
    ctx.fillStyle = '#21235B'
    //ctx.globalAlpha = u.map(this.time, 0, 10, 0, 1, true)
    ctx.translate(slideIn, 0)
    if (this.timers.fadeout) {
      //ctx.globalAlpha = u.map(this.timer('fadeout'), 0, 1, 1, 0, true)
      ctx.translate(u.squareMap(this.timer('fadeout'), 0, 1, 0, -800, true), 0)
    }
    //ctx.globalAlpha = ctx.globalAlpha ** 2
    ctx.fillRect(0, 0, 700, 90)
    ctx.restore()

    ctx.save()
    //ctx.globalAlpha = u.map(this.time, 0, 10, 0, 1, true)
    ctx.translate(slideIn, 0)
    if (this.timers.fadeout) {
      //ctx.globalAlpha = u.map(this.timer('fadeout'), 0, 1, 1, 0, true)
      ctx.translate(u.squareMap(this.timer('fadeout'), 0, 1, 0, -800, true), 0)
    }
    ctx.fillStyle = 'white'
    ctx.font = 'italic bold 48px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('Level Select', 350, 60)
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

    /*
    ctx.save()
    ctx.translate(64, game.config.height - 64)
    ctx.font = 'italic 24px Arial'
    ctx.textAlign = 'left'
    ctx.fillStyle = 'white'
    ctx.globalAlpha = u.map(this.time, 0, 30, 0, u.map(Math.sin(this.time / 10), -1, 1, 0.6, 0.9), true)
    if (this.fadeout > 0) {
      ctx.globalAlpha = u.map(this.fadeout, 0, 1, 1, 0, true)
    }
    ctx.fillText('Press shift to go back.', 0, 0)
    ctx.restore()
    */
  }
}
