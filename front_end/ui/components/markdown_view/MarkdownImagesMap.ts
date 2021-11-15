// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * To use images in markdown, add key in markdownImages with the image data and
 * use the added key in markdown.
 * @example markdown
 * Give feedback by clicking ![Feedback icon](feedbackIcon)
*/
export interface ImageData {
  src: string;
  isIcon: boolean;
  color?: string;
  width?: string;
  height?: string;
}

/*
 * src for image is relative url for image location.
 * @example icon
 * [
 *   'feedbackIcon',
 *   {
 *     src: 'Images/survey_feedback_icon.svg',
 *     isIcon: true,
 *     width: '20px',
 *     height: '20px',
 *     color: 'var(--color-text-disabled)',
 *   },
 * ]
 *
*/

// NOTE: This is only exported for tests, and it should not be
// imported in any component, instead add image data in map and
// use getMarkdownImage to get the appropriate image data.
export const markdownImages = new Map<string, ImageData>([]);

export const getMarkdownImage = (key: string): ImageData => {
  const image = markdownImages.get(key);
  if (!image) {
    throw new Error(`Markdown image with key '${key}' is not available, please check MarkdownImagesMap.ts`);
  }
  return image;
};
