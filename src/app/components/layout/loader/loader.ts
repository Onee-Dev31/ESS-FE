import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../../services/loading';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (loadingService.isLoading()) {
      <div class="loader-overlay">
        <div class="loader-content">
          <div class="spinner">
            <div class="double-bounce1"></div>
            <div class="double-bounce2"></div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .loader-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 99999;
        transition: all 0.3s ease;
        animation: fadeIn 0.3s ease;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      .loader-content {
        text-align: center;
      }

      .spinner {
        width: 60px;
        height: 60px;
        position: relative;
        margin: 0 auto;
      }

      .double-bounce1,
      .double-bounce2 {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background-color: var(--primary);
        opacity: 0.6;
        position: absolute;
        top: 0;
        left: 0;
        animation: sk-bounce 2s infinite ease-in-out;
      }

      .double-bounce2 {
        animation-delay: -1s;
        background-color: var(--success);
      }

      @keyframes sk-bounce {
        0%,
        100% {
          transform: scale(0);
        }
        50% {
          transform: scale(1);
        }
      }
    `,
  ],
})
export class LoaderComponent {
  public loadingService = inject(LoadingService);
}
