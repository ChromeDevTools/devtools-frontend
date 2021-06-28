// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';

import type {RecordingSession} from './RecordingSession.js';
import {hasCondition} from './Steps.js';
import type {FrameContext, Step} from './Steps.js';
import type {Step as ClientStep} from './RecordingClient.js';
import {clientStepHasFrameContext} from './RecordingClient.js';

export class RecordingEventHandler {
  private target: SDK.Target.Target;
  private session: RecordingSession;
  private resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel;
  private lastStep: Step|null;

  constructor(session: RecordingSession, target: SDK.Target.Target) {
    this.target = target;
    this.session = session;
    this.lastStep = null;

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

  bindingCalled(frameId: string, step: ClientStep): void {
    const frame = this.resourceTreeModel.frameForId(frameId);
    if (!frame) {
      throw new Error('Could not find frame.');
    }

    const context = this.getContextForFrame(frame);

    if (step.type === 'beforeunload') {
      if (this.lastStep && hasCondition(this.lastStep)) {
        this.lastStep.condition = {
          type: 'beforeUnload',
        };
      }
      return;
    }

    // TODO: type-safe parsing from client steps to internal step format.
    if (clientStepHasFrameContext(step)) {
      this.appendStep({...step, context} as Step);
    } else {
      this.appendStep(step as Step);
    }
  }

  async appendStep(step: Step): Promise<void> {
    this.lastStep = await this.session.appendStep(step);
  }

  targetDestroyed(): void {
    // TODO: figure out how this works with sections
    // this.appendStep(new CloseStep(this.getTarget()));
  }

  targetInfoChanged(url: string): void {
    this.session.replaceUnloadWithNavigation({
      type: 'waitForNavigation',
      expectedUrl: url,
    });
  }
}
