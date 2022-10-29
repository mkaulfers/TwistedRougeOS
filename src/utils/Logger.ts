import { LogLevel, OFF, ALL, DEBUG, ERROR, INFO, TRACE, WARN } from "Constants/LogConstants"
export class Logger {
    static devLogLevel: LogLevel
    static log(message: string, level: LogLevel): void {
        if (this.devLogLevel == OFF) return
        if (this.devLogLevel == ALL || this.devLogLevel == level) {
            console.log(`${level} ${message}`)
        }
    }
}

global.button = function (name: string, command: string, primary = true) {
    let btnClass = primary ? 'md-primary ' : '';
    let action = `angular.element(document.body).injector().get('Console').sendCommand('${command}', 0)`;
    return `<button class="md-button md-raised ${btnClass} md-ink-ripple" onclick="${action}">${name}</button>`;
};

global.setLogLevelALL = function () { Logger.devLogLevel = ALL }
global.setLogLevelOFF = function () { Logger.devLogLevel = OFF }
global.setLogLevelTRACE = function () { Logger.devLogLevel = TRACE }
global.setLogLevelDEBUG = function () { Logger.devLogLevel = DEBUG }
global.setLogLevelINFO = function () { Logger.devLogLevel = INFO }
global.setLogLevelWARN = function () { Logger.devLogLevel = WARN }
global.setLogLevelERROR = function () { Logger.devLogLevel = ERROR }
global.toggleCPULogging = function() { global.enableCPULogging = !global.enableCPULogging }
global.toggleDevControlVisibility = function() { global.showDevControls = !global.showDevControls }
