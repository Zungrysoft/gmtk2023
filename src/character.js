import * as game from './core/game.js'
import * as u from './core/utils.js'
import * as soundmanager from './core/soundmanager.js'
import * as gfx from './core/webgl.js'
import * as mat from './core/matrices.js'
import * as vec2 from './core/vector2.js'
import * as vec3 from './core/vector3.js'
import Thing from './core/thing.js'

const typeToSprite = {
  fire: 'player_fire',
  golem: 'player_golem',
  rock: 'player_golem',
  ice: 'player_ice',
  wind: 'player_wind',
  plant: 'player_plant',
}

export default class Character extends Thing {
  sprite = 'player_fire'
  time = 0

  constructor (tileThingReference) {
    super()
    this.tileThingReference = tileThingReference
    this.sprite = typeToSprite[tileThingReference.type]
  }

  update () {
    this.time += 1

    const destination = this.tileThingReference.position.map(x => x * 64 + 32)
    destination[1] -= 16
    this.position = vec2.lerp(this.position, destination, 0.25)
    if (destination[0] < this.position[0]) {
      this.scale[0] = Math.abs(this.scale[0]) * -1
    } else {
      this.scale[0] = Math.abs(this.scale[0])
    }

    const board = game.getThing('board')
    if (board) {
      if (this.tileThingReference === board.getActivePlayer()) {
        game.getCamera2D().position = this.position
      }
    }

    if (this.tileThingReference.dead) { this.dead = true }
  }

  draw () {
    super.draw()
    const { ctx } = game

    const board = game.getThing('board')
    if (board) {
      if (this.tileThingReference.id === board.getNextPlayer()?.id) {
        ctx.save()
        ctx.translate(this.position[0], this.position[1])
        ctx.rotate(this.time / 120)
        const scale = u.map(Math.sin(this.time / 60), -1, 1, 1, 1.25)
        ctx.translate(-64, -64)
        ctx.drawImage(game.assets.images.iconNearest, 0, 0)
        ctx.restore()
      }
    }
  }
}
