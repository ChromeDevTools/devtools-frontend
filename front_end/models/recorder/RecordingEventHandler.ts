// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';

import type {RecordingSession} from './RecordingSession.js';
import {hasCondition, hasFrameContext} from './Steps.js';
import type {Condition, FrameContext, Step} from './Steps.js';

export class RecordingEventHandler {
  private target: SDK.Target.Target;
  private session: RecordingSession;
  private resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel;
  private lastStep: Step|null;
  private lastStepTimeout: number|null;

  constructor(session: RecordingSession, target: SDK.Target.Target) {
    this.target = target;
    this.session = session;
    this.lastStep = null;
    this.lastStepTimeout = null;

    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (!resourceTreeModel) {
      throw new Error('ResourceTreeModel instance is missing for the target: ' + target.id());
    }
    this.resourceTreeModel = resourceTreeModel;
  }

  getTarget(): string {
    return this.target.id() === 'main' ? 'main' : this.target.inspectedURL();
  }

  getContextForFrame(frame: SDK.ResourceTreeModel.ResourceTreeFrame): FrameContext {
    const path = [];
    let currentFrame: SDK.ResourceTreeModel.ResourceTreeFrame = frame;
    while (currentFrame) {
      const parentFrame = currentFrame.parentFrame();
      if (!parentFrame) {
        break;
      }

      const childFrames = parentFrame.childFrames;
      const index = childFrames.indexOf(currentFrame);
      path.unshift(index);
      currentFrame = parentFrame;
    }

    const target = this.getTarget();
    return {
      target,
      path,
    };
  }

  bindingCalled(frameId: string, step: Step): void {
    const frame = this.resourceTreeModel.frameForId(frameId);
    if (!frame) {
      throw new Error('Could not find frame.');
    }

    const context = this.getContextForFrame(frame);

    if (hasFrameContext(step)) {
      this.appendStep({...step, context});
    } else {
      this.appendStep(step);
    }
  }

  async appendStep(step: Step): Promise<void> {
    this.lastStep = await this.session.appendStep(step);
    if (this.lastStepTimeout) {
      window.clearTimeout(this.lastStepTimeout);
    }
    this.lastStepTimeout = window.setTimeout(() => {
      this.lastStep = null;
      this.lastStepTimeout = null;
    }, 1000);
  }

  addConditionToLastStep(condition: Condition): void {
    if (!this.lastStep) {
      return;
    }

    if (hasCondition(this.lastStep)) {
      this.session.addConditionToStep(this.lastStep, condition);
    }
  }

  targetDestroyed(): void {
    // TODO: figure out how this works with sections
    // this.appendStep(new CloseStep(this.getTarget()));
  }

  targetInfoChanged(url: string): void {
    this.addConditionToLastStep({
      type: 'waitForNavigation',
      expectedUrl: url,
    });
  }
}
