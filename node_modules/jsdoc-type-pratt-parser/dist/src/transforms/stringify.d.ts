import { TransformRules } from './transform';
import { RootResult } from '../result/RootResult';
export declare function quote(value: string, quote: 'single' | 'double' | undefined): string;
export declare function stringifyRules(): TransformRules<string>;
export declare function stringify(result: RootResult): string;
