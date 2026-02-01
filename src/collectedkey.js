import * as game from './core/game.js'
import * as u from './core/utils.js'
import * as soundmanager from './core/soundmanager.js'
import * as gfx from './core/webgl.js'
import * as mat from './core/matrices.js'
import * as vec2 from './core/vector2.js'
import * as vec3 from './core/vector3.js'
import Thing from './core/thing.js'
import { KEY_COLLECT_ANIMATION_DURATION } from './levelselect.js'

export default class CollectedKey extends Thing {
  sprite = 'levelmap_key'
  time = 0
  liveTime = 200
  depth = 40
  isPartOfLevelSelect = true

  constructor (position, velocity, destination) {
    super();
    this.position = [...position];
    this.velocity = [...velocity];
    this.destination = destination;
    this.rvel = 0.14;
    soundmanager.playSound('collect_key_1', 0.5, 1.0);
  }

  update () {
    this.time += 1;

    // Kill if close
    if (
      this.time > this.liveTime ||
      vec2.distance(this.position, this.destination) < Math.max(vec2.magnitude(this.velocity) * 2, 64)
    ) {
      this.dead = true;
      game.getThing('levelselect').keyCollectedTime = KEY_COLLECT_ANIMATION_DURATION;
      game.getThing('levelselect').displayKeys ++;
      soundmanager.playSound('collect_key_2', 0.5, 1.2);
    }

    // Rotation and rotation friction
    this.rotation += this.rvel;
    this.rvel *= 0.995;

    // Velocity and friction
    this.position = vec2.add(this.position, this.velocity);
    this.velocity = vec2.scale(this.velocity, 0.96);

    // Gravity
    const gravityOffset = vec2.subtract(this.destination, this.position);
    this.velocity = vec2.add(this.velocity, vec2.scale(gravityOffset, 0.002));
  }

  postDraw () {
    const { ctx } = game;
    ctx.save();
    super.draw();
    ctx.restore();
  }
}
