import { Line, BlockMarkers } from '../primitives';
export interface Options {
    startLine: number;
    markers: BlockMarkers;
}
export declare type Parser = (source: string) => Line[] | null;
export default function getParser({ startLine, markers, }?: Partial<Options>): Parser;
