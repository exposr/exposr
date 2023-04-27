import { createApp } from './components/app.js';
import Logger, { closeLogger } from './logger.js';

class Console {

    constructor() {
        if (Console.instance instanceof Console) {
            return Console.instance;
        }
        Console.instance = this;
    }

    async shutdown () {
        await closeLogger();
        if (this._refresh != undefined) {
            this._refresh();
        }
        delete Console.instance;
    }

    async init(interactive) {
        this.interactive = interactive;

        const stdoutOutput = (str, status) => {
            process.stdout.write(`${str}${status != undefined ? '\n' : ''}`);
        };

        if (interactive && process.stdout.isTTY) {
            const {update, refresh} =  (await createApp());
            this._update = update;
            this._refresh = refresh;
            const consoleOutput = (line, status) => {
                update({
                    log: {
                        line,
                        status,
                    }
                });
            };

            this._output = consoleOutput;
        } else {
            this._output = stdoutOutput;
        }

        this.log = this.logger = Logger(this._output);
    }

    status = {
        success: (line) => { this._status('success', line) },
        fail: (line) => { this._status('fail', line) },
        info: (line) => { this._status('info', line) },
        spinner: (line) => { this._status('spinner', line) },
    };

    _status(state, line) {
        if (this._update == undefined) {
            return;
        }
        this._update({
            status: {
                state,
                line,
            },
        })
    }

}

export default Console;