import { Logger } from './Logger';
import { Role, Task, ProcessPriority, ProcessResult, LogLevel, StampType, DangerLevel, Developer, LinkState } from './Enums';


export default class Typeguards {

    // Creeps
    static isAnyCreep(gameObject: unknown): gameObject is AnyCreep { return gameObject instanceof Creep || gameObject instanceof PowerCreep }

    static isCreep(gameObject: unknown): gameObject is Creep { return gameObject instanceof Creep }

    static isPowerCreep(gameObject: unknown): gameObject is PowerCreep { return gameObject instanceof PowerCreep }

    // Structures
    static isAnyOwnedStructure(structure: AnyStructure | Structure): structure is AnyOwnedStructure { return (structure as {my?: boolean}).my !== undefined }

    static isAnyStoreStructure(structure: AnyStructure | Structure): structure is AnyStoreStructure { return (structure as {store?: boolean}).store !== undefined }

    static isStructureContainer(structure: AnyStructure | Structure): structure is StructureContainer { return structure instanceof StructureContainer }

    static isStructureController(structure: AnyStructure | Structure): structure is StructureController { return structure instanceof StructureController }

    static isStructureExtension(structure: AnyStructure | Structure): structure is StructureExtension { return structure instanceof StructureExtension }

    static isStructureExtractor(structure: AnyStructure | Structure): structure is StructureExtractor { return structure instanceof StructureExtractor }

    static isStructureFactory(structure: AnyStructure | Structure): structure is StructureFactory { return structure instanceof StructureFactory }

    static isStructureInvaderCore(structure: AnyStructure | Structure): structure is StructureInvaderCore { return structure instanceof StructureInvaderCore }

    static isStructureKeeperLair(structure: AnyStructure | Structure): structure is StructureKeeperLair { return structure instanceof StructureKeeperLair }

    static isStructureLab(structure: AnyStructure | Structure): structure is StructureLab { return structure instanceof StructureLab }

    static isStructureLink(structure: AnyStructure | Structure): structure is StructureLink { return structure instanceof StructureLink }

    static isStructureNuker(structure: AnyStructure | Structure): structure is StructureNuker { return structure instanceof StructureNuker }

    static isStructureObserver(structure: AnyStructure | Structure): structure is StructureObserver { return structure instanceof StructureObserver }

    static isStructurePortal(structure: AnyStructure | Structure): structure is StructurePortal { return structure instanceof StructurePortal }

    static isStructurePowerBank(structure: AnyStructure | Structure): structure is StructurePowerBank { return structure instanceof StructurePowerBank }

    static isStructurePowerSpawn(structure: AnyStructure | Structure): structure is StructurePowerSpawn { return structure instanceof StructurePowerSpawn }

    static isStructureStorage(structure: AnyStructure | Structure): structure is StructureStorage { return structure instanceof StructureStorage }

    static isStructureSpawn(structure: AnyStructure | Structure): structure is StructureSpawn { return structure instanceof StructureSpawn }

    static isStructureTerminal(structure: AnyStructure | Structure): structure is StructureTerminal { return structure instanceof StructureTerminal }

    static isStructureTower(structure: AnyStructure | Structure): structure is StructureTower { return structure instanceof StructureTower }

    static isStructureRampart(structure: AnyStructure | Structure): structure is StructureRampart { return structure instanceof StructureRampart }

    static isStructureRoad(structure: AnyStructure | Structure): structure is StructureRoad { return structure instanceof StructureRoad }

    static isStructureWall(structure: AnyStructure | Structure): structure is StructureWall { return structure instanceof StructureWall }

    // Strings

    static isResourceConstant(string: string): string is ResourceConstant { return RESOURCES_ALL.includes(string as ResourceConstant) }

    static isRole(string: string): string is Role { return Object.values(Role).includes(string as Role) }

    static isTask(string: string): string is Task { return Object.values(Task).includes(string as Task) }

    static isProcessPriority(string: string): string is ProcessPriority { return Object.values(ProcessPriority).includes(string as ProcessPriority) }

    static isProcessResult(string: string): string is ProcessResult { return Object.values(ProcessResult).includes(string as ProcessResult) }

    static isLogLevelKey(string: string): string is keyof LogLevel { return Object.keys(LogLevel).includes(string as keyof LogLevel) }

    static isStampType(string: string): string is StampType { return Object.values(StampType).includes(string as StampType) }

    static isDeveloper(string: string): string is Developer { return Object.values(Developer).includes(string as Developer) }

    static isLinkState(string: string): string is LinkState { return Object.values(LinkState).includes(string as LinkState) }

    // Numbers

    static isDangerLevel(number: number): number is DangerLevel { return Object.values(DangerLevel).includes(number) }


}
