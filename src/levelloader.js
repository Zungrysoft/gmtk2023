import { assets } from './core/game.js'
import * as game from './core/game.js'
import * as vec2 from './core/vector2.js'

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
    levelList = JSON.parse(assets.json.levelMap).levels.filter(x => !x.isPath && !x.isLock && !x.isKey);
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

export function getNextLevel(currentLevel) {
  // Get all levels which are unlocked but not yet completed
  // Also includes the current level so we can reference its index against the candidates
  const { levels } = getLevelMap(levelsOnly);
  const candidates = levels.filter(x => !x.complete && x.level !== game.globals.level);
  const current = levels.filter(x => x.level === currentLevel)[0];

  let nearest = null;
  let nearestDist = 999999999999;
  for (const candidate of candidates) {
    const dist = vec2.distance(candidate.position, current.position);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = candidate.level;
    }
  }

  return nearest;
}

export function getLevelName(levelId) {
  for (const level of getLevelList()) {
    if (level.level === levelId) {
      return level.name;
    }
  }
  return '';
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
    'void': 'H',
    'butter': 'J',
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

export function getNumberOfKeys() {
  let numKeysObtained = 0;
  let numLocksOpened = 0;

  for (const keyName of Object.keys(game.globals.keysObtained ?? {})) {
    if (game.globals.keysObtained?.[keyName]) {
      numKeysObtained ++;
    }
  }

  for (const lockName of Object.keys(game.globals.locksOpened ?? {})) {
    if (game.globals.locksOpened?.[lockName]) {
      let lockCount = 1;
      for (const level of getRawLevelMap()["levels"]) {
        if (level.lockName === lockName && level.lockCount) {
          lockCount = level.lockCount;
        }
      }
      numLocksOpened += lockCount;
    }
  }

  return numKeysObtained - numLocksOpened;
}

export function hasFoundAnyKeys() {
  let numKeysObtained = 0;

  for (const keyName of Object.keys(game.globals.keysObtained ?? {})) {
    if (game.globals.keysObtained?.[keyName]) {
      numKeysObtained ++;
    }
  }

  return numKeysObtained > 0;
}

let levelMap = undefined;
export function getRawLevelMap() {
  if (!levelMap) {
    levelMap = JSON.parse(assets.json.levelMap)
  }
  return levelMap;
}

export function getLevelMap(levelsOnly) {
  const rawLevelMap = getRawLevelMap();

  const anchoredLevels = [];
  for (const level of rawLevelMap["levels"]) {
    const newLevel = {...level};
    if (level.anchor) {
      newLevel.position = vec2.add(newLevel.position, rawLevelMap.anchors[newLevel.anchor]);
    }
    anchoredLevels.push(newLevel);
  }

  const completedLocationsMap = new Set(anchoredLevels.filter(l => game.globals.levelCompletions[l.level]).map(l => l.position.toString()));

  const positionMap = {};
  for (const level of anchoredLevels) {
    positionMap[level.position] = level;
  }

  const continuePath = (level, offset) => {
    const adj = positionMap[vec2.add(offset, level.position)];
    if (adj) {
      adj.unlocked = true;
      if ((adj.isPath || adj.isLock)) {
        continuePath(adj, offset);
      }
    }
  }

  for (const level of anchoredLevels) {
    if (completedLocationsMap.has(level.position.toString())) {
      level.complete = true;
      level.unlocked = true;
      for (const offset of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const adj = positionMap[vec2.add(offset, level.position)];
        if (adj) {
          adj.unlocked = true;
          if (adj.isPath || adj.isLock) {
            continuePath(adj, offset);
          }
        }
      }
    }
    if (level.level === 'intro') {
      level.unlocked = true;
    }
  }

  // Filter out locked levels
  let unlockedLevels = anchoredLevels.filter(x => x.unlocked);

  // Convert open locks to paths
  for (const level of unlockedLevels) {
    if (level.isLock && game.globals.locksOpened[level.lockName]) {
      level.isLock = false;
      level.isPath = true;
    }
  }

  // Levels only param
  if (levelsOnly) {
    unlockedLevels = unlockedLevels.filter(x => !x.isPath && !x.isLock && !x.isKey);
  }
  
  return {
    levels: unlockedLevels,
  };
}

