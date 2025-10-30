/**
 * Quickly determine if gzipped, by seeing if the first 3 bytes of the file header match the gzip signature
 */
export declare function isGzip(ab: ArrayBuffer): boolean;
/** Decode a gzipped _or_ plain text ArrayBuffer to a decoded string */
export declare function arrayBufferToString(ab: ArrayBuffer): Promise<string>;
export declare function fileToString(file: File): Promise<string>;
/**
 * Decompress a gzipped ArrayBuffer to a string.
 * Consider using `arrayBufferToString` instead, which can handle both gzipped and plain text buffers.
 */
export declare function decompress(gzippedBuffer: ArrayBuffer): Promise<string>;
export declare function compress(str: string): Promise<ArrayBuffer>;
export declare function decompressStream(stream: ReadableStream): ReadableStream;
export declare function compressStream(stream: ReadableStream): ReadableStream;
