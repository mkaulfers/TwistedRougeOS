import { Engineer } from './Engineer';
import { Harvester } from './Harvester';
import { Scientist } from './Scientist';
import { Trucker } from './Trucker';
import { Filler } from './Filler';
import { Role } from 'utils/Enums';
import { Agent } from './Agent';

var Roles: {[key in Role]?: any} = {
    harvester: Harvester,
    trucker: Trucker,
    engineer: Engineer,
    filler: Filler,
    scientist: Scientist,
    agent: Agent
}

export default Roles;
