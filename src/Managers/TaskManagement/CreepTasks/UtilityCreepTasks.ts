
interface Creep {
    travel(): number;                                                                                   // default movement method for single creeps that handles multi-room travel.. poorly
    take(target: Id<AnyStoreStructure | Resource | Tombstone>, resource: ResourceConstant): number;     // withdraw, pickup
    give(target: Id<AnyStoreStructure | Creep>, resource: ResourceConstant): number;                    // transfer
    mine(target: Id<Source | Mineral>): number;                                                         // harvest
    work(target: Id<Structure | ConstructionSite>): number;                                             // build, repair
    praise(target: Id<StructureController>): number;                                                    // upgrade, sign
    firstaid(target: Id<Creep>): number;                                                                // heal, rangedHeal
    destroy(target?: Id<Structure> | Creep): number;                                                    // dismantle, attack, rangedAttack, RMA
    nMRController(target: Id<StructureController>): number;                                             // Not my rooms controller; sign, reserve, attack, claim
    isBoosted(): number;
}

Creep.prototype.travel = function() {

    return OK;
}

Creep.prototype.take = function(target, resource) {

    return OK;
}

Creep.prototype.give = function(target, resource) {

    return OK;
}

Creep.prototype.mine = function(target) {

    return OK;
}

Creep.prototype.work = function(target) {

    return OK;
}

Creep.prototype.praise = function(target) {

    return OK;
}

Creep.prototype.firstaid = function(target) {

    return OK;
}

Creep.prototype.destroy = function(target) {

    return OK;
}

Creep.prototype.nMRController = function(target) {

    return OK;
}

Creep.prototype.isBoosted = function() {

    return OK;
}
