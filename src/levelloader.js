import { assets } from './core/game.js'

export let levelList = [
  { name: 'Baby\'s First Mind Control', level: 'intro' },
  { name: 'Four Square', level: 'four' },
  { name: 'Double Trouble', level: 'fire' },
  { name: 'Fountain of Flame', level: 'fountain' },
  { name: 'Riverway', level: 'cove' },
  { name: 'Box Bridge', level: 'distance' },
  { name: 'Sewers', level: 'sewers' },
  { name: 'Blazing Trails', level: 'dodging3' },
  { name: 'Air Ride', level: 'bird' },
  { name: 'Island Access', level: 'islets' },
  { name: 'Dodge and Burn', level: 'dodging' },
  { name: 'Going For a Swim', level: 'swim' },
  { name: 'Coming Your Way!', level: 'warehouse' },
  { name: 'Far Out', level: 'safety' },
  { name: 'Hop Across', level: 'islands' },
  { name: 'Wind Blocker', level: 'doublestack' },
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
  { name: 'Snow Maze', level: 'snowmaze' },
  { name: 'Crossway', level: 'vine' },
  { name: 'Open and Shut', level: 'shutter' },
  { name: 'Icebox', level: 'icecrawl' },
  { name: 'Rocky River', level: 'icerace' },
  { name: 'Repotting', level: 'vineice' },
  { name: 'Snow Maze II', level: 'snowmaze2' },
  { name: 'Weed Control', level: 'vinewall' },
  { name: 'Sorting Stack', level: 'sorting' },
  { name: 'Carnivorous Cove', level: 'swamp' },
  { name: 'Roundabout', level: 'big' },
  { name: 'An Eerie Resemblance', level: 'blob' },
  { name: 'Pusher Protector', level: 'shielding' },
  { name: 'Candelabra', level: 'preplaced' },
  { name: 'The Horseshoe', level: 'blobchain' },
  { name: 'One of the School', level: 'blobfish' },
  { name: 'Baths of Enigma', level: 'blobvine' },
  { name: 'The Divider', level: 'blobice' },
  { name: 'Staring Contest', level: 'twoblobs' },
  { name: 'My Hobby', level: 'magnetintro' },
  { name: 'Magnetic Vacuum', level: 'vacuum' },
  { name: 'Firesnake Island', level: 'magnetfire' },
  { name: 'Metal Maze', level: 'metalmaze' },
  { name: 'Ring of Fire', level: 'magnetwind2' },
  { name: 'Carry-On Luggage', level: 'magnetwind' },
  { name: 'Cul-de-sacs', level: 'hallways' },
]

export function getLevel(lvl) {
  // Retrieve level data
  let json = JSON.parse(assets.json[levelList[lvl-1].level || "intro"])

  // Convert from layered format
  let ret = {
    version: 1,
    grid: json.layers[0].grid,
    foliage: json.layers[1].grid,
    things: json.layers[0].things,
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
    id: ++ curId,
    position: [Math.floor(x.position[0]), Math.floor(x.position[1])],
  }})

  return ret
}

