import os from 'os';
import AdminService from "../../../service/admin-service.js";

export const command = 'list'
export const desc = 'List tunnels'
export const builder = function (yargs) {
    return yargs;
}
export const handler = async function (argv) {
    await listTunnels({
        io: argv.io,
        apiKey: argv['api-key'],
        server: argv['server'],
    });
}

const listTunnels = async (opts) => {
    const output = opts.io.output; 
    const input = opts.io.input; 

    const adminService = new AdminService(opts);
    const count = output.rows - 1 || 10;

    let cursor, tunnels;
    do {
        const res = await adminService.tunnelList(cursor, count);
        if (res instanceof Error) {
            console.error(res);
            break;
        }

        ({cursor, tunnels} = res);

        tunnels.forEach((tunnel) => {
            output.write(`${tunnel.tunnel_id}${os.EOL}`);
        });

        if (output.isTTY && input.isTTY && cursor) {
            output.write("\x1b[7m(More results available)");
            input.setRawMode(true);
            input.resume();
            await new Promise((resolve) => {
                input.once('data', (data) => {
                    resolve();
                })
            });
            output.write("\x1b[0m");
            output.clearLine(0);
            output.cursorTo(0);
        }

    } while (cursor);
}