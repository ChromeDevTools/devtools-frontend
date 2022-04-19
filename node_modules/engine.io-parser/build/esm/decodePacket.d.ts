import { Packet, BinaryType, RawData } from "./commons.js";
declare const decodePacket: (encodedPacket: RawData, binaryType?: BinaryType) => Packet;
export default decodePacket;
