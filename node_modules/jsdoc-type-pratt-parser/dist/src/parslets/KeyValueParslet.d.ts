import { ParsletFunction } from './Parslet';
export declare function createKeyValueParslet({ allowKeyTypes, allowReadonly, allowOptional, allowVariadic }: {
    allowKeyTypes: boolean;
    allowOptional: boolean;
    allowReadonly: boolean;
    allowVariadic: boolean;
}): ParsletFunction;
