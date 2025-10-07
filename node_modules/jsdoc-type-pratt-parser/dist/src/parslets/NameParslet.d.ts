import type { TokenType } from '../lexer/Token.js';
import { type ParsletFunction } from './Parslet.js';
export declare function createNameParslet({ allowedAdditionalTokens }: {
    allowedAdditionalTokens: TokenType[];
}): ParsletFunction;
