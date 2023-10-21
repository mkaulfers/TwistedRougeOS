import { Role } from "Constants/RoleConstants"
import SpawnOrder from "./SpawnOrder"

export default class SpawnQueue {
    room: Room
    spawns: StructureSpawn[]
    queuedOrders: SpawnOrder[]
    processingOrders: SpawnOrder[]
    failedOrders: SpawnOrder[]

    private get remainingEnergy(): number {
        const energyCapacity = this.room.energyCapacityAvailable;
        const allOrders = [...this.queuedOrders, ...this.processingOrders, ...this.failedOrders];
        const totalCost = allOrders.reduce((total, order) => total + order.cost, 0);
        return energyCapacity - totalCost;
    }

    get canTakeOrders(): boolean {
        return this.remainingEnergy > 0;
    }

    queueOrder(order: SpawnOrder) {
        this.cleanUp(order)
        this.queuedOrders.push(order)
    }

    dequeueOrder(order: SpawnOrder) {
        const index = this.queuedOrders.indexOf(order);
        if (index !== -1) {
            this.queuedOrders.splice(index, 1);
        }
    }

    startProcessing(order: SpawnOrder) {
        this.cleanUp(order)
        this.processingOrders.push(order)
    }

    stopProcessing(order: SpawnOrder) {
        const index = this.processingOrders.indexOf(order);
        if (index !== -1) {
            this.processingOrders.splice(index, 1);
        }
    }

    addFailed(order: SpawnOrder) {
        this.cleanUp(order)
        this.failedOrders.push(order)
    }

    removeFailed(order: SpawnOrder) {
        const index = this.failedOrders.indexOf(order);
        if (index !== -1) {
            this.failedOrders.splice(index, 1);
        }
    }

    private cleanUp(order: SpawnOrder) {
        this.dequeueOrder(order)
        this.stopProcessing(order)
        this.removeFailed(order)
    }

    processSpawnOrders() {
        if (this.queuedOrders.length == 0 && this.processingOrders.length == 0) return

        const availableSpawns = this.room.spawns.filter(spawn => !spawn.spawning);
        if (availableSpawns.length == 0) return

        if (this.processingOrders.length > 0) {
            this.queuedOrders = [...this.processingOrders, ...this.failedOrders, ...this.queuedOrders];
            this.processingOrders = [];
            this.failedOrders = [];
        }

        for (const spawn of availableSpawns) {
            if (this.queuedOrders.length == 0) break

            const order = this.queuedOrders[0];
            const result = spawn.spawnCreep(order.body, order.name, {
                memory: {
                    role: order.role,
                    working: false,
                    target: undefined,
                    homeRoom: this.room.name
                }
            });

            if (result == OK) {
                this.dequeueOrder(order)
            } else if (result == ERR_NOT_ENOUGH_ENERGY) {
                this.startProcessing(order)
            } else {
                this.addFailed(order)
                console.log(`SpawnQueue: Failed to spawn ${order.name} with error code: ${result}`)
            }
        }
    }

    constructor(room: Room) {
        this.room = room
        this.spawns = room.spawns
        this.queuedOrders = []
        this.processingOrders = []
        this.failedOrders = []
    }
}
