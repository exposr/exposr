import commandExecute from './command-execute.js';
import Console from './console/index.js';

(async () => {
    const cons = new Console();
    await cons.init();
    await commandExecute(process.argv.slice(2), cons);
    await cons.shutdown();
    process.exit(0);
})();