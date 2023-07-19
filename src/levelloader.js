import { assets } from './core/game.js'

export function getLevel(lvl) {
  // Retrieve level data
  let json = JSON.parse(assets.json[getLevelList()[lvl-1].level || "intro"])

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

let levelList = undefined
export function getLevelList() {
  if (!levelList) {
    levelList = JSON.parse(assets.json.levelList)
  }
  return levelList
}
