// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {Step} from './Schema.js';
import type {Screenshot} from './ScreenshotStorage.js';

export interface Section {
  title: string;
  steps: Step[];
  url: string;
  screenshot?: Screenshot;
  causingStep?: Step;
}

function startNewSection(step: Step): Section|null {
  const navigationEvent = step.assertedEvents?.find(
      event => event.type === 'navigation',
  );
  if (step.type === 'navigate') {
    return {
      title: navigationEvent?.title || '',
      url: step.url,
      steps: [],
      causingStep: step,
    };
  }
  if (navigationEvent) {
    return {
      title: navigationEvent.title || '',
      url: navigationEvent.url || '',
      steps: [],
    };
  }
  return null;
}

export function buildSections(steps: Step[]): Section[] {
  let currentSection: Section|null = null;
  const sections: Section[] = [];
  for (const step of steps) {
    if (currentSection) {
      currentSection.steps.push(step);
    } else if (step.type === 'navigate') {
      currentSection = startNewSection(step);
      continue;
    } else {
      currentSection = {title: 'Current page', url: '', steps: [step]};
    }
    const nextSection = startNewSection(step);
    if (nextSection) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = nextSection;
    }
  }
  if (currentSection && (!sections.length || currentSection.steps.length)) {
    sections.push(currentSection);
  }
  return sections;
}
