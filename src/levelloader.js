import { assets } from './core/game.js'

export let levelList = [
  { name: 'Baby\'s First Mind Control', level: 'intro' },
  { name: 'Four Square', level: 'four' },
  { name: 'Double Trouble', level: 'fire' },
  { name: 'Fountain of Flame', level: 'fountain' },
  { name: 'Riverway', level: 'cove' },
  { name: 'Box Bridge', level: 'distance' },
  { name: 'Air Ride', level: 'bird' },
  { name: 'Island Access', level: 'islets' },
  { name: 'Dodge and Burn', level: 'dodging' },
  { name: 'Going For a Swim', level: 'swim' },
  { name: 'Far Out', level: 'safety' },
  { name: 'Hop Across', level: 'islands' },
  { name: 'Rockoban', level: 'sokoban' },
  { name: 'Over the Seas', level: 'boat' },
  { name: 'Tight Squeeze', level: 'corridors2' },
  { name: 'Cavern Lake', level: 'lake' },
  { name: 'Windy Day', level: 'windy' },
  { name: 'Take the Ferry', level: 'ferry' },
  { name: 'The Frosty Shuffle', level: 'iceshuffle2' },
  { name: 'Mineral Transport', level: 'windwall' },
  { name: 'Corners', level: 'corners' },
  { name: 'Alongside the Maze', level: 'maze' },
  { name: 'Wall of Thorns', level: 'blocking' },
  { name: 'Special Delivery', level: 'snowblower' },
  { name: 'Crossway', level: 'vine' },
  { name: 'Open and Shut', level: 'shutter' },
  { name: 'Icebox', level: 'icecrawl' },
  { name: 'Rocky River', level: 'icerace' },
  { name: 'Repotting', level: 'vineice' },
  { name: 'The Great Wall', level: 'vinewall' },
  { name: 'Carnivorous Cove', level: 'swamp' },
  { name: 'Roundabout', level: 'big' },
  { name: 'An Eerie Resemblance', level: 'blob' },
  { name: 'Staring Contest', level: 'twoblobs' },
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
    if (!['player', 'deco', 'goal', 'sign', 'mine'].includes(thing.name)) {
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

