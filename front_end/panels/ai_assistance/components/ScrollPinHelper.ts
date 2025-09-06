// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Utility to manage scroll pin-to-bottom behavior for a scrollable container.
 */
export class ScrollPinHelper {
  #el: HTMLElement | null = null;
  #scrollTop?: number;
  #pinToBottom = true;
  #isProgrammatic = false;
  static readonly ROUNDING_OFFSET = 1;

  setElement(el: HTMLElement | undefined): void {
    if (el) {
      this.#el = el;
    } else {
      this.#el = null;
      this.#pinToBottom = true;
    }
  }

  handleResize(): void {
    if (!this.#el) return;
    if (this.#pinToBottom) {
      this.setScrollTop(this.#el.scrollHeight);
    }
  }

  handleScroll(target: HTMLElement): void {
    if (this.#isProgrammatic) {
      this.#isProgrammatic = false;
      return;
    }
    this.#scrollTop = target.scrollTop;
    this.#pinToBottom = target.scrollTop + target.clientHeight + ScrollPinHelper.ROUNDING_OFFSET > target.scrollHeight;
  }

  setScrollTop(value: number): void {
    if (!this.#el) return;
    this.#scrollTop = value;
    this.#isProgrammatic = true;
    this.#el.scrollTop = value;
  }

  scrollToBottom(): void {
    if (!this.#el) return;
    this.setScrollTop(this.#el.scrollHeight);
  }

  restoreLastPosition(): void {
    if (this.#scrollTop === undefined) {
      return;
    }
    this.setScrollTop(this.#scrollTop);
  }
}

