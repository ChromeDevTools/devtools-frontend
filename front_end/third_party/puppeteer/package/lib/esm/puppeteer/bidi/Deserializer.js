/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import { debugError } from '../common/util.js';
/**
 * @internal
 */
export class BidiDeserializer {
    static deserializeNumber(value) {
        switch (value) {
            case '-0':
                return -0;
            case 'NaN':
                return NaN;
            case 'Infinity':
                return Infinity;
            case '-Infinity':
                return -Infinity;
            default:
                return value;
        }
    }
    static deserializeLocalValue(result) {
        switch (result.type) {
            case 'array':
                return result.value?.map(value => {
                    return BidiDeserializer.deserializeLocalValue(value);
                });
            case 'set':
                return result.value?.reduce((acc, value) => {
                    return acc.add(BidiDeserializer.deserializeLocalValue(value));
                }, new Set());
            case 'object':
                return result.value?.reduce((acc, tuple) => {
                    const { key, value } = BidiDeserializer.deserializeTuple(tuple);
                    acc[key] = value;
                    return acc;
                }, {});
            case 'map':
                return result.value?.reduce((acc, tuple) => {
                    const { key, value } = BidiDeserializer.deserializeTuple(tuple);
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
                return BidiDeserializer.deserializeNumber(result.value);
            case 'bigint':
                return BigInt(result.value);
            case 'boolean':
                return Boolean(result.value);
            case 'string':
                return result.value;
        }
        debugError(`Deserialization of type ${result.type} not supported.`);
        return undefined;
    }
    static deserializeTuple([serializedKey, serializedValue]) {
        const key = typeof serializedKey === 'string'
            ? serializedKey
            : BidiDeserializer.deserializeLocalValue(serializedKey);
        const value = BidiDeserializer.deserializeLocalValue(serializedValue);
        return { key, value };
    }
    static deserialize(result) {
        if (!result) {
            debugError('Service did not produce a result.');
            return undefined;
        }
        return BidiDeserializer.deserializeLocalValue(result);
    }
}
//# sourceMappingURL=Deserializer.js.map