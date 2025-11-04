import * as SDK from '../core/sdk/sdk.js';
export declare class Printer extends SDK.CSSPropertyParser.TreeWalker {
    #private;
    protected enter({ node }: SDK.CSSPropertyParser.SyntaxNodeRef): boolean;
    protected leave(): void;
    get(): string;
    static log(ast: SDK.CSSPropertyParser.SyntaxTree): void;
    static rule(rule: string): string;
}
