import Log4js from 'log4js';
import { Sema } from 'async-sema';

const getLogger = (output) => {
    const sema = new Sema(1);

    if (output == undefined) {
        output = (str, status) => {
            process.stdout.write(`${str}${status != undefined ? '\n' : ''}`);
        };
    }

    const stdoutAppender = (layout, timezoneOffset) => {
        const appender = (loggingEvent) => {

            let done;
            if (loggingEvent.data[0] instanceof Promise) {
                done = loggingEvent.data[0];
                loggingEvent.data = loggingEvent.data.slice(1);
            }

            sema.acquire().then(() => {
                if (!done) {
                    const level2status = {
                        'INFO': 'done',
                        'WARN': 'warn',
                        'ERROR': 'error',
                        'FATAL': 'error',
                        'TRACE': 'done',
                        'DEBUG': 'done',
                    };
                    output(`${layout(loggingEvent, timezoneOffset)}`, level2status[loggingEvent.level.levelStr]);
                    sema.release();
                    return;
                }

                output(`${layout(loggingEvent, timezoneOffset)}`);
                done.then(({status, str}) => {
                    if (str) {
                        output(`${str}`, status);
                    } else {
                        output('', status);
                    }
                }).finally(() => {
                    sema.release();
                });
            });
        };

        appender.shutdown = (done) => {
            sema.drain().then(() => {
                done();
            });
        };
        return appender;
    };

    const appenderModule = {
        configure: (config, layouts, findAppender, levels) => {
            let layout = layouts.colouredLayout;
            if (config.layout) {
                layout = layouts.layout(config.layout.type, config.layout);
            }
            return stdoutAppender(layout, config.timezoneOffset)
        }
    };

    Log4js.configure({
        appenders: {
            out: {
                type: appenderModule,
                layout: {
                    type: 'pattern',
                    pattern: '%d{yyyy-MM-dd hh:mm:ss O} - %m'
                }
            }
        },
        categories: {
          default: { appenders: ['out'], level: 'info' }
        }
    });

    const logger = Log4js.getLogger('default');
    logger.level = 'info';

    logger['raw_log'] = logger['log'];
    logger['log'] = (...args) => {
        let done_fn;
        const done = new Promise((resolve) => {
            done_fn = (status, str) => {
                resolve({status, str});
            };
        });

        const orig = logger['raw_log'];
        orig.apply(logger, ['info', done, ...args]);
        return {
            fail: (str) => { done_fn("fail", str); },
            warn: (str) => { done_fn("warn", str); },
            error: (str) => { done_fn("error", str); },
            success: (str) => { done_fn("success", str); },
            done: (str) => { done_fn("done", str); },
        };
    };

    ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach(fn => {
        logger[fn] = (...args) => {
            logger.raw_log(fn, ...args);
        };
    });

    return logger;
}

export default getLogger;
export const Logger = getLogger();

export const closeLogger = async () => {
    return new Promise((resolve) => {
        Log4js.shutdown(() => {
            resolve();
        })
    });
};