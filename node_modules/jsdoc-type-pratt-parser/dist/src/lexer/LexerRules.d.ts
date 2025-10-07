import type { Token } from './Token.js';
type PartialToken = Omit<Token, 'startOfLine'>;
export type Rule = (text: string) => PartialToken | null;
/**
 * Gets the next literal (non-interpolation) portion of a text
 */
export declare function getTemplateLiteralLiteral(text: string): string | null;
/**
 * Will be processed highest precedence first
 */
export declare const rules: Rule[];
export declare const looseRules: Rule[];
export {};
