import { assets } from './core/game.js'

export function getLevel(lvl) {
  // Retrieve level data
  const levelList = [
    "intro",
    "swim",
    "shutter",
    "maze",
  ]
  let json = JSON.parse(assets.json[levelList[lvl-1]])

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
    let thing = ret.things[i]
    if (!['player', 'deco'].includes(thing.name)) {
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
    position:[Math.floor(x.position[0]), Math.floor(x.position[1])],
  }})

  return ret
}

