import { RootResult } from '../result/RootResult';
export declare const reservedWords: string[];
interface ModifiableResult {
    optional?: boolean;
    nullable?: boolean;
    repeatable?: boolean;
}
export declare type CatharsisParseResult = CatharsisNameResult | CatharsisUnionResult | CatharsisGenericResult | CatharsisNullResult | CatharsisUndefinedResult | CatharsisAllResult | CatharsisUnknownResult | CatharsisFunctionResult | CatharsisRecordResult | CatharsisFieldResult;
export declare type CatharsisNameResult = ModifiableResult & {
    type: 'NameExpression';
    name: string;
    reservedWord?: boolean;
};
export declare type CatharsisUnionResult = ModifiableResult & {
    type: 'TypeUnion';
    elements: CatharsisParseResult[];
};
export declare type CatharsisGenericResult = ModifiableResult & {
    type: 'TypeApplication';
    expression: CatharsisParseResult;
    applications: CatharsisParseResult[];
};
export declare type CatharsisNullResult = ModifiableResult & {
    type: 'NullLiteral';
};
export declare type CatharsisUndefinedResult = ModifiableResult & {
    type: 'UndefinedLiteral';
};
export declare type CatharsisAllResult = ModifiableResult & {
    type: 'AllLiteral';
};
export declare type CatharsisUnknownResult = ModifiableResult & {
    type: 'UnknownLiteral';
};
export declare type CatharsisFunctionResult = ModifiableResult & {
    type: 'FunctionType';
    params: CatharsisParseResult[];
    result?: CatharsisParseResult;
    this?: CatharsisParseResult;
    new?: CatharsisParseResult;
};
export declare type CatharsisFieldResult = ModifiableResult & {
    type: 'FieldType';
    key: CatharsisParseResult;
    value: CatharsisParseResult | undefined;
};
export declare type CatharsisRecordResult = ModifiableResult & {
    type: 'RecordType';
    fields: CatharsisFieldResult[];
};
export declare function catharsisTransform(result: RootResult): CatharsisParseResult;
export {};
