import { Template, Strategy } from './models';
export interface ParseLiteralsOptions {
    fileName?: string;
    strategy?: Partial<Strategy<any>>;
}
export declare function parseLiterals(source: string, options?: ParseLiteralsOptions): Template[];
