import { assets } from './core/game.js'
import * as game from './core/game.js'

export function getLevel(lvl) {
  // Retrieve level data
  let json = JSON.parse(assets.json[lvl] || assets.json["intro"])
  const entry = getLevelList().filter(x => x.level === lvl)[0]

  // Convert from layered format
  let ret = {
    version: 2,
    grid: json.layers[0].grid,
    foliage: json.layers[1].grid,
    things: json.layers[0].things,
    name: entry.name,
    level: entry.level,
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

export function checkPrerequisites(level) {
  for (const prerequisite of level.prerequisites) {
    if (!(game.globals.levelCompletions[prerequisite])) {
      return false
    }
  }
  return true
}

export function getUnlockedLevels() {
  const levels = getLevelList()
  const levelsPerCategory = 3

  // Iterate over levels to check whether they should be unlocked
  let ret = []
  let categoryCounts = {}
  for (const level of levels) {
    // Early exit if the level has been completed; it should obviously be unlocked in that case
    if (game.globals.levelCompletions[level.level]) {
      ret.push(level)
      continue
    }

    // Check category counts
    if (categoryCounts[level.category] >= levelsPerCategory) {
      continue
    }
    categoryCounts[level.category] = (categoryCounts[level.category] || 0) + 1

    // Check level prerequisites
    if (!checkPrerequisites(level)) {
      continue
    }

    // Passed checks; add it to the list
    ret.push(level)
  }

  return ret
}

export function getNextLevel(currentLevel) {
  // Get all levels which are unlocked but not yet completed
  // Also includes the current level so we can reference its index against the candidates
  const candidates = getUnlockedLevels().filter(x => x.level === currentLevel || !(game.globals.levelCompletions[x.level]))

  // Get index of the current level
  const selection = candidates.map(x => x.level).indexOf(currentLevel)

  // First, try to switch to the next unlocked, uncompleted level
  if (selection + 1 < candidates.length) {
    return candidates[selection + 1].level
  }

  // Next, try to switch to the previous unlocked, uncompleted level
  if (selection - 1 >= 0) {
    return candidates[selection - 1].level
  }

  // Return undefined if there are no more levels to complete
  return undefined
}

export function getLevelNumber(level) {
  const categoryMap = {
    'intro': 'A',
    'wind': 'B',
    'ice': 'C',
    'vine': 'D',
    'magnet': 'E',
    'blob': 'F',
    'xray': 'G',
  }

  const category = getLevelList().filter(x => x.level === level)[0]?.category
  if (category) {
    const levelNumber = getLevelList().filter(x => x.category === category).map(x => x.level).indexOf(level)
    return `${categoryMap[category]}${levelNumber+1}`
  }
  else {
    return ""
  }
}
