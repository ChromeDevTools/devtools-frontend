import encodePacket from "./encodePacket.js";
import decodePacket from "./decodePacket.js";
declare const encodePayload: (packets: any, callback: any) => void;
declare const decodePayload: (encodedPayload: any, binaryType?: any) => any[];
export declare const protocol = 4;
export { encodePacket, encodePayload, decodePacket, decodePayload };
