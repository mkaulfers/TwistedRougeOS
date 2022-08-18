import * as RoomManager from './RoomManager';
import * as PopManager from './PopulationManager';
import * as SpawnManager from './SpawnManager';
import * as TaskManager from './TaskManagement/TaskManager';
import * as UtilityTasks from './TaskManagement/UtilityTasks';
import * as EngineerTasks from './TaskManagement/CreepTasks/EngineerTasks';
import * as HarvesterTasks from './TaskManagement/CreepTasks/HarvesterTasks';
import * as ScientistTasks from './TaskManagement/CreepTasks/ScientistTasks';
import * as TruckerTasks from './TaskManagement/CreepTasks/TruckerTasks';

export var Managers = {
    RoomManager: RoomManager,
    PopManager: PopManager,
    SpawnManager: SpawnManager,
    TaskManager: TaskManager,
    UtilityTasks: UtilityTasks,
    EngineerTasks: EngineerTasks,
    HarvesterTasks: HarvesterTasks,
    ScientistTasks: ScientistTasks,
    TruckerTasks: TruckerTasks,
}
