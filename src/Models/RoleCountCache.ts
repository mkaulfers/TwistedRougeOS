export default interface RoleCountCache {
    [roomName: string]: {
        timestamp: number,
        roleCounts: { [role: string]: number }
    }
}
