// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Models from '../../../../../../front_end/panels/recorder/models/models.js';

describe('Section', () => {
  describe('buildSections', () => {
    const buildSections = Models.Section.buildSections;

    function makeStep(): Models.Schema.Step {
      return {type: Models.Schema.StepType.Scroll};
    }

    function makeNavigateStep(): Models.Schema.NavigateStep {
      return {
        type: Models.Schema.StepType.Navigate,
        url: 'https://example.com',
        assertedEvents: [
          {
            type: Models.Schema.AssertedEventType.Navigation,
            url: 'https://example.com',
            title: 'Test',
          },
        ],
      };
    }

    function makeStepCausingNavigation(): Models.Schema.Step {
      return {
        type: Models.Schema.StepType.Scroll,
        assertedEvents: [
          {
            type: Models.Schema.AssertedEventType.Navigation,
            url: 'https://example.com',
            title: 'Test',
          },
        ],
      };
    }

    it('should build not sections for empty steps', () => {
      assert.deepStrictEqual(buildSections([]), []);
    });

    it('should build a current page section for initial steps that do not cause navigation', () => {
      const step1 = makeStep();
      const step2 = makeStep();
      assert.deepStrictEqual(buildSections([step1, step2]), [
        {title: 'Current page', url: '', steps: [step1, step2]},
      ]);
    });

    it('should build a current page section for initial steps that cause navigation', () => {
      {
        const step1 = makeNavigateStep();
        const step2 = makeStep();
        assert.deepStrictEqual(buildSections([step1, step2]), [
          {
            title: 'Test',
            url: 'https://example.com',
            steps: [step2],
            causingStep: step1,
          },
        ]);
      }

      {const step1 = makeStepCausingNavigation(); const step2 = makeStep(); assert.deepStrictEqual(
          buildSections([step1, step2]),
          [
            {title: 'Current page', url: '', steps: [step1]},
            {title: 'Test', url: 'https://example.com', steps: [step2]},
          ]);}
    });

    it('should generate multiple sections', () => {
      const step1 = makeStep();
      const step2 = makeNavigateStep();
      const step3 = makeStep();
      const step4 = makeStepCausingNavigation();
      const step5 = makeStep();

      assert.deepStrictEqual(
          buildSections([step1, step2, step3, step4, step5]),
          [
            {title: 'Current page', url: '', steps: [step1, step2]},
            {
              title: 'Test',
              url: 'https://example.com',
              steps: [step3, step4],
              causingStep: step2,
            },
            {title: 'Test', url: 'https://example.com', steps: [step5]},
          ],
      );
    });
  });
});
