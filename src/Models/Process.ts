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
        return `<div>` +
                `<div style="` +
                    `background-color: #1E1E1E;` +
                    `color: white;` +
                    `font-size: 12px;` +
                    `justify-content: center;` +
                    `align-items: left;` +
                    `display: flex;` +
                    `flex-direction: row;` +
                    `border-radius: 10px;` +
                    `margin: 10px;` +
                    `padding: 10px;` +
                    `box-shadow: 0px 0px 10px 0px rgba(0,0,0,0.75);` +
                `">` +
                    `<div style="` +
                        `background-color: gray;` +
                        `color: white;` +
                        `width: 20px;` +
                        `height: 100px;` +
                        `justify-content: space-between;` +
                        `align-items: bottom;` +
                        `display: flex;` +
                        `flex-direction: column;` +
                        `border-radius: 10px;` +
                        `margin: 10px;` +
                    `">` +
                        `<div style="` +
                            `background-color: #39FF14;` +
                            `color: white;` +
                            `font-size: 20px;` +
                            `width: 20px;` +
                            `height: ${ (this.cpuUsedHistory[this.cpuUsedHistory.length - 1] / Game.cpu.getUsed()) * 100 }px;` +
                            `display: flex;` +
                            `border-radius: 10px;` +
                            `margin-top: auto;` +
                            `box-shadow: 0px 0px 10px 0px rgba(0,0,0,0.75);` +
                        `"></div>` +
                    `</div>` +
                    `<div>` +
                        `<h1 style="color: gray; font-size: 8px; margin-top: 0; margin-bottom: 4px;">Name</h1>` +
                        `<p style="color: white; font-size: 16px; margin-top: 0;">${this.id}</p>` +
                        `<h1 style="color: gray; font-size: 8px; margin-top: 4px; margin-bottom: 4px;">Priority</h1>` +
                        `<p style="color: white; font-size: 16px; margin-top: 0;">${this.currentPriority}</p>` +
                        `<h1 style="color: gray; font-size: 8px; margin-top: 4px; margin-bottom: 4px;">CPU Usage</h1>` +
                        `<p style="color: white; font-size: 16px; margin-top: 0;">${ ((this.cpuUsedHistory[this.cpuUsedHistory.length - 1] / Game.cpu.getUsed()) * 100).toFixed(2) }%</p>` +
                    `</div>` +
                `</div>` +
            `</div>`;
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
