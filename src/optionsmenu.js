import * as game from './core/game.js'
import * as u from './core/utils.js'
import * as soundmanager from './core/soundmanager.js'
import Thing from './core/thing.js'
import PauseMenu from './pausemenu.js'

const globals = game.globals

export default class OptionsMenu extends Thing {
  time = 0
  selection = 0
  menu = [
    globals.musicOn ? 'Music: ON' : 'Music OFF',
    globals.soundOn ? 'Sound: ON' : 'Music OFF',
    //'Delete Save Data',
    'Back'
  ]
  offsets = this.menu.map(_ => 0)
  selected = false
  fadeout = 0
  depth = 10000

  constructor () {
    super()
    game.setThingName(this, 'optionsmenu')
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

    if (game.keysPressed.Escape || game.keysPressed.Backspace || game.buttonsPressed[8] || game.buttonsPressed[9]) {
      this.selection = this.menu.length-1
      this.offsets = this.menu.map(_ => 0)
      this.offsets[this.menu.length-1] = 1
    }

    if (this.time > 10) {
      if (game.keysPressed.Space || game.keysPressed.Enter || game.buttonsPressed[0] || game.keysPressed.Escape || game.keysPressed.Backspace || game.buttonsPressed[8] || game.buttonsPressed[9]) {
        if (!this.selected) {
          let callback = () => {
            globals.musicOn = !globals.musicOn
            soundmanager.setMusicVolume(globals.musicOn ? 1 : 0)
            this.menu[0] = globals.musicOn ? 'Music: ON' : 'Music: OFF'
          }
          if (this.selection === 1) {
            callback = () => {
              globals.soundOn = !globals.soundOn
              soundmanager.setSoundVolume(globals.soundOn ? 1 : 0)
              this.menu[1] = globals.soundOn ? 'Sound: ON' : 'Sound: OFF'
            }
          }
          /*
          if (this.selection === 2) {
            callback = () => {
              globals.levelCompletions = []
              for (let i = 0; i < game.globals.levelCount; i++) {
                game.globals.levelCompletions.push(false)
              }
            }
            localStorage.levelCompletions = JSON.stringify(game.globals.levelCompletions)
          }
          */
          if (this.selection === 2) {
            this.dead = true
            game.addThing(new PauseMenu())
            this.selected = true
          }
          this.after(this.selection === 3 ? 20 : 1, callback, 'fadeout')
          soundmanager.playSound('menu_ok', 0.1, [0.75, 0.85])
        }
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
      ctx.fillText(levelName, 3, -3)
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
    ctx.fillText('Options', game.config.width / 2, 300)
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
