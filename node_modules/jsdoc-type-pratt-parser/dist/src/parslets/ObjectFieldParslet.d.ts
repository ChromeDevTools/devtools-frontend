import { type ParsletFunction } from './Parslet.js';
export declare function createObjectFieldParslet({ allowSquaredProperties, allowKeyTypes, allowReadonly, allowOptional }: {
    allowSquaredProperties: boolean;
    allowKeyTypes: boolean;
    allowOptional: boolean;
    allowReadonly: boolean;
}): ParsletFunction;
