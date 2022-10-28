import { Instruction } from "Constants/InstructionConstants"
import { Role } from "Constants/RoleConstants"

export class Target {
    //Who is the target for?
    //What is the target?
    //What is the instruction?
    //Where is the target?
    //When is the target?
    roomName: string
    targetPos: RoomPosition
    roleRequired: Role[]
    instruction: Instruction

    constructor(roomName: string, targetPos: RoomPosition, roleRequired: Role[], instruction: Instruction) {
        this.roomName = roomName
        this.targetPos = targetPos
        this.roleRequired = roleRequired
        this.instruction = instruction
    }
}
