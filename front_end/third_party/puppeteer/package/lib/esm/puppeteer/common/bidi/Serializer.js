import { debugError, isDate, isPlainObject, isRegExp } from '../util.js';
import { JSHandle } from './JSHandle.js';
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
                return BidiSerializer.serializeRemoveValue(subArg);
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
                    BidiSerializer.serializeRemoveValue(key),
                    BidiSerializer.serializeRemoveValue(arg[key]),
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
    static serializeRemoveValue(arg) {
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
    static serialize(arg, context) {
        // TODO: See use case of LazyArgs
        const objectHandle = arg && arg instanceof JSHandle ? arg : null;
        if (objectHandle) {
            if (objectHandle.context() !== context) {
                throw new Error('JSHandles can be evaluated only in the context they were created!');
            }
            if (objectHandle.disposed) {
                throw new Error('JSHandle is disposed!');
            }
            return objectHandle.bidiObject();
        }
        return BidiSerializer.serializeRemoveValue(arg);
    }
    static deserializeNumber(value) {
        switch (value) {
            case '-0':
                return -0;
            case 'NaN':
                return NaN;
            case 'Infinity':
            case '+Infinity':
                return Infinity;
            case '-Infinity':
                return -Infinity;
            default:
                return value;
        }
    }
    static deserializeLocalValue(result) {
        var _a;
        switch (result.type) {
            case 'array':
                // TODO: Check expected output when value is undefined
                return (_a = result.value) === null || _a === void 0 ? void 0 : _a.map(value => {
                    return BidiSerializer.deserializeLocalValue(value);
                });
            case 'set':
                // TODO: Check expected output when value is undefined
                return result.value.reduce((acc, value) => {
                    return acc.add(BidiSerializer.deserializeLocalValue(value));
                }, new Set());
            case 'object':
                if (result.value) {
                    return result.value.reduce((acc, tuple) => {
                        const { key, value } = BidiSerializer.deserializeTuple(tuple);
                        acc[key] = value;
                        return acc;
                    }, {});
                }
                break;
            case 'map':
                return result.value.reduce((acc, tuple) => {
                    const { key, value } = BidiSerializer.deserializeTuple(tuple);
                    return acc.set(key, value);
                }, new Map());
            case 'promise':
                return {};
            case 'regexp':
                return new RegExp(result.value.pattern, result.value.flags);
            case 'date':
                return new Date(result.value);
            case 'undefined':
                return undefined;
            case 'null':
                return null;
            case 'number':
                return BidiSerializer.deserializeNumber(result.value);
            case 'bigint':
                return BigInt(result.value);
            case 'boolean':
                return Boolean(result.value);
            case 'string':
                return result.value;
        }
        throw new UnserializableError(`Deserialization of type ${result.type} not supported.`);
    }
    static deserializeTuple([serializedKey, serializedValue]) {
        const key = typeof serializedKey === 'string'
            ? serializedKey
            : BidiSerializer.deserializeLocalValue(serializedKey);
        const value = BidiSerializer.deserializeLocalValue(serializedValue);
        return { key, value };
    }
    static deserialize(result) {
        if (!result) {
            debugError('Service did not produce a result.');
            return undefined;
        }
        try {
            return BidiSerializer.deserializeLocalValue(result);
        }
        catch (error) {
            if (error instanceof UnserializableError) {
                debugError(error.message);
                return undefined;
            }
            throw error;
        }
    }
}
//# sourceMappingURL=Serializer.js.map