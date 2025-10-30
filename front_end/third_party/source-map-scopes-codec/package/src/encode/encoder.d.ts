import type { ScopeInfo } from "../scopes.d.ts";
export declare class Encoder {
    #private;
    constructor(info: ScopeInfo, names: string[]);
    encode(): string;
}
