import type { CodeKeywordDefinition } from "../../types";
export declare type IntType = "int8" | "uint8" | "int16" | "uint16" | "int32" | "uint32";
export declare const intRange: {
    [T in IntType]: [number, number, number];
};
declare const def: CodeKeywordDefinition;
export default def;
