// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * This file contains the overlay script that is injected into the page when the
 * BreakpointDebuggerAgent is waiting for a user action.
 *
 * This is a temporary solution for the prototype. In the long term, we should
 * use a proper overlay or a different mechanism to communicate with the user,
 * rather than injecting a script into the page. This approach is fine for the
 * prototype but should be replaced before production.
 */
import * as SDK from '../../../core/sdk/sdk.js';
export async function injectOverlay() {
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const primaryTarget = targetManager.primaryPageTarget();
    await primaryTarget?.runtimeAgent().invoke_evaluate({
        expression: WAIT_FOR_USER_ACTION_OVERLAY_SCRIPT,
    });
}
export async function removeOverlay() {
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const primaryTarget = targetManager.primaryPageTarget();
    await primaryTarget?.runtimeAgent().invoke_evaluate({
        expression: REMOVE_OVERLAY_SCRIPT,
    });
}
const WAIT_FOR_USER_ACTION_OVERLAY_SCRIPT = `
(function() {
  const devtoolsOverlayId = 'devtools-waiting-overlay';
  let overlay = document.getElementById(devtoolsOverlayId);
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = devtoolsOverlayId;
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '2147483647';
    overlay.style.boxSizing = 'border-box';
    overlay.style.border = '10px solid red';
    overlay.style.animation = 'devtools-fade 1.5s infinite alternate';
    const text = document.createElement('div');
    text.innerText = 'Trigger the breakpoint again';
    text.style.position = 'absolute';
    text.style.top = '10px';
    text.style.left = '50%';
    text.style.transform = 'translateX(-50%)';
    text.style.backgroundColor = 'red';
    text.style.color = 'white';
    text.style.padding = '10px 20px';
    text.style.borderRadius = '5px';
    text.style.fontFamily = 'system-ui, sans-serif';
    text.style.fontSize = '16px';
    text.style.fontWeight = 'bold';
    text.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    overlay.appendChild(text);

    const style = document.createElement('style');
    style.id = devtoolsOverlayId + '-style';
    style.innerText = '@keyframes devtools-fade { from { opacity: 0.5; } to { opacity: 1; } }';
    // Head might not exist immediately on a completely blank page, fallback to documentElement
    (document.head || document.documentElement).appendChild(style);

    document.documentElement.appendChild(overlay);
  }
})();
`;
const REMOVE_OVERLAY_SCRIPT = `
(function() {
  const devtoolsOverlayId = 'devtools-waiting-overlay';
  const overlay = document.getElementById(devtoolsOverlayId);
  if (overlay) overlay.remove();
  const style = document.getElementById(devtoolsOverlayId + '-style');
  if (style) style.remove();
})();
`;
//# sourceMappingURL=BreakpointDebuggerAgentOverlay.js.map