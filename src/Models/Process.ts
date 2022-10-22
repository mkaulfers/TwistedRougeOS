import { ProcessPriority, INDIFFERENT, LOW, MEDIUM_LOW, MEDIUM, MEDIUM_HIGH, HIGH, CRITICAL } from "Constants/ProcessPriorityConstants"
import { ProcessState } from "Constants/ProcessStateConstants"

export class Process {
    id: string
    run: () => ProcessState
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
            case INDIFFERENT:
                this.currentPriority = LOW
                break
            case LOW:
                this.currentPriority = MEDIUM_LOW
                break
            case MEDIUM_LOW:
                this.currentPriority = MEDIUM
                break
            case MEDIUM:
                this.currentPriority = MEDIUM_HIGH
                break
            case MEDIUM_HIGH:
                this.currentPriority = HIGH
                break
            case HIGH:
                this.currentPriority = CRITICAL
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
               `<div style='height:20px;width:${this.cpuUsedHistory[this.cpuUsedHistory.length - 1] * 100 / Game.cpu.limit}%; background: ${colors.green}; justify-content: center; color: ${colors.black};'>${this.cpuUsedHistory[this.cpuUsedHistory.length - 1].toString().substring(0, 4)}</div></div></body>`
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
