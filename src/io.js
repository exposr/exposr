import os from 'os';

class IO {
    constructor(output, input) {
        this._output = output;
        this._input = input;
    }

    info(str) {
        this._output.write('️ℹ ');
        this._output.write(str + os.EOL);
    }

    success(str) {
        this._output.write('✨ ');
        this._output.write(str + os.EOL);
    }

    failure(str) {
        this._output.write('❌ ');
        this._output.write(str + os.EOL);
    }

    error(str) {
        this._output.write('❌ ');
        this._output.write(str + os.EOL);
    }

    warn(str) {
        this._output.write('⚠️  ');
        this._output.write(str + os.EOL);
    }

    prohibited(str) {
        this._output.write('🚫 ');
        this._output.write(str + os.EOL);
    }

    debug(str) {
        this._output.write('🐛 ');
        this._output.write(str + os.EOL);
    }
    
    trace(str) {
        this._output.write('👀 ');
        this._output.write(str + os.EOL);
    }
}

export default IO;