export declare function setCompressImplementationForTest(impl: typeof realCompress | null): void;
/**
 * Decodes and scales an image file so that its largest dimension does not exceed 1024 pixels,
 * preserving the original aspect ratio. The image is then compressed to a JPEG format at 80% quality.
 *
 * This reduces the payload size for base64 encoding and prevents out-of-memory errors in the AIDA API.
 *
 * @param file The raw Image file to be resized and compressed.
 * @returns A promise resolving to the base64-encoded string and MIME type.
 */
export declare function compress(file: File): Promise<{
    data: string;
    mimeType: string;
}>;
declare function realCompress(file: File): Promise<{
    data: string;
    mimeType: string;
}>;
export {};
