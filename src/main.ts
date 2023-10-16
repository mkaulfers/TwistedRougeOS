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
import { cpuUsage } from "process";
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

function displaySimpleStats(): string {
  let cpuStats =
  `<div style="justify-content: space-around; display: flex; background-color: #1E1E1E; font-size: 12px; border-radius: 10px; margin: 10px; padding: 10px; box-shadow: 0px 0px 10px 0px rgba(0,0,0,0.75);">` +
      `<div style="display: flex; flex-direction: row; align-items: center; margin: 10px 0; justify-content: space-around;">` +
          `<div style="display: flex; flex-direction: row; align-items: center; margin: 10px 0;">` +
              `<div style="display: flex; flex-direction: column; background-color: gray; width: 20px; height: 100px; border-radius: 10px; margin-right: 10px;">` +
                  `<div style="background-color: ${colors.green}; width: 20px; height: ` + ((global.kernel.estimatedQueueCpuCost() / Game.cpu.limit) * 100) + `px; border-radius: 10px; margin-top: auto;"></div>` +
              `</div>` +
              `<div>` +
                  `<h1 style="color: gray; font-size: 8px; margin-top: 0; margin-bottom: 4px;">Average</h1>` +
                  `<p style="color: white; font-size: 16px; margin-top: 0;">` + global.kernel.estimatedQueueCpuCost().toString().substring(0, 4) + `</p>` +
              `</div>` +
          `</div>` +
          `<div style="display: flex; flex-direction: row; align-items: center; margin: 10px 0;">` +
              `<div style="display: flex; flex-direction: column; background-color: gray; width: 20px; height: 100px; border-radius: 10px; margin-right: 10px;">` +
                  `<div style="background-color: ${colors.green}; width: 20px; height: ` + (Game.cpu.getUsed() / Game.cpu.limit * 100) + `px; border-radius: 10px; margin-top: auto;"></div>` +
              `</div>` +
              `<div>` +
                  `<h1 style="color: gray; font-size: 8px; margin-top: 0; margin-bottom: 4px;">Current</h1>` +
                  `<p style="color: white; font-size: 16px; margin-top: 0;">` + Game.cpu.getUsed().toString().substring(0, 4) + `</p>` +
              `</div>` +
          `</div>` +
      `</div>` +
  `</div>`;

  return cpuStats
}

function loggingProcess() {
  console.log(`Game Tick: ${Game.time}, or Ticks til next 1500: ${1500 - (Game.time % 1500)}`);

  if (Utils.Logger.devLogLevel == DEBUG ||
      Utils.Logger.devLogLevel == ALL ||
      Utils.Logger.devLogLevel == INFO) {

      let containerString = '<div style="display: flex; flex-direction: row; flex-wrap: wrap; justify-content: start; width: 100%">';
      containerString += displaySimpleStats();

      for (let [, value] of global.scheduler.processQueue) {
          containerString += value.toString();
      }

      containerString += '</div>';

      console.log(containerString);
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
