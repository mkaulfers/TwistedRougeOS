import { Engineer } from './Engineer';
import { Harvester } from './Harvester';
import { Scientist } from './Scientist';
import { Trucker } from './Trucker';
import { Filler } from './Filler';
import { Role } from 'utils/Enums';
import { Agent } from './Agent';
import CreepRole from 'Models/CreepRole';

var Roles: {[key in Role]?: CreepRole} = {
    harvester: new Harvester,
    trucker: new Trucker,
    engineer: new Engineer,
    filler: new Filler,
    scientist: new Scientist,
    agent: new Agent,
}

export default Roles;

