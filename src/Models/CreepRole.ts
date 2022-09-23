import { Role, Task } from "utils/Enums";

export default abstract class CreepRole {

    /*
    Body Related
    */

    /** Starting body for the role. Must not exceed 300 energy cost. */
    abstract baseBody: BodyPartConstant[];
    /** The segment added as the spawning energy limit rises. */
    abstract segment: BodyPartConstant[];
    /**
     * Optional limiter for specific bodyparts. Represents the max number of each part in the segment when only the first of each unique bodypart used is kept.
     * Example: [CARRY, CARRY, MOVE, CARRY, MOVE, WORK] would be reduced to [CARRY, MOVE, WORK] and could have a partLimits of [10, 3, 17].
     */
    partLimits?: number[];
    /** Bodies generated given an eLimit, where the eLimit is the key. */
    [key: number]: BodyPartConstant[];

    /*
    Required Functions
    */

    /** Switches tasks for creeps of this role as required. */
    abstract dispatch(room: Room): void;
    /** Tells the SpawnManager how many of this role is wanted, in what priority order. */
    abstract quantityWanted(room: Room, rolesNeeded: Role[], min?: boolean): number;
    /** Prespawn consideration ticks to add on top of spawntime required. */
    preSpawnBy(room: Room, spawn: StructureSpawn, creep?: Creep): number { return 0; }
    /** The tasks for the role. */
    abstract tasks: { [key in Task]?: (creep: Creep) => void };

    // Supporting funtions for internal use not declared here
}
