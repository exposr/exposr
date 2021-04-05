import yargs from 'yargs';

class Config {
    constructor() {
        this._config = {
            'log-level': 'TRACE'
        };
    }

    get(key) {
        return this._config[key];
    }

}

export default new Config();