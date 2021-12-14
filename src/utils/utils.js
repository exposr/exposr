
export const signalWait = (signals, abort, result = undefined) => {
    if (!(signals instanceof Array)) {
        signals = [signals];
    }
    return new Promise((resolve, reject) => {
        const abortSignal = new AbortController();

        const handler = (arg) => {
            signals.forEach((signal) => {
                process.removeListener(signal, handler);
            });
            process.removeListener('abort', handler);

            abortSignal.abort();

            const signal = signals.find((signal) => signal == arg);
            if (signal == arg) {
                resolve(result ?? signal);
            } else {
                reject(new Error("operation aborted"));
            }
        }

        signals.forEach((signal) => {
            process.once(signal, handler);
        });
        abort.addEventListener('abort', handler, {
            once: true,
            signal: abortSignal.signal,
        });
    });
}