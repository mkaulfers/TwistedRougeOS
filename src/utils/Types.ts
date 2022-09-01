
interface SpawnOrder {
    id: string, // role + count
    scheduleTick?: number,
    spawnTime: number,
    body: BodyPartConstant[],
    memory: {[key: string]: any},
}
