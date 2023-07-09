import { assets } from './core/game.js'

export let levelList = [
  { name: 'Baby\'s first mind control', level: 'intro' },
  { name: 'Going For a Swim', level: 'swim' },
  { name: 'Dodge and Burn', level: 'dodging' },
  { name: 'Tiny Islets', level: 'islets' },
  { name: 'Rockoban', level: 'sokoban' },
  { name: 'One-Guy Mission', level: 'islands' },
  { name: 'Alongside the Maze', level: 'maze' },
  { name: 'Windy Day', level: 'windy' },
  { name: 'An Early Christmas', level: 'snowman' },
  { name: 'Wall of Thorns', level: 'blocking' },
  { name: 'Crossway', level: 'vine' },
  { name: 'Corners', level: 'corners' },
  { name: 'Carnivorous Cove', level: 'swamp' },
  { name: 'Open and Shut', level: 'shutter' },
  { name: 'Roundabout', level: 'big' },
]

export function getLevel(lvl) {
  // Retrieve level data
  let json = JSON.parse(assets.json[levelList[lvl-1].level || "intro"])

  // Merge layers together
  let ret = {
    version: 1,
    grid: {},
    things: [],
  }
  for (const layer of json.layers) {
    // Append things
    ret.things.push(...(layer.things))

    // Merge grid
    for (const coords in layer.grid) {
      // If this chunk has already been copied over from a previous layer, merge this one over that one
      if (coords in ret.grid) {
        for (let i = 0; i < 64*64; i ++) {
          if (layer.grid[coords][i] > 0) {
            ret.grid[coords][i] = layer.grid[coords][i]
          }
        }
      }
      // If this chunk doesn't already exist, just copy it over
      else {
        ret.grid[coords] = layer.grid[coords]
      }
    }
  }

  // To make things easier in the editor, convert unknown entities to deco
  for (let i = 0; i < ret.things.length; i ++) {
    const thing = ret.things[i]
    if (!['player', 'deco', 'goal'].includes(thing.name)) {
      thing.data.type = thing.name
      thing.name = 'deco'
    }
  }

  // Reformat things to move position to integer and add id
  let curId = 0
  ret.things = ret.things.map((x) => {return {
    ...x.data,
    name: x.name,
    id: curId ++,
    position: [Math.floor(x.position[0]), Math.floor(x.position[1])],
  }})

  return ret
}

