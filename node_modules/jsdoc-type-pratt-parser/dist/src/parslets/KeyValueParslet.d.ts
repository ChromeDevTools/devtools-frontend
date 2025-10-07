import { type ParsletFunction } from './Parslet.js';
export declare function createKeyValueParslet({ allowOptional, allowVariadic, acceptParameterList }: {
    allowOptional: boolean;
    allowVariadic: boolean;
    acceptParameterList?: boolean;
}): ParsletFunction;
