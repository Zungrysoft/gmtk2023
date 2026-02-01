import * as game from './core/game.js'
import * as u from './core/utils.js'
import * as soundmanager from './core/soundmanager.js'
import * as gfx from './core/webgl.js'
import * as mat from './core/matrices.js'
import * as vec2 from './core/vector2.js'
import * as vec3 from './core/vector3.js'
import Thing from './core/thing.js'
import { KEY_COLLECT_ANIMATION_DURATION } from './levelselect.js'

export default class LockFragment extends Thing {
  sprite = 'levelmap_lock_fragment'
  time = 0
  liveTime = 200
  depth = 40
  isPartOfLevelSelect = true

  constructor (position) {
    super();
    this.position = [...position];
    this.velocity = [
      u.map(Math.random(), 0, 1, -3.5, 3.5),
      u.map(Math.random(), 0, 1, -5, -9),
    ];
    this.rvel = u.map(Math.random(), 0, 1, -0.3, 0.3);
  }

  update () {
    this.time += 1;

    // Kill if lived too long
    if (this.time > this.liveTime) {
      this.dead = true;
    }

    // Rotation and rotation friction
    this.rotation += this.rvel;
    this.rvel *= 0.995;

    // Velocity and gravity
    this.position = vec2.add(this.position, this.velocity);
    this.velocity[1] += 0.55;
  }

  postDraw () {
    const { ctx } = game;
    ctx.save();
    super.draw();
    ctx.restore();
  }
}
