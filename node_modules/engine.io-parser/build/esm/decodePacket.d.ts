declare const decodePacket: (encodedPacket: any, binaryType?: any) => {
    type: string;
    data: any;
} | {
    type: any;
    data: string;
} | {
    type: any;
    data?: undefined;
};
export default decodePacket;
