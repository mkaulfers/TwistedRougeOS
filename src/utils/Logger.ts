import { Role, Task, ProcessPriority, ProcessResult, LogLevel } from './Enums';

export class Logger {
    static devLogLevel: LogLevel
    static log(message: string, level: LogLevel): void {
        if (this.devLogLevel == LogLevel.OFF) return
        if (this.devLogLevel == LogLevel.ALL || this.devLogLevel == level) {
            console.log(`${level} ${message}`)
        }
    }

}
