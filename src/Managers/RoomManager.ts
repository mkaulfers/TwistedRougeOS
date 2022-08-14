import { Role } from "../utils/Enums";

Room.prototype.shouldSpawnEngineer = function (): boolean {
    return false
}

Room.prototype.shouldSpawnHarvester = function (): boolean {
    return false
}

Room.prototype.shouldSpawnScientist = function (): boolean {
    return false
}

Room.prototype.shouldSpawnTrucker = function (): boolean {
    return false
}

Room.prototype.roleToPreSpawn = function (): Role {
    return Role.HARVESTER
}
