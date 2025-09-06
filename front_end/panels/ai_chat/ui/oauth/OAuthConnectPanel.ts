// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Lit from '../../../../ui/lit/lit.js';

const {html, Decorators} = Lit;
const {customElement} = Decorators as any;

@customElement('ai-oauth-connect')
export class OAuthConnectPanel extends HTMLElement {
  static readonly litTagName = Lit.StaticHtml.literal`ai-oauth-connect`;

  #visible = false;
  get visible(): boolean { return this.#visible; }
  set visible(v: boolean) { this.#visible = v; this.#render(); }

  connectedCallback(): void { this.#render(); }
  setVisible(visible: boolean): void { this.visible = visible; }

  #emit(name: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(name, {bubbles: true, detail}));
  }

  #onOpenRouter = () => { this.#emit('oauth-login', { provider: 'openrouter' }); };
  #onOpenAI = () => { this.#emit('openai-setup'); };
  #onManual = (e: Event) => { e.preventDefault(); this.#emit('manual-setup'); };

  #render(): void {
    // Light DOM render so host page CSS (chatView.css) styles apply
    if (!this.#visible) {
      this.innerHTML = '';
      return;
    }
    Lit.render(html`
      <!-- OAuth Login Section (light DOM) -->
      <div class="oauth-login-container">
        <div class="oauth-welcome">
          <h2>Welcome to Browser Operator</h2>
          <p>Get started by connecting an AI provider for access to multiple models</p>
        </div>
        
        <div class="oauth-login-section">
          <div class="provider-options">
            <button 
              class="oauth-login-button openrouter" 
              @click=${this.#onOpenRouter}
              title="Sign in with OpenRouter OAuth"
            >
              <div class="oauth-button-content">
                <svg class="oauth-icon" width="24" height="24" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" fill="currentColor" stroke="currentColor" aria-label="OpenRouter Logo">
                  <g clip-path="url(#clip0_205_3)">
                    <path d="M3 248.945C18 248.945 76 236 106 219C136 202 136 202 198 158C276.497 102.293 332 120.945 423 120.945" stroke-width="90"></path>
                    <path d="M511 121.5L357.25 210.268L357.25 32.7324L511 121.5Z"></path>
                    <path d="M0 249C15 249 73 261.945 103 278.945C133 295.945 133 295.945 195 339.945C273.497 395.652 329 377 420 377" stroke-width="90"></path>
                    <path d="M508 376.445L354.25 287.678L354.25 465.213L508 376.445Z"></path>
                  </g>
                  <defs>
                    <clipPath id="clip0_205_3">
                      <rect width="512" height="512" fill="white"></rect>
                    </clipPath>
                  </defs>
                </svg>
                <span>Connect via OpenRouter</span>
              </div>
            </button>
            
            <button 
              class="oauth-login-button openai" 
              @click=${this.#onOpenAI}
              title="Connect with OpenAI API key"
            >
              <div class="oauth-button-content">
                <svg class="oauth-icon" width="28" height="28" viewBox="0 0 156 154" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M59.7325 56.1915V41.6219C59.7325 40.3948 60.1929 39.4741 61.266 38.8613L90.5592 21.9915C94.5469 19.6912 99.3013 18.6181 104.208 18.6181C122.612 18.6181 134.268 32.8813 134.268 48.0637C134.268 49.1369 134.268 50.364 134.114 51.5911L103.748 33.8005C101.908 32.7274 100.067 32.7274 98.2267 33.8005L59.7325 56.1915ZM128.133 112.937V78.1222C128.133 75.9745 127.212 74.441 125.372 73.3678L86.878 50.9768L99.4538 43.7682C100.527 43.1554 101.448 43.1554 102.521 43.7682L131.814 60.6381C140.25 65.5464 145.923 75.9745 145.923 86.0961C145.923 97.7512 139.023 108.487 128.133 112.935V112.937ZM50.6841 82.2638L38.1083 74.9028C37.0351 74.29 36.5748 73.3693 36.5748 72.1422V38.4025C36.5748 21.9929 49.1506 9.5696 66.1744 9.5696C72.6162 9.5696 78.5962 11.7174 83.6585 15.5511L53.4461 33.0352C51.6062 34.1084 50.6855 35.6419 50.6855 37.7897V82.2653L50.6841 82.2638ZM77.7533 97.9066L59.7325 87.785V66.3146L77.7533 56.193L95.7725 66.3146V87.785L77.7533 97.9066ZM89.3321 144.53C82.8903 144.53 76.9103 142.382 71.848 138.549L102.06 121.064C103.9 119.991 104.821 118.458 104.821 116.31V71.8343L117.551 79.1954C118.624 79.8082 119.084 80.7289 119.084 81.956V115.696C119.084 132.105 106.354 144.529 89.3321 144.529V144.53ZM52.9843 110.33L23.6911 93.4601C15.2554 88.5517 9.58181 78.1237 9.58181 68.0021C9.58181 56.193 16.6365 45.611 27.5248 41.163V76.1299C27.5248 78.2776 28.4455 79.8111 30.2854 80.8843L68.6271 103.121L56.0513 110.33C54.9781 110.943 54.0574 110.943 52.9843 110.33ZM51.2983 135.482C33.9681 135.482 21.2384 122.445 21.2384 106.342C21.2384 105.115 21.3923 103.888 21.5448 102.661L51.7572 120.145C53.5971 121.218 55.4385 121.218 57.2784 120.145L95.7725 97.9081V112.478C95.7725 113.705 95.3122 114.625 94.239 115.238L64.9458 132.108C60.9582 134.408 56.2037 135.482 51.2969 135.482H51.2983ZM89.3321 153.731C107.889 153.731 123.378 140.542 126.907 123.058C144.083 118.61 155.126 102.507 155.126 86.0976C155.126 75.3617 150.525 64.9336 142.243 57.4186C143.01 54.1977 143.471 50.9768 143.471 47.7573C143.471 25.8267 125.68 9.41567 105.129 9.41567C100.989 9.41567 97.0011 10.0285 93.0134 11.4095C86.1112 4.66126 76.6024 0.367188 66.1744 0.367188C47.6171 0.367188 32.1282 13.5558 28.5994 31.0399C11.4232 35.4879 0.380859 51.5911 0.380859 68.0006C0.380859 78.7365 4.98133 89.1645 13.2631 96.6795C12.4963 99.9004 12.036 103.121 12.036 106.341C12.036 128.271 29.8265 144.682 50.3777 144.682C54.5178 144.682 58.5055 144.07 62.4931 142.689C69.3938 149.437 78.9026 153.731 89.3321 153.731Z" fill="currentColor"></path>
                </svg>
                <span>Connect via OpenAI</span>
              </div>
            </button>
          </div>
          
          <div class="oauth-alternative">
            <p>Or <a href="#" @click=${this.#onManual} class="manual-setup-link">configure API keys manually</a></p>
          </div>
        </div>
      </div>
    `, this, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap { 'ai-oauth-connect': OAuthConnectPanel; }
}
