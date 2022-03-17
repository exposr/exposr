import os from 'os';
import AdminService from "../../../service/admin-service.js";

export const command = 'list'
export const desc = 'List tunnels'
export const builder = function (yargs) {
    return yargs
        .option('verbose', {
            alias: 'v',
            type: 'boolean',
            default: true,
            description: "Request verbose tunnel information",
        });
}
export const handler = async function (argv) {
    await listTunnels({
        cons: argv.cons,
        verbose: argv.verbose,
        apiKey: argv['api-key'],
        server: argv['server'],
    });
}

const listTunnels = async (opts) => {
    const cons = opts.cons;
    const output = process.stdout; 
    const input = process.stdin;

    const adminService = new AdminService(opts);
    const count = output.rows - 1 || 10;

    const maxTunnelPadding = Math.min(64, (output.columns - 17 - 25 - 25));
    if (output.isTTY) {
        output.write("\u001b[1m");
        output.write("Tunnel".padEnd(maxTunnelPadding, ' '));
        if (opts?.verbose) {
            output.write("Account".padEnd(17, ' '));
            output.write("Modified".padEnd(25, ' '));
            output.write("Created".padEnd(25, ' '));
        }
        output.write(os.EOL);
        output.write("\x1b[0m");
    }

    let cursor, tunnels;
    do {
        let res;
        try {
            res = await adminService.tunnelList(cursor, count, opts?.verbose);
        } catch (e) {
            cons.logger.error(`Unable to list tunnels: ${e.message}`);
            break;
        }

        ({cursor, tunnels} = res);

        tunnels.forEach((tunnel) => {
            output.write(`${tunnel.tunnel_id.padEnd(maxTunnelPadding - 1, ' ')} `);
            if (opts?.verbose) {
                output.write(`${tunnel.account_id} `);
                output.write(`${tunnel.updated_at} `);
                output.write(`${tunnel.created_at}`);
            }
            output.write(os.EOL);
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