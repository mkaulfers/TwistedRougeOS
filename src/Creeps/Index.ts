import { Engineer } from './Engineer';
import { Harvester } from './Harvester';
import { Scientist } from './Scientist';
import { Trucker } from './Trucker';
import { Filler } from './Filler';
import { Agent } from './Agent';
import CreepRole from 'Models/CreepRole';
import { NetworkHarvester } from './NetworkHarvester';
import { Anchor } from './Anchor';
import { NetworkTrucker } from './NetworkTrucker';
import { Miner } from './Miner';
import { Role } from 'Constants/RoleConstants';

var CreepClasses: {[key in Role]?: CreepRole} = {
    harvester: new Harvester,
    trucker: new Trucker,
    filler: new Filler,
    anchor: new Anchor,
    engineer: new Engineer,
    scientist: new Scientist,
    agent: new Agent,
    miner: new Miner,
    nHarvester: new NetworkHarvester,
    nTrucker: new NetworkTrucker,
}

export default CreepClasses;

