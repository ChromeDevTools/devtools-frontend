import { type GreenDevAnchorsToolMessage } from './tool_green_dev_anchors.js';
import { type PausedToolMessage } from './tool_paused.js';
import { type PersistentToolMessage } from './tool_persistent.js';
import { type ScreenshotToolMessage } from './tool_screenshot.js';
declare global {
    interface Window {
        InspectorOverlayHost: {
            send(data: PausedToolMessage | PersistentToolMessage | ScreenshotToolMessage | GreenDevAnchorsToolMessage | string): void;
        };
    }
}
