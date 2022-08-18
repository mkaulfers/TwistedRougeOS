import { ErrorMapper } from "utils/ErrorMapper";
import { Kernel } from "OS/Kernel";
import { Scheduler } from "OS/Scheduler";
import { Logger, LogLevel } from "./utils/Logger"
import { Role, Task } from "./utils/Enums";
import "./Managers/TaskManagement/TaskManager";
import "./Managers/RoomManager";
import './Prototypes/Index';

declare global {
  interface CreepMemory {
    task?: Task
    role: string
    working: boolean
    target?: Id<any>
    homeRoom: string
  }

  interface RoomMemory {
    claim?: string;
  }

  interface Memory {
    uuid: number;
    log: any;
  }

  namespace NodeJS {
    interface Global {
      log: any
      kernel: Kernel
      scheduler: Scheduler
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
  // DEV MODE LOGGING
  Logger.devLogLevel = LogLevel.ALL
  if (!global.kernel) {
    Logger.log("Building new kernel.", LogLevel.DEBUG)
    global.kernel = new Kernel()
  }
  if (!global.scheduler) {
    Logger.log("Building new scheduler.", LogLevel.DEBUG)
    global.scheduler = new Scheduler()
  }
}

function boot() {
  global.kernel.loadMemory()
  global.kernel.loadProcesses()
  global.kernel.sortProcesses()
}

function execute() {
  global.kernel.executeProcesses()
}

function end() {
  //Serialize the Kernel to memory.
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
  if (Logger.devLogLevel == LogLevel.DEBUG ||
    Logger.devLogLevel == LogLevel.ALL ||
    Logger.devLogLevel == LogLevel.INFO) {
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
