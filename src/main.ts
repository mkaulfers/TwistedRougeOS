import { Utils } from './utils/Index';
import { LogLevel } from './utils/Enums'
import { OS } from "OS/Index";
import prototypeExtender from "./Extensions/Index";
import Roles from 'Creeps/Index';

import { colors } from "Models/Process";


declare global {

  namespace NodeJS {
    interface Global {
      //example: any
    }
  }
}

// Once and Done code here
prototypeExtender();

export const loop = Utils.ErrorMapper.wrapLoop(() => {

  clearConsole()
  setup()
  boot()
  execute()
  end()
  loggingProcess()
});

function setup() {
  // TODO: Deserialize scheduler and kernel.
  // DEV MODE LOGGING
  Utils.Logger.devLogLevel = LogLevel.DEBUG;
  if (!global.kernel) {
    Utils.Logger.log("Building new kernel.", LogLevel.DEBUG)
    global.kernel = new OS.Kernel()
  }
  if (!global.scheduler) {
    Utils.Logger.log("Building new scheduler.", LogLevel.DEBUG)
    global.scheduler = new OS.Scheduler()
  }
}

function boot() {
  global.kernel.loadProcesses()
  global.kernel.sortProcesses()
}

function execute() {
  global.kernel.executeProcesses()
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
  displaySimpleStats()
  if (Utils.Logger.devLogLevel == LogLevel.DEBUG ||
    Utils.Logger.devLogLevel == LogLevel.ALL ||
    Utils.Logger.devLogLevel == LogLevel.INFO) {
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
