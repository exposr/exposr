import assert from 'assert/strict';
import Mutex from '../src/utils/mutex.js';
import { setTimeout } from 'timers/promises';

describe(`mutex`, () => {

    it(`can be acquired and released`, async () => {
        const mutex = new Mutex();

        await mutex.acquire();
        assert(mutex._locked == true);

        mutex.release();
        assert(mutex._locked == false);
    });

    it(`can protect a shared resource`, async () => {
        let token = 0;
        const get = async () => {
            const res = token;
            await setTimeout(Math.floor(Math.random() * 2) + 1);
            return res; 
        };

        const put = async (val) => {
            await setTimeout(Math.floor(Math.random() * 5) + 1);
            const res = val == token;
            token++;
            return res; 
        };

        const non_protected_routine = async () => {
            const t = await get();
            return await put(t);
        };

        let result = [];
        for (let i = 0; i < 10; i++) {
            result.push(non_protected_routine());
        }

        result = await Promise.allSettled(result);
        result = result.map(({status, value}) => value).filter((value) => value == true);
        assert(result.length != 10, "non-protected routine succeeded without mutex");

        const mutex = new Mutex();
        const protected_routine = async () => {
            await mutex.acquire();
            const t = await get();
            const res = await put(t);
            mutex.release();
            return res;
        };

        result = [];
        for (let i = 0; i < 10; i++) {
            result.push(protected_routine());
        }

        result = await Promise.allSettled(result);
        result = result.map(({status, value}) => value).filter((value) => value == true);
        assert(result.length == 10, "protected routine failed to serialize");
    });

    it(`acquire can be cancelled`, async () => {
        const mutex = new Mutex();

        await mutex.acquire();

        const cancel = new AbortController();
        const pending = mutex.acquire(cancel.signal).catch((val) => { return val });
        const pending2 = mutex.acquire();

        cancel.abort();
        mutex.release();

        let result = await pending;
        assert(result == false, "mutex acquire was not cancelled");

        result = await pending2;
        assert(result == true, "did not acquire mutex after cancellation");
        assert(mutex._locked == true, "mutex not locked");

    });
});