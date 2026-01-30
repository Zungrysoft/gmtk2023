import * as game from './core/game.js'
import * as u from './core/utils.js'
import * as soundmanager from './core/soundmanager.js'
import * as vec2 from './core/vector2.js'
import Thing from './core/thing.js'
import { getLevelMap, getLevelName, getNumberOfKeys, hasFoundAnyKeys } from './levelloader.js'
import Board from './board.js'
import TitleScreen from './titlescreen.js'

export default class LevelSelect extends Thing {
  time = -10
  position = [0, 0]
  selectorPosition = [0, 0]
  menu = []
  selected = false
  fadeout = 0
  scroll = 0
  scrollTarget = 0

  constructor (previousMenu = TitleScreen) {
    super()
    this.reloadMap();
    for (const level of this.levels) {
      if (level.level === game.globals.level) {
        this.position = level.position;
        this.selectorPosition = this.position;
      }
    }
    game.setThingName(this, 'levelselect')
    this.previousMenu = previousMenu
    for (const thing of game.getThings()) {
      if (thing !== this) {
        thing.dead = true
      }
    }
    this.loadLevel();
  }

  loadLevel() {
    if (game.globals.level) {
      game.addThing(new Board())
      game.getThing('board').movementDisabled = true
      this.snapCamera()
    }
  }

  reloadMap() {
    this.levels = getLevelMap().levels;
  }

  snapCamera () {
    game.getCamera2D().position = [...game.getThing('playercharacter').position]
    game.getCamera2D().position[0] -= 350
  }

  update () {
    this.updateTimers()
    this.time += 1
    this.scroll = u.lerp(this.scroll, this.scrollTarget, 0.25)
    this.selectorPosition = vec2.lerp(this.selectorPosition, this.position, 0.25);

    if (game.assets.sounds.title_music.paused) {
      soundmanager.playMusic('title_music', 0.125)
    }

    if (this.timers.fadeout) {
      const pos = game.getThing('playercharacter').position
      game.getCamera2D().position = vec2.lerp(game.getCamera2D().position, pos, 0.25)
    }

    if (this.time > 10 && game.globals.level) {
      if (game.keysPressed.Space || game.keysPressed.Enter || game.buttonsPressed[0]) {
        if (!this.selected) {
          this.after(20, () => { this.dead = true; game.resetScene() }, 'fadeout')
          soundmanager.playSound('wind', 0.1, [0.75, 0.85])
        }
        this.selected = true
      }
    }
    if (this.selected) return

    const lastPosition = this.position
    if (game.keysPressed.ArrowUp || game.keysPressed.KeyW || game.buttonsPressed[12]) {
      this.tryToMove([0, -1]);
    }
    if (game.keysPressed.ArrowDown || game.keysPressed.KeyS || game.buttonsPressed[13]) {
      this.tryToMove([0, 1]);
    }
    if (game.keysPressed.ArrowLeft || game.keysPressed.KeyA || game.buttonsPressed[11]) {
      this.tryToMove([-1, 0]);
    }
    if (game.keysPressed.ArrowRight || game.keysPressed.KeyD || game.buttonsPressed[10]) {
      this.tryToMove([1, 0]);
    }

    if (!vec2.equals(lastPosition, this.position)) {
      soundmanager.playSound('menu_move', 0.2)
      for (const thing of game.getThings()) {
        if (thing !== this) {
          thing.dead = true
        }
      }
      for (const level of this.levels) {
        if (vec2.equals(this.position, level.position)) {
          game.globals.level = level.level
          break;
        }
      }
      this.loadLevel();
    }

    const scrollStart = 6
    this.scrollTarget = Math.max(0, this.position[1] - scrollStart)
  }

  tryToMove(offset) {
    const desiredPosition = vec2.add(this.position, offset);
    for (const level of this.levels) {
      if (vec2.equals(level.position, desiredPosition)) {
        if (level.isKey) {
          game.globals.keysObtained[level.keyName] = true
          localStorage.keysObtained = JSON.stringify(game.globals.keysObtained)
        }
        else if (level.isLock) {
          if (getNumberOfKeys() >= (level.lockCount ?? 1)) {
            game.globals.locksOpened[level.lockName] = true
            localStorage.locksOpened = JSON.stringify(game.globals.locksOpened)
            this.reloadMap();
          }
        }
        else if (level.isPath) {
          this.tryToMove(vec2.add(offset, vec2.normalize(offset)));
        }
        else {
          this.position = desiredPosition;
        }
        break;
      }
    }

    // Failed move
    // Failure sound and animation
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
    ctx.translate(350, 128)
    ctx.font = 'italic bold 32px Arial'
    ctx.textAlign = 'center'
    

    ctx.save()
    if (this.timers.fadeout) {
      ctx.translate(u.squareMap(this.timer('fadeout'), 0, 1, 0, -800, true), 0)
    }
    ctx.translate(...vec2.scale(this.selectorPosition, 48))
    ctx.translate(0, this.scroll * -48)
    ctx.drawImage(game.assets.images.levelmap_select, -32, -32)
    ctx.restore()

    for (let i = 0; i < this.levels.length; i += 1) {
      ctx.save()
      if (this.timers.fadeout) {
        ctx.translate(u.squareMap(this.timer('fadeout'), 0, 1, 0, -800, true), 0)
      }
      ctx.translate(...vec2.scale(this.levels[i].position, 48))
      ctx.translate(0, this.scroll * -48)

      let icon = 'levelmap_incomplete';
      let dontDraw = false;
      if (this.levels[i].isKey) {
        icon = 'levelmap_key';
        if (game.globals.keysObtained[this.levels[i].keyName]) {
          dontDraw = true;
        }
        ctx.translate(0, Math.sin(this.time / 15) * 6)
      }
      if (this.levels[i].isLock) {
        icon = 'levelmap_lock';
      }
      else if (this.levels[i].isPath) {
        icon = 'levelmap_path';
      }
      else if (game.globals.levelCompletions[this.levels[i].level]) {
        icon = 'levelmap_level';
      }
      if (!dontDraw) {
        ctx.drawImage(game.assets.images[icon], -32, -32)
      }

      ctx.restore()
    }

    ctx.restore()

    ctx.save()
    ctx.translate((game.config.width - 700) / 2 + 700, 60)
    const levelName = getLevelName(game.globals.level)
    ctx.font = 'italic bold 32px Arial'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#21235B'
    ctx.fillText(levelName, 0, 0)
    ctx.fillStyle = 'white'
    ctx.fillText(levelName, 4, -4)
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

    if (hasFoundAnyKeys()) {
      ctx.save()
      //ctx.globalAlpha = u.map(this.time, 0, 10, 0, 1, true)
      ctx.translate(slideIn, 0)
      if (this.timers.fadeout) {
        //ctx.globalAlpha = u.map(this.timer('fadeout'), 0, 1, 1, 0, true)
        ctx.translate(u.squareMap(this.timer('fadeout'), 0, 1, 0, -800, true), 0)
      }
      ctx.fillStyle = 'white'
      ctx.font = 'italic bold 32px Arial'
      ctx.textAlign = 'right'
      ctx.fillText(getNumberOfKeys(), 700 - 58, 50)
      ctx.drawImage(game.assets.images.levelmap_key, 700 - 64, 10)
      ctx.restore()
    }

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
