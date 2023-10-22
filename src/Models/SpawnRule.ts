type SpawnRuleDependencies = {
    [role: string]: number;
}

export default class SpawnRule {
    dependencies: SpawnRuleDependencies;

    constructor(deps: SpawnRuleDependencies) {
        this.dependencies = deps;
    }
}
