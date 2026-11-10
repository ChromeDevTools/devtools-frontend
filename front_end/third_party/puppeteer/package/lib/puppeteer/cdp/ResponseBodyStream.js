import { CDPSessionEvent } from '../api/CDPSession.js';
import { TargetCloseError } from '../common/Errors.js';
import { stringToTypedArray } from '../util/encoding.js';
/**
 * Streams the body of a response that is still loading, using
 * `Network.streamResourceContent` for the data received so far and
 * `Network.dataReceived` events for the rest.
 *
 * @internal
 */
export async function createResponseBodyStream(client, requestId) {
    let controller;
    // Events received before the buffered data is enqueued.
    let pending = [];
    const run = (action) => {
        if (pending) {
            pending.push(action);
        }
        else {
            action();
        }
    };
    const onDataReceived = (event) => {
        if (event.requestId !== requestId || !event.data) {
            return;
        }
        const chunk = stringToTypedArray(event.data, true);
        run(() => {
            controller.enqueue(chunk);
        });
    };
    const onLoadingFinished = (event) => {
        if (event.requestId !== requestId) {
            return;
        }
        cleanup();
        run(() => {
            controller.close();
        });
    };
    const onLoadingFailed = (event) => {
        if (event.requestId !== requestId) {
            return;
        }
        cleanup();
        run(() => {
            controller.error(new Error(`Loading failed: ${event.errorText}`));
        });
    };
    const onDisconnected = () => {
        cleanup();
        run(() => {
            controller.error(new TargetCloseError('Session closed.'));
        });
    };
    const cleanup = () => {
        client.off('Network.dataReceived', onDataReceived);
        client.off('Network.loadingFinished', onLoadingFinished);
        client.off('Network.loadingFailed', onLoadingFailed);
        client.off(CDPSessionEvent.Disconnected, onDisconnected);
    };
    const stream = new ReadableStream({
        start(streamController) {
            controller = streamController;
        },
        cancel() {
            cleanup();
        },
    });
    client.on('Network.dataReceived', onDataReceived);
    client.on('Network.loadingFinished', onLoadingFinished);
    client.on('Network.loadingFailed', onLoadingFailed);
    client.on(CDPSessionEvent.Disconnected, onDisconnected);
    let bufferedData;
    try {
        ({ bufferedData } = await client.send('Network.streamResourceContent', {
            requestId,
        }));
    }
    catch (error) {
        cleanup();
        throw error;
    }
    if (bufferedData) {
        controller.enqueue(stringToTypedArray(bufferedData, true));
    }
    const actions = pending;
    pending = null;
    for (const action of actions) {
        action();
    }
    return stream;
}
//# sourceMappingURL=ResponseBodyStream.js.map