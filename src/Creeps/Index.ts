import { Engineer } from './Engineer';
import { Harvester } from './Harvester';
import { Scientist } from './Scientist';
import { Trucker } from './Trucker';
import { Filler } from './Filler';
import { Role } from 'utils/Enums';
import { Agent } from './Agent';

export var Roles: {[key in Role]?: any} = {
    engineer: Engineer,
    harvester: Harvester,
    scientist: Scientist,
    trucker: Trucker,
    filler: Filler,
    agent: Agent
}
