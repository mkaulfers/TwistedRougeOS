import { Role, Task, ProcessPriority, ProcessResult, LogLevel } from '../utils/Enums'

export class Process {
    id: string
    run: () => ProcessResult
    cpuUsedHistory: number[]

    currentPriority: ProcessPriority
    private initialPriority: ProcessPriority

    constructor(id: string, setPriority: ProcessPriority, task: (arg0?: any) => any) {
        this.id = id
        this.initialPriority = setPriority
        this.currentPriority = setPriority
        this.run = task
        this.cpuUsedHistory = []
    }

    getAvgCpuUsed(): number {
        let totalCpuUsed = 0
        for (let i = 0; i < this.cpuUsedHistory.length; i++) {
            totalCpuUsed += this.cpuUsedHistory[i]
        }
        return totalCpuUsed / this.cpuUsedHistory.length
    }

    increasePriority() {
        switch (this.currentPriority) {
            case ProcessPriority.INDIFFERENT:
                this.currentPriority = ProcessPriority.LOW
                break
            case ProcessPriority.LOW:
                this.currentPriority = ProcessPriority.MEDIUM_LOW
                break
            case ProcessPriority.MEDIUM_LOW:
                this.currentPriority = ProcessPriority.MEDIUM
                break
            case ProcessPriority.MEDIUM:
                this.currentPriority = ProcessPriority.MEDIUM_HIGH
                break
            case ProcessPriority.MEDIUM_HIGH:
                this.currentPriority = ProcessPriority.HIGH
                break
            case ProcessPriority.HIGH:
                this.currentPriority = ProcessPriority.CRITICAL
                break
            default:
                console.log("Process with id, " + this.id + " marked critical.")
        }
    }

    restorePriority() {
        this.currentPriority = this.initialPriority
    }

    toString() {
        return `<body><div style='width: 50vw; text-align: left; align-items: left; justify-content: left; display: inline-block; background: ${colors.lightGrey};'><div style='padding: 2px; font-size: 18px; font-weight: 600; color: ${colors.black};'>${this.id}<br>` +
               `<div style='width: 50vw; text-align: left; align-items: left; justify-content: left; display: inline-block; background: ${colors.white};'><div style='padding: 2px; font-size: 14px; font-weight: 500; color: ${colors.brown};'>${this.currentPriority}<br>` +
               `<div style='height:20px;width:${this.getAvgCpuUsed() * 100 / Game.cpu.limit}%; background: ${colors.green}; justify-content: center; color: ${colors.black};'>${this.getAvgCpuUsed().toString().substring(0, 4)}</div></div></body>`
    }
}

export const colors = {
    white: '#ffffff',
    lightGrey: '#eaeaea',
    lightBlue: '#0f66fc',
    darkBlue: '#02007d',
    black: '#000000',
    yellow: '#d8f100',
    red: '#d10000',
    green: '#00d137',
    brown: '#aa7253',
  }
