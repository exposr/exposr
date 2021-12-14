import AccountService from '../../service/account-service.js';
import { ClientError } from '../../utils/errors.js';
import IO from '../../io.js';

export const command = 'create';
export const desc = 'Create account';
export const builder = function (yargs) {
    return yargs;
}
export const handler = async function (argv) {
    const io = new IO(argv.io.output, argv.io.input);
    const account = await createAccount({
        io: argv.io,
        server: argv['server'],
    }).then((account) => {
        io.success(`Created account ${account.account_id_hr}`);
    }).catch((e) => {
        io.failure(`Failed to create account: ${e.message}`);
    });
    return account;
}

export const createAccount = async (opts) => {
    const accountService = new AccountService({
        server: opts.server,
    });

    return accountService.create();
}