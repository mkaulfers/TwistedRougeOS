import Kernel from './Kernel';
import Scheduler from './Scheduler';

declare global {
    namespace NodeJS {
        interface Global {
        kernel: Kernel,
        scheduler: Scheduler,
        }
    }
}

export var OS = {
    Kernel: Kernel,
    Scheduler: Scheduler,
}
