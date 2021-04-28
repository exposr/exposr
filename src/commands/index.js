import Logger from '../logger.js';
import CreateAccount from './create-account.js';
import CreateTunnel from './create-tunnel.js';
import DeleteTunnel from './delete-tunnel.js';
import ConnectTunnel from './connect-tunnel.js';
import TunnelCommand from './tunnel.js';

class Command {
    constructor() {
        if (Command.instance !== undefined) {
            return Command.instance
        }
    }

    execute(command) {
        switch (command.toLowerCase()) {
            case 'create-account':
                CreateAccount();
                break;
            case 'create-tunnel':
                CreateTunnel();
                break;
            case 'delete-tunnel':
                DeleteTunnel();
                break;
            case 'connect-tunnel':
                ConnectTunnel();
                break;
            case 'tunnel':
                TunnelCommand();
                break;
            default:
                Logger.error(`No such command ${command}`);
        }
    }

}

export default new Command();