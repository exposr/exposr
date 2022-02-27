import AccountService from '../../service/account-service.js';

export const command = 'create';
export const desc = 'Create account';
export const builder = function (yargs) {
    return yargs;
}
export const handler = async function (argv) {
    const cons = argv.cons;

    const {success, fail} = cons.log.log("Creating account...");

    const account = await createAccount({
        cons,
        server: argv['server'],
    }).then((account) => {
        success(`success`);
        cons.status.success(`Created account ${account.account_id_hr}`);
    }).catch((e) => {
        fail(`failed (${e.message})`);
        cons.status.fail(`Could not create account`);
    });
    return account;
}

export const createAccount = async (opts) => {
    const accountService = new AccountService({
        server: opts.server,
    });

    return accountService.create();
}