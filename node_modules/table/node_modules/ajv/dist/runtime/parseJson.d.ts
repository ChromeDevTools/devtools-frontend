export declare function parseJson(s: string, pos: number): unknown;
export declare namespace parseJson {
    var message: string | undefined;
    var position: number;
    var code: import("../compile/codegen/code")._Code;
}
export declare function parseJsonNumber(s: string, pos: number, maxDigits?: number): number | undefined;
export declare namespace parseJsonNumber {
    var message: string | undefined;
    var position: number;
    var code: import("../compile/codegen/code")._Code;
}
export declare function parseJsonString(s: string, pos: number): string | undefined;
export declare namespace parseJsonString {
    var message: string | undefined;
    var position: number;
    var code: import("../compile/codegen/code")._Code;
}
