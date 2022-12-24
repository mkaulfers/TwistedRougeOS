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
        }
    }
}

export var OS = {
    Kernel: Kernel,
    Scheduler: Scheduler,
}
