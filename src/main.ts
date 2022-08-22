import { ErrorMapper } from "utils/ErrorMapper";
import { Utils } from './utils/Index';
import { OS } from "OS/Index";
import { Managers } from "Managers/Index";
import './Prototypes/Index'
import { Role, Task, ProcessPriority, ProcessResult, LogLevel } from './utils/Enums'

declare global {
  interface CreepMemory {
    assignedPos?: number
    task?: Task
    role: string
    working: boolean
    target?: Id<any>
    homeRoom: string
  }

  interface RoomMemory {
    claim?: string
    costMatrix: string
    blueprintAnchor: number
    blueprint: {
      type: string,
      stampPos: number,
      completed: boolean
    }[]
  }

  interface Memory {
    uuid: number;
    log: any;
    kernel: string
    scheduler: string
  }

  namespace NodeJS {
    interface Global {
      log: any
    }
  }
}

export const loop = ErrorMapper.wrapLoop(() => {
  clearConsole()
  setup()
  boot()
  execute()
  end()
  loggingProcess()
});

function setup() {
  //TODO: Deserialize scheduler and kernel.
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
  console.log()
  console.log("============== CPU STATS ==============")
  console.log("Used: " + Game.cpu.getUsed())
  console.log("Bucket: " + Game.cpu.bucket)
  console.log()
}

function loggingProcess() {
  displaySimpleStats()
  if (Utils.Logger.devLogLevel == LogLevel.DEBUG ||
    Utils.Logger.devLogLevel == LogLevel.ALL ||
    Utils.Logger.devLogLevel == LogLevel.INFO) {
    console.log("============== PROCESSES ==============")
    console.log("Avg Queue Cpu Cost: " + global.kernel.estimatedQueueCpuCost())
    console.log()
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
