import { Polling as XHR } from "./polling";
import { WebSocket } from "./websocket";
declare const _default: {
    polling: typeof polling;
    websocket: typeof WebSocket;
};
export default _default;
/**
 * Polling polymorphic constructor.
 *
 * @api private
 */
declare function polling(req: any): XHR;
declare namespace polling {
    var upgradesTo: string[];
}
