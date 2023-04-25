import { ITransport } from '../utils/transport.js';
export declare class BidiServerRunner {
    #private;
    /**
     *
     * @param bidiPort port to start ws server on
     * @param onNewBidiConnectionOpen delegate to be called for each new
     * connection. `onNewBidiConnectionOpen` delegate should return another
     * `onConnectionClose` delegate, which will be called after the connection is
     * closed.
     */
    run(bidiPort: number, onNewBidiConnectionOpen: (bidiServer: ITransport) => Promise<() => void> | (() => void)): void;
}
