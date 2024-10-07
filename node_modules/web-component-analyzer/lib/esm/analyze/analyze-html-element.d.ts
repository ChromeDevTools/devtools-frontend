import * as tsModule from "typescript";
import { Program } from "typescript";
import { ComponentDeclaration } from "./types/component-declaration";
/**
 * This function only analyzes the HTMLElement declaration found in "lib.dom.d.ts" source file provided by Typescript.
 * @param program
 * @param ts
 */
export declare function analyzeHTMLElement(program: Program, ts?: typeof tsModule): ComponentDeclaration | undefined;
//# sourceMappingURL=analyze-html-element.d.ts.map