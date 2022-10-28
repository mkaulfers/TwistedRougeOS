import { TargetManager } from 'Managers/TargetManager';
import Kernel from './Kernel';
import Scheduler from './Scheduler';

declare global {
    namespace NodeJS {
        interface Global {
            attackedTime: number,
            kernel: Kernel,
            recentlyAttacked: boolean,
            scheduler: Scheduler,
            targetManagerFor: {[roomName: string]: TargetManager}

            button(name: string, command: string, primary?: boolean): void
            setLogLevelALL(): void
            setLogLevelOFF(): void
            setLogLevelTRACE(): void
            setLogLevelDEBUG(): void
            setLogLevelINFO(): void
            setLogLevelWARN(): void
            setLogLevelERROR(): void
        }
    }
}

export var OS = {
    Kernel: Kernel,
    Scheduler: Scheduler,
}
