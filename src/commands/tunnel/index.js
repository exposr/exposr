import * as createTunnel from './create.js';
import * as deleteTunnel from './delete.js';
import * as configureTunnel from './configure.js';
import * as connectTunnel from './connect.js';
import * as disconnectTunnel from './disconnect.js';
import * as infoTunnel from './info.js';
export const commands = [
    createTunnel,
    connectTunnel,
    configureTunnel,
    infoTunnel,
    disconnectTunnel,
    deleteTunnel,
];