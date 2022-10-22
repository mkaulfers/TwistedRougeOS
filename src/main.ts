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
  RESOURCES_ALL
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
