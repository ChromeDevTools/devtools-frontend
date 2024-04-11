// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {type AnimationGroup} from './AnimationModel.js';
import {AnimationUI} from './AnimationUI.js';

export class AnimationGroupPreviewUI {
  #model: AnimationGroup;
  element: HTMLButtonElement;
  readonly #removeButtonInternal: HTMLElement;
  readonly #replayOverlayElement: HTMLElement;
  readonly #svg: Element;
  readonly #viewBoxHeight: number;

  constructor(model: AnimationGroup) {
    this.#model = model;
    this.element = document.createElement('button');
    this.element.setAttribute(
        'jslog', `${VisualLogging.item(`animations.buffer-preview${model.isScrollDriven() ? '-sda' : ''}`).track({
          click: true,
        })}`);
    this.element.classList.add('animation-buffer-preview');
    this.element.addEventListener('animationend', () => {
      this.element.classList.add('no-animation');
    });

    this.element.createChild('div', 'animation-paused fill');

    if (model.isScrollDriven()) {
      this.element.appendChild(IconButton.Icon.create('mouse', 'preview-icon'));
    } else {
      this.element.appendChild(IconButton.Icon.create('watch', 'preview-icon'));
    }

    this.#removeButtonInternal = this.element.createChild('button', 'animation-remove-button');
    this.#removeButtonInternal.setAttribute(
        'jslog', `${VisualLogging.action('animations.remove-preview').track({click: true})}`);
    this.#removeButtonInternal.appendChild(IconButton.Icon.create('cross'));
    this.#replayOverlayElement = this.element.createChild('div', 'animation-buffer-preview-animation');
    this.#svg = UI.UIUtils.createSVGChild(this.element, 'svg');
    this.#svg.setAttribute('width', '100%');
    this.#svg.setAttribute('preserveAspectRatio', 'none');
    this.#svg.setAttribute('height', '100%');
    this.#viewBoxHeight = 32;
    this.#svg.setAttribute('viewBox', '0 0 100 ' + this.#viewBoxHeight);
    this.#svg.setAttribute('shape-rendering', 'crispEdges');
    this.render();
  }

  removeButton(): Element {
    return this.#removeButtonInternal;
  }

  replay(): void {
    this.#replayOverlayElement.animate(
        [
          {offset: 0, width: '0%', opacity: 1},
          {offset: 0.9, width: '100%', opacity: 1},
          {offset: 1, width: '100%', opacity: 0},
        ],
        {duration: 200, easing: 'cubic-bezier(0, 0, 0.2, 1)'});
  }

  render(): void {
    this.#svg.removeChildren();
    const maxToShow = 10;
    const numberOfAnimations = Math.min(this.#model.animations().length, maxToShow);
    const timeToPixelRatio = 100 / Math.max(this.#model.groupDuration(), 750);
    for (let i = 0; i < numberOfAnimations; i++) {
      const animation = this.#model.animations()[i];
      const line = UI.UIUtils.createSVGChild(this.#svg, 'line') as SVGLineElement;

      const startPoint = animation.delayOrStartTime();
      const endPoint = startPoint + animation.iterationDuration();

      line.setAttribute('x1', String(startPoint * timeToPixelRatio));
      line.setAttribute('x2', String(endPoint * timeToPixelRatio));
      const y = String(Math.floor(this.#viewBoxHeight / Math.max(6, numberOfAnimations) * i + 1));
      line.setAttribute('y1', y);
      line.setAttribute('y2', y);
      line.style.stroke = AnimationUI.colorForAnimation(this.#model.animations()[i]);
    }
  }
}
