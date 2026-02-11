import { Overlay } from './common.js';
export interface GreenDevAnchorsHighlight {
    nodeId: number;
    x: number;
    y: number;
}
export type GreenDevAnchorsToolMessage = {
    highlightType: 'greenDevFloaty';
    command: 'setInputValue';
    nodeId: number;
    value: string;
} | {
    highlightType: 'greenDevFloaty';
    command: 'debugMessage';
    message: string;
} | {
    highlightType: 'greenDevFloaty';
    command: 'openDevTools';
    nodeId: number;
} | {
    highlightType: 'greenDevFloaty';
    command: 'restoreFloaty';
    nodeId: number;
};
export interface GreenDevAnchorsDispatchMessage {
    nodeId: number;
    value: string;
}
export declare class GreenDevAnchorsOverlay extends Overlay {
    #private;
    install(): void;
    uninstall(): void;
    drawGreenDevAnchors(highlights: GreenDevAnchorsHighlight[]): void;
    private drawGreenDevAnchor;
}
