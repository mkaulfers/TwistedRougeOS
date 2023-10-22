import { TargetManager } from 'Managers/TargetManager';
import Kernel from './Kernel';
import Scheduler from './Scheduler';
import SpawnManagerNew from 'Managers/SpawnManager-New';
import RoleCountCache from 'Models/RoleCountCache';

declare global {
    namespace NodeJS {
        interface Global {
            attackedTime: number,
            kernel: Kernel,
            recentlyAttacked: boolean,
            scheduler: Scheduler,
            spawnManager: {[roomName: string]: SpawnManagerNew},
            roleCountCache: RoleCountCache,
            targetManagerFor: {[roomName: string]: TargetManager}
        }
    }
}

export var OS = {
    Kernel: Kernel,
    Scheduler: Scheduler,
}
