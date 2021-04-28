import Command from './commands/index.js';
import Logger from './logger.js';
import Config from './config.js';

export default () => {
    Logger.info("exposr client")
    Command.execute(Config.get('_')[0]);
}