// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  generateImagesJsContent,
  optimizeSvg,
  parseResponseFile,
} from '../optimize_images.js';

describe('optimize_images', () => {
  describe('optimizeSvg', () => {
    it('optimizes SVG content', () => {
      const input = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
          <!-- Comment to remove -->
          <path d="M 0 0 L 10 10 L 20 0 Z" fill="#ff0000" />
        </svg>
      `;
      const optimized = optimizeSvg(input);
      assert.isFalse(optimized.includes('<!-- Comment to remove -->'));
      assert.isTrue(optimized.startsWith('<svg'));
      assert.isTrue(optimized.includes('path'));
    });

    it('preserves style elements with inlineStyles disabled', () => {
      const input = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <style>.cls{fill:red;}</style>
          <circle class="cls" cx="10" cy="10" r="5"/>
        </svg>
      `;
      const optimized = optimizeSvg(input);
      assert.isTrue(optimized.includes('<style>'));
    });
  });

  describe('parseResponseFile', () => {
    it('parses svgs and images sections', () => {
      const content = `
        --svgs
        ../../front_end/Images/src/3d-center.svg
        ../../front_end/Images/src/bin.svg
        --images
        accelerometer-bottom.png
        chromeLeft.avif
      `;
      const result = parseResponseFile(content);
      assert.deepEqual(result.svgs, [
        '../../front_end/Images/src/3d-center.svg',
        '../../front_end/Images/src/bin.svg',
      ]);
      assert.deepEqual(result.images, [
        'accelerometer-bottom.png',
        'chromeLeft.avif',
      ]);
    });

    it('handles empty sections gracefully', () => {
      const content = `
        --svgs
        --images
      `;
      const result = parseResponseFile(content);
      assert.deepEqual(result.svgs, []);
      assert.deepEqual(result.images, []);
    });
  });

  describe('generateImagesJsContent', () => {
    it('generates expected stylesheet definitions in correct order', () => {
      const images = ['icon.png', 'photo.avif'];
      const svgs = ['arrow.svg', 'delete.svg'];

      const content = generateImagesJsContent(images, svgs);
      assert.isTrue(content.includes('const sheet = new CSSStyleSheet();'));
      assert.isTrue(content.includes(
          'style.setProperty(\'--image-file-icon\', \'url("\' + new URL(\'./icon.png\', import.meta.url).toString() + \'")\');'));
      assert.isTrue(content.includes(
          'style.setProperty(\'--image-file-photo\', \'url("\' + new URL(\'./photo.avif\', import.meta.url).toString() + \'")\');'));
      assert.isTrue(content.includes(
          'style.setProperty(\'--image-file-arrow\', \'url("\' + new URL(\'./arrow.svg\', import.meta.url).toString() + \'")\');'));
      assert.isTrue(content.includes(
          'style.setProperty(\'--image-file-delete\', \'url("\' + new URL(\'./delete.svg\', import.meta.url).toString() + \'")\');'));
      assert.isTrue(content.includes('document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];'));

      const iconPos = content.indexOf('--image-file-icon');
      const arrowPos = content.indexOf('--image-file-arrow');
      assert.isBelow(iconPos, arrowPos, 'Images should precede SVGs in stylesheet definition');
    });
  });
});
