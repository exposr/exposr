import runApp from './app.js';

(async () => {
    const res = await runApp(process.argv.slice(2));
    process.exit(res);
})();