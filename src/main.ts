// Put here to force prototype creation first.
import prototypeExtender from "./Extensions/Index";
prototypeExtender();

// Imports
import { Utils } from './utils/Index';
import { OS } from "OS/Index";
import { memHack } from "Models/MemHack";
import { colors } from "Models/Process";
import { preTick, reconcileTraffic } from 'screeps-cartographer';
import { ALL, DEBUG, INFO } from "Constants/LogConstants";
declare global {
  interface RawMemory {
    [key: string]: any
  }

  namespace NodeJS {
    interface Global {
      Memory?: Memory
    }
  }
}

// Once and Done code here

// DEV MODE LOGGING
Utils.Logger.devLogLevel = DEBUG;

export const loop = Utils.ErrorMapper.wrapLoop(() => {
  setupStats()
  clearConsole()
  setup()
  boot()
  execute()
  end()
  loggingProcess()
});

function setup() {
  memHack.modifyMemory()
  // TODO: Deserialize scheduler and kernel.
  if (!global.kernel) {
    Utils.Logger.log("Building new kernel.", DEBUG)
    global.kernel = new OS.Kernel()
  }
  if (!global.scheduler) {
    Utils.Logger.log("Building new scheduler.", DEBUG)
    global.scheduler = new OS.Scheduler()
  }
}

function boot() {
  global.kernel.loadProcesses()
  global.kernel.sortProcesses()
}

function execute() {
  preTick()
  global.kernel.executeProcesses()
  reconcileTraffic()
}

function end() {
  //TODO: Serialize scheduler and kernel.
}

function displaySimpleStats() {
  // let cpuStats = `<div style='width: 50vw; text-align: left; align-items: left; justify-content: left; display: inline-block; background: ${colors.lightGrey};'><div style='padding: 2px; font-size: 18px; font-weight: 600; color: ${colors.black};'>============== CPU STATS ==============` +
  // `<div style='height:20px;width:${global.kernel.estimatedQueueCpuCost() * 100 / Game.cpu.limit}%; background: ${colors.green}; justify-content: center; color: ${colors.black};'>Avg: ${global.kernel.estimatedQueueCpuCost().toString().substring(0, 4)}</div>` +
  // `<div style='height:20px;width:${Game.cpu.getUsed() * 100 / Game.cpu.limit}%; background: ${colors.green}; justify-content: center; color: ${colors.black};'> Current: ${Game.cpu.getUsed().toString().substring(0, 4)}</div>`

  let cpuStats =
    `<div style='width: 50vw; text-align: left; align-items: left; justify-content: center; display: inline-block; background: ${colors.lightGrey};'><div style='background: ${colors.lightGrey}; padding: 2px; font-size: 18px; font-weight: 600; color: ${colors.darkBlue};'>============== CPU STATS ==============</div>` +
    `<div style='height:20px;width:${global.kernel.estimatedQueueCpuCost() * 100 / Game.cpu.limit}%; background: ${colors.green}; justify-content: center; color: ${colors.black};'>Average: ${global.kernel.estimatedQueueCpuCost().toString().substring(0, 4)}</div>` +
    `<div style='height:20px;width:${Game.cpu.getUsed() * 100 / Game.cpu.limit}%; background: ${colors.green}; justify-content: center; color: ${colors.black};'>Current: ${Game.cpu.getUsed().toString().substring(0, 4)}</div>`

  console.log()
  console.log(cpuStats)
}

function loggingProcess() {
    console.log(`Game Tick: ${Game.time}, or Ticks til next 1500: ${1500 - (Game.time % 1500)}`)
    displaySimpleStats()
    if (Utils.Logger.devLogLevel == DEBUG ||
        Utils.Logger.devLogLevel == ALL ||
        Utils.Logger.devLogLevel == INFO) {
        for (let [, value] of global.scheduler.processQueue) {
        console.log(value.toString())
        }
    }
}

function clearConsole() {
  for (let i = 0; i < 100; i++) {
    console.log()
  }
}

function setupStats() {
  Memory.stats = {
    gcl: Game.gcl,
    gpl: Game.gpl,
    cpu: {
      bucket: Game.cpu.bucket,
      usage: Game.cpu.getUsed(),
      limit: Game.cpu.limit,
    },
    resources: {
      pixels: Game.resources[PIXEL],
      cpuUnlock: Game.resources[CPU_UNLOCK],
      accessKey: Game.resources[ACCESS_KEY],
    },
    roomCount: Object.keys(Game.rooms).length,
    creepCount: Object.keys(Game.creeps).length,
    spawnCount: Object.keys(Game.spawns).length,
    constructionSiteCount: Object.keys(Game.constructionSites).length,
    flagCount: Object.keys(Game.flags).length,
    rooms: {},
  };

  Object.entries(Game.rooms).forEach(([name, room]) => {
    if (room.controller && room.controller.my) {
      Memory.stats.rooms[name] = {
        controller: {
          level: room.controller.level,
          progress: room.controller.progress,
          progressTotal: room.controller.progressTotal,
        },
        energyAvailable: room.energyAvailable,
        energyCapacityAvailable: room.energyCapacityAvailable,
        energyInStorage: room.storage ? room.storage.store.energy : 0,
        energyInTerminal: room.terminal ? room.terminal.store.energy : 0,
      };
    }
  });
}
