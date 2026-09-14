// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Api from '../api/api.js';

class WebWorkerScope implements Api.HostRuntime.WorkerScope {
  postMessage(message: unknown, transfer?: Api.HostRuntime.WorkerTransferable[]): void {
    // Type for frame.postMessage is conflicting here.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    self.postMessage(message, transfer as any);
  }

  set onmessage(listener: (event: Api.HostRuntime.WorkerMessageEvent) => Promise<void>| void) {
    self.addEventListener('message', listener);
  }
}

class WebWorker implements Api.HostRuntime.Worker {
  readonly #workerPromise: Promise<Worker>;
  #disposed?: boolean;
  #rejectWorkerPromise?: (error: Error) => void;

  constructor(workerLocation: string) {
    this.#workerPromise = new Promise((fulfill, reject) => {
      this.#rejectWorkerPromise = reject;
      const worker = new Worker(new URL(workerLocation), {type: 'module'});
      worker.onerror = event => {
        console.error(`Failed to load worker for ${workerLocation}:`, event);
      };
      worker.onmessage = (event: MessageEvent<unknown>) => {
        console.assert(event.data === 'workerReady');
        worker.onmessage = null;
        fulfill(worker);
      };
    });
  }

  postMessage(message: unknown, transfer?: Api.HostRuntime.WorkerTransferable[]): void {
    void this.#workerPromise.then(worker => {
      if (!this.#disposed) {
        worker.postMessage(message, transfer ?? []);
      }
    });
  }

  dispose(): void {
    this.#disposed = true;
    void this.#workerPromise.then(worker => worker.terminate());
  }

  terminate(immediately = false): void {
    if (immediately) {
      this.#rejectWorkerPromise?.(new Error('Worker terminated'));
    }
    this.dispose();
  }

  set onmessage(listener: (event: Api.HostRuntime.WorkerMessageEvent) => void) {
    void this.#workerPromise.then(worker => {
      worker.onmessage = listener;
    });
  }

  set onerror(listener: (event: unknown) => void) {
    void this.#workerPromise.then(worker => {
      worker.onerror = listener;
    });
  }
}

let lastScreenshotBlobUrl: string|null = null;

function revokeLastScreenshotUrl(): void {
  if (lastScreenshotBlobUrl) {
    URL.revokeObjectURL(lastScreenshotBlobUrl);
    lastScreenshotBlobUrl = null;
  }
}

async function saveScreenshot(options: Api.HostRuntime.ScreenshotOptions): Promise<void> {
  const pageImage = new Image();
  await new Promise<void>((resolve, reject) => {
    pageImage.onload = () => resolve();
    pageImage.onerror = () => reject(new Error('Failed to load image for screenshot'));
    pageImage.src = 'data:image/png;base64,' + options.base64Png;
  });

  let canvas: OffscreenCanvas;
  if (options.clip) {
    const scale = pageImage.naturalWidth / options.clip.screenRectWidth;
    const screenRectWidth = options.clip.screenRectWidth * scale;
    const screenRectHeight = options.clip.screenRectHeight * scale;
    const contentLeft = options.clip.visiblePageRectLeft * scale;
    const contentTop = options.clip.visiblePageRectTop * scale;

    canvas = new OffscreenCanvas(
        Math.floor(screenRectWidth),
        // Cap the height to not hit the GPU limit.
        // https://crbug.com/1260828
        Math.min(1 << 14, Math.floor(screenRectHeight)),
    );
    const ctx = canvas.getContext('2d', {willReadFrequently: true});
    if (!ctx) {
      throw new Error('Could not get 2d context from canvas.');
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(pageImage, Math.floor(contentLeft), Math.floor(contentTop));
  } else {
    canvas = new OffscreenCanvas(
        pageImage.naturalWidth,
        Math.min(1 << 14, Math.floor(pageImage.naturalHeight)),
    );
    const ctx = canvas.getContext('2d', {willReadFrequently: true});
    if (!ctx) {
      throw new Error('Could not get 2d context for base64 screenshot.');
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(pageImage, 0, 0);
  }

  revokeLastScreenshotUrl();
  /* eslint-disable-next-line @devtools/no-imperative-dom-api */
  const link = document.createElement('a');
  link.download = options.fileName + '.png';
  const blob = await canvas.convertToBlob({type: 'image/png'});
  const blobUrl = URL.createObjectURL(blob);
  lastScreenshotBlobUrl = blobUrl;
  link.href = blobUrl;
  link.click();
}

export const HOST_RUNTIME: Api.HostRuntime.HostRuntime = {
  createWorker(url: string): Api.HostRuntime.Worker {
    return new WebWorker(url);
  },
  workerScope: new WebWorkerScope(),
  getOnLine(): boolean {
    return navigator.onLine;
  },
  getUserAgent(): string {
    return navigator.userAgent;
  },
  getLocalStorage(): Storage |
      undefined {
        return 'localStorage' in globalThis ? globalThis.localStorage : undefined;
      },
  getDevicePixelRatio(): number {
    return window.devicePixelRatio;
  },
  saveScreenshot,
  revokeLastScreenshotUrl,
};
