import * as Bidi from 'chromium-bidi/lib/cjs/protocol/protocol.js';
/**
 * @internal
 */
export declare class BidiSerializer {
    static serializeNumber(arg: number): Bidi.CommonDataTypes.LocalOrRemoteValue;
    static serializeObject(arg: object | null): Bidi.CommonDataTypes.LocalOrRemoteValue;
    static serializeRemoveValue(arg: unknown): Bidi.CommonDataTypes.LocalOrRemoteValue;
    static serialize(arg: unknown): Bidi.CommonDataTypes.LocalOrRemoteValue;
    static deserializeNumber(value: Bidi.CommonDataTypes.SpecialNumber | number): number;
    static deserializeLocalValue(result: Bidi.CommonDataTypes.RemoteValue): unknown;
    static deserializeTuple([serializedKey, serializedValue]: [
        Bidi.CommonDataTypes.RemoteValue | string,
        Bidi.CommonDataTypes.RemoteValue
    ]): {
        key: unknown;
        value: unknown;
    };
    static deserialize(result: Bidi.CommonDataTypes.RemoteValue): unknown;
}
//# sourceMappingURL=Serializer.d.ts.map