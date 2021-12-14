import * as list from './list.js';

export const command = 'tunnel <command>'
export const desc = 'Manage tunnels'
export const builder = function (yargs) {
    return yargs.command([list]);
}
export const handler = function (argv) {
    return argv;
}