import Command from './commands/index.js';
import Logger from './logger.js';
import Config from './config.js';
import Version from './version.js';

export default () => {
    Logger.info(`exposr cli ${Version.version.version}`);
    Command.execute(Config.get('_')[0]);
}