import commandExecute from './command-execute.js';

(async () => {
    await commandExecute(process.argv.slice(2), process.stdin, process.stdout);
    process.exit(0);
})();