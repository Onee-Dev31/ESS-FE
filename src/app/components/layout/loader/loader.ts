import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../../services/loading.service';

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
          <p class="loading-text">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    }
  `,
    styles: [`
    .loader-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(4px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 99999;
      transition: all 0.3s ease;
    }

    .loader-content {
      text-align: center;
    }

    .spinner {
      width: 60px;
      height: 60px;
      position: relative;
      margin: 0 auto 1.5rem;
    }

    .double-bounce1, .double-bounce2 {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background-color: #008ebc;
      opacity: 0.6;
      position: absolute;
      top: 0;
      left: 0;
      animation: sk-bounce 2.0s infinite ease-in-out;
    }

    .double-bounce2 {
      animation-delay: -1.0s;
      background-color: #74c34d;
    }

    .loading-text {
      font-family: var(--font-main);
      color: #2c3e50;
      font-weight: 600;
      font-size: 1.1rem;
      letter-spacing: 0.5px;
    }

    @keyframes sk-bounce {
      0%, 100% { transform: scale(0.0) }
      50% { transform: scale(1.0) }
    }
  `]
})
export class LoaderComponent {
    public loadingService = inject(LoadingService);
}
