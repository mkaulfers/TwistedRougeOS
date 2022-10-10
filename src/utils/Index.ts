import { Logger } from './Logger';
import { Utility } from './Utilities';
import { ErrorMapper } from './ErrorMapper';
import Typeguards from './Typeguards';

import './Commands';

export let Utils = {
    ErrorMapper: ErrorMapper,
    Logger: Logger,
    Utility: Utility,
    Typeguards: Typeguards,
}
