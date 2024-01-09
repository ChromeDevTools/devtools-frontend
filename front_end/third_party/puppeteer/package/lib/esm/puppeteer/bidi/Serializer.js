/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import { LazyArg } from '../common/LazyArg.js';
import { isDate, isPlainObject, isRegExp } from '../common/util.js';
import { BidiElementHandle } from './ElementHandle.js';
import { BidiJSHandle } from './JSHandle.js';
/**
 * @internal
 */
class UnserializableError extends Error {
}
/**
 * @internal
 */
export class BidiSerializer {
    static serializeNumber(arg) {
        let value;
        if (Object.is(arg, -0)) {
            value = '-0';
        }
        else if (Object.is(arg, Infinity)) {
            value = 'Infinity';
        }
        else if (Object.is(arg, -Infinity)) {
            value = '-Infinity';
        }
        else if (Object.is(arg, NaN)) {
            value = 'NaN';
        }
        else {
            value = arg;
        }
        return {
            type: 'number',
            value,
        };
    }
    static serializeObject(arg) {
        if (arg === null) {
            return {
                type: 'null',
            };
        }
        else if (Array.isArray(arg)) {
            const parsedArray = arg.map(subArg => {
                return BidiSerializer.serializeRemoteValue(subArg);
            });
            return {
                type: 'array',
                value: parsedArray,
            };
        }
        else if (isPlainObject(arg)) {
            try {
                JSON.stringify(arg);
            }
            catch (error) {
                if (error instanceof TypeError &&
                    error.message.startsWith('Converting circular structure to JSON')) {
                    error.message += ' Recursive objects are not allowed.';
                }
                throw error;
            }
            const parsedObject = [];
            for (const key in arg) {
                parsedObject.push([
                    BidiSerializer.serializeRemoteValue(key),
                    BidiSerializer.serializeRemoteValue(arg[key]),
                ]);
            }
            return {
                type: 'object',
                value: parsedObject,
            };
        }
        else if (isRegExp(arg)) {
            return {
                type: 'regexp',
                value: {
                    pattern: arg.source,
                    flags: arg.flags,
                },
            };
        }
        else if (isDate(arg)) {
            return {
                type: 'date',
                value: arg.toISOString(),
            };
        }
        throw new UnserializableError('Custom object sterilization not possible. Use plain objects instead.');
    }
    static serializeRemoteValue(arg) {
        switch (typeof arg) {
            case 'symbol':
            case 'function':
                throw new UnserializableError(`Unable to serializable ${typeof arg}`);
            case 'object':
                return BidiSerializer.serializeObject(arg);
            case 'undefined':
                return {
                    type: 'undefined',
                };
            case 'number':
                return BidiSerializer.serializeNumber(arg);
            case 'bigint':
                return {
                    type: 'bigint',
                    value: arg.toString(),
                };
            case 'string':
                return {
                    type: 'string',
                    value: arg,
                };
            case 'boolean':
                return {
                    type: 'boolean',
                    value: arg,
                };
        }
    }
    static async serialize(sandbox, arg) {
        if (arg instanceof LazyArg) {
            arg = await arg.get(sandbox.realm);
        }
        // eslint-disable-next-line rulesdir/use-using -- We want this to continue living.
        const objectHandle = arg && (arg instanceof BidiJSHandle || arg instanceof BidiElementHandle)
            ? arg
            : null;
        if (objectHandle) {
            if (objectHandle.realm.environment.context() !==
                sandbox.environment.context()) {
                throw new Error('JSHandles can be evaluated only in the context they were created!');
            }
            if (objectHandle.disposed) {
                throw new Error('JSHandle is disposed!');
            }
            return objectHandle.remoteValue();
        }
        return BidiSerializer.serializeRemoteValue(arg);
    }
}
//# sourceMappingURL=Serializer.js.map