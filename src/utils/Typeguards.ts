import { Logger } from './Logger';
import { Role, Task, ProcessPriority, ProcessResult, LogLevel } from './Enums';


export default class Typeguards {
    static isStructureSpawn(structure: AnyStructure): structure is StructureSpawn { return structure instanceof StructureSpawn }

    static isStructureExtension(structure: AnyStructure): structure is StructureExtension { return structure instanceof StructureExtension }

    static isStructureRoad(structure: AnyStructure): structure is StructureRoad { return structure instanceof StructureRoad }

    static isStructureWall(structure: AnyStructure): structure is StructureWall { return structure instanceof StructureWall }

    static isStructureRampart(structure: AnyStructure): structure is StructureRampart { return structure instanceof StructureRampart }

    static isStructureKeeperLair(structure: AnyStructure): structure is StructureRampart { return structure instanceof StructureRampart }

    static isStructurePortal(structure: AnyStructure): structure is StructurePortal { return structure instanceof StructurePortal }

    static isStructureController(structure: AnyStructure): structure is StructureController { return structure instanceof StructureController }

    static isStructureLink(structure: AnyStructure): structure is StructureLink { return structure instanceof StructureLink }

    static isStructureStorage(structure: AnyStructure): structure is StructureStorage { return structure instanceof StructureStorage }

    static isStructureTower(structure: AnyStructure): structure is StructureTower { return structure instanceof StructureTower }

    static isStructureObserver(structure: AnyStructure): structure is StructureObserver { return structure instanceof StructureObserver }

    static isStructureContainer(structure: AnyStructure): structure is StructureContainer { return structure instanceof StructureContainer }


}
