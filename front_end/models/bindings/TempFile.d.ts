import * as Common from '../../core/common/common.js';
import { type ChunkedReader } from './FileUtils.js';
export declare class TempFile {
    #private;
    constructor();
    write(pieces: Array<string | Blob>): void;
    read(): Promise<string | null>;
    size(): number;
    readRange(startOffset?: number, endOffset?: number): Promise<string | null>;
    copyToOutputStream(outputStream: Common.StringOutputStream.OutputStream, progress?: ((arg0: ChunkedReader) => void)): Promise<DOMError | null>;
    remove(): void;
}
