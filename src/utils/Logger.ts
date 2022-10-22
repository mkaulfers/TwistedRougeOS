import { LogLevel, OFF, ALL } from "Constants"
export class Logger {
    static devLogLevel: LogLevel
    static log(message: string, level: LogLevel): void {
        if (this.devLogLevel == OFF) return
        if (this.devLogLevel == ALL || this.devLogLevel == level) {
            console.log(`${level} ${message}`)
        }
    }
}
