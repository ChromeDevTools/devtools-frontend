// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Overlay} from './common.js';

export interface GreenDevAnchorsHighlight {
  nodeId: number;
  x: number;
  y: number;
}

export type GreenDevAnchorsToolMessage = {
  highlightType: 'greenDevFloaty',
  command: 'setInputValue',
  nodeId: number,
  value: string,
}|{
  highlightType: 'greenDevFloaty',
  command: 'debugMessage',
  message: string,
}|{
  highlightType: 'greenDevFloaty',
  command: 'openDevTools',
  nodeId: number,
}|{
  highlightType: 'greenDevFloaty',
  command: 'restoreFloaty',
  nodeId: number,
};

function consoleLog(message: string) {
  window.InspectorOverlayHost.send({highlightType: 'greenDevFloaty', command: 'debugMessage', message});
}

export interface GreenDevAnchorsDispatchMessage {
  nodeId: number;
  value: string;
}

export class GreenDevAnchorsOverlay extends Overlay {
  #anchorsContainer!: HTMLElement;
  #anchorsByNodeId = new Map<number, HTMLElement>();

  override install(): void {
    consoleLog('GreenDevAnchorsOverlay.install() called');

    this.document.body.classList.add('fill');

    const canvas = this.document.createElement('canvas');
    canvas.id = 'canvas';
    canvas.classList.add('fill');
    canvas.style.pointerEvents = 'none';
    this.document.body.append(canvas);

    const anchorsContainer = this.document.createElement('div');
    anchorsContainer.id = 'green-dev-anchors-container';
    this.document.body.append(anchorsContainer);
    this.#anchorsContainer = anchorsContainer;

    this.setCanvas(canvas);
    super.install();
  }

  override uninstall(): void {
    consoleLog('GreenDevAnchorsOverlay.uninstall() called');

    this.document.body.classList.remove('fill');
    if (this.#anchorsContainer && this.#anchorsContainer.parentElement) {
      this.#anchorsContainer.parentElement.removeChild(this.#anchorsContainer);
    }
    // Clear the map as the elements are removed from DOM.
    this.#anchorsByNodeId.clear();
    super.uninstall();
  }

  drawGreenDevAnchors(highlights: GreenDevAnchorsHighlight[]): void {
    if (this.#anchorsContainer && !this.#anchorsContainer.isConnected) {
      // The container was removed from the DOM (likely by PersistentOverlay.uninstall cleaning up),
      // but this overlay still thinks it's installed. We need to re-install to restore the DOM.
      try {
        this.uninstall();
      } catch (e) {
        console.error('Error during uninstall in drawGreenDevAnchors:', e);
      }
      this.install();
    }

    const newAnchorsByNodeId = new Map<number, HTMLElement>();

    for (const highlight of highlights) {
      const {x, y, nodeId} = highlight;
      let anchor = this.#anchorsByNodeId.get(nodeId);

      if (anchor) {
        anchor.style.left = `${x}px`;
        anchor.style.top = `${y}px`;
        // Remove from the old map so only anchors that need to be deleted remain.
        this.#anchorsByNodeId.delete(nodeId);
      } else {
        const newAnchor = this.drawGreenDevAnchor(highlight);
        if (!newAnchor) {
          continue;
        }
        anchor = newAnchor;
        anchor.style.left = `${x}px`;
        anchor.style.top = `${y}px`;
        this.#anchorsContainer.append(anchor);
      }
      newAnchorsByNodeId.set(nodeId, anchor);
    }

    // Remove any anchors that were not present in the new highlights list.
    for (const anchor of this.#anchorsByNodeId.values()) {
      anchor.remove();
    }

    this.#anchorsByNodeId = newAnchorsByNodeId;
  }

  private drawGreenDevAnchor(highlight: GreenDevAnchorsHighlight): HTMLElement {
    const {nodeId} = highlight;
    const anchor = this.document.createElement('div');
    anchor.classList.add('green-dev-anchor-minimal');

    const geminiIcon = this.document.createElement('div');
    geminiIcon.classList.add('green-dev-anchor-icon-gemini');
    anchor.append(geminiIcon);

    const openIcon = this.document.createElement('div');
    openIcon.classList.add('green-dev-anchor-icon-open');
    anchor.append(openIcon);

    const onEvent = (event: MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
    };

    openIcon.addEventListener('mousedown', onEvent);
    openIcon.addEventListener('mouseup', onEvent);
    openIcon.addEventListener('mousemove', onEvent);
    openIcon.addEventListener('mouseenter', onEvent);
    openIcon.addEventListener('mouseleave', onEvent);
    openIcon.addEventListener('click', (event: MouseEvent) => {
      onEvent(event);
      window.InspectorOverlayHost.send({highlightType: 'greenDevFloaty', command: 'openDevTools', nodeId});
    });

    anchor.addEventListener('mousedown', onEvent);
    anchor.addEventListener('mouseup', onEvent);
    anchor.addEventListener('mousemove', onEvent);
    anchor.addEventListener('mouseenter', onEvent);
    anchor.addEventListener('mouseleave', onEvent);
    anchor.addEventListener('click', (event: MouseEvent) => {
      if (event.target !== anchor && !anchor.contains(event.target as Node)) {
        return;
      }
      onEvent(event);
      window.InspectorOverlayHost.send({highlightType: 'greenDevFloaty', command: 'restoreFloaty', nodeId});
    });

    return anchor;
  }
}
