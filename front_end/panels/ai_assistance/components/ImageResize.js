// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
const MAX_DIMENSION_PX = 1024;
let compressImplementation = realCompress;
export function setCompressImplementationForTest(impl) {
    compressImplementation = impl ?? realCompress;
}
/**
 * Decodes and scales an image file so that its largest dimension does not exceed 1024 pixels,
 * preserving the original aspect ratio. The image is then compressed to a JPEG format at 80% quality.
 *
 * This reduces the payload size for base64 encoding and prevents out-of-memory errors in the AIDA API.
 *
 * @param file The raw Image file to be resized and compressed.
 * @returns A promise resolving to the base64-encoded string and MIME type.
 */
export async function compress(file) {
    return await compressImplementation(file);
}
async function realCompress(file) {
    const bitmap = await createImageBitmap(file);
    try {
        let width = bitmap.width;
        let height = bitmap.height;
        if (width > MAX_DIMENSION_PX || height > MAX_DIMENSION_PX) {
            if (width > height) {
                height = Math.round((height * MAX_DIMENSION_PX) / width);
                width = MAX_DIMENSION_PX;
            }
            else {
                width = Math.round((width * MAX_DIMENSION_PX) / height);
                height = MAX_DIMENSION_PX;
            }
        }
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2d context');
        }
        ctx.drawImage(bitmap, 0, 0, width, height);
        const blob = await canvas.convertToBlob({
            type: 'image/jpeg',
            quality: 0.8,
        });
        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result;
                const base64Data = result.split(',')[1];
                resolve(base64Data);
            };
            reader.onerror = () => reject(new Error('Failed to read compressed blob'));
            reader.readAsDataURL(blob);
        });
        return {
            data: base64,
            mimeType: 'image/jpeg',
        };
    }
    finally {
        // Explicitly close the ImageBitmap to prevent GPU/graphics memory leaks.
        bitmap.close();
    }
}
//# sourceMappingURL=ImageResize.js.map