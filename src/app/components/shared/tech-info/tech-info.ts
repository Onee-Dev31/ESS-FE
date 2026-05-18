import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TechInfoService } from './tech-info.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-tech-info',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (auth.isTech()) {
      <button
        class="tech-fab"
        (click)="toggle()"
        title="ข้อมูลทางเทคนิค"
        [class.fab-active]="isOpen()"
      >
        <span class="fab-icon">&lt;/&gt;</span>
        @if (svc.capturedCalls().length > 0) {
          <span class="fab-badge">{{ svc.capturedCalls().length }}</span>
        }
      </button>

      @if (isOpen()) {
        <div class="tech-backdrop" (click)="close()"></div>
        <div class="tech-panel" (click)="$event.stopPropagation()">
          <div class="panel-header">
            <div class="panel-title">
              <i class="fas fa-code"></i> ข้อมูลทางเทคนิค
              <span class="route-chip">{{ svc.currentRoute() }}</span>
            </div>
            <div class="header-actions">
              @if (svc.capturedCalls().length > 0) {
                <button class="btn-clear-calls" (click)="svc.clearCalls()" title="ล้าง">
                  <i class="fas fa-trash-alt"></i>
                </button>
              }
              <button class="btn-close" (click)="close()">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>

          <div class="panel-body">
            @if (svc.capturedCalls().length === 0) {
              <div class="empty-body">
                <i class="fas fa-satellite-dish"></i>
                <div>ยังไม่มี API call ในหน้านี้</div>
                <div class="empty-sub">จะแสดงอัตโนมัติเมื่อมีการเรียก API</div>
              </div>
            } @else {
              <div class="calls-list">
                @for (call of svc.capturedCalls(); track call.timestamp) {
                  <div
                    class="call-row"
                    [class.call-error]="call.status !== null && call.status >= 400"
                  >
                    <span class="method-badge" [class]="'method-' + call.method.toLowerCase()">
                      {{ call.method }}
                    </span>
                    <div class="call-info">
                      <div class="call-path">{{ call.path }}</div>
                      <div class="call-meta">
                        @if (call.status !== null) {
                          <span
                            class="status-chip"
                            [class.status-ok]="call.status < 400"
                            [class.status-err]="call.status >= 400"
                          >
                            {{ call.status }}
                          </span>
                        }
                        @if (call.duration !== null) {
                          <span class="duration-chip">{{ call.duration }}ms</span>
                        }
                        <span class="time-chip">{{ call.timestamp | date: 'HH:mm:ss' }}</span>
                      </div>
                      @if (call.storedProcedures.length > 0) {
                        <div class="call-sp-list">
                          @for (sp of call.storedProcedures; track sp.name) {
                            <div class="call-sp-row">
                              <span class="sp-chip">{{ sp.name }}</span>
                              @if (sp.tables.length > 0) {
                                <span class="sp-arrow">→</span>
                                @for (table of sp.tables; track table) {
                                  <span class="table-ref-chip">{{ table }}</span>
                                }
                              }
                            </div>
                          }
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }
    }
  `,
  styles: [
    `
      @use '../../../../styles/variables' as *;

      .tech-fab {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: var(--bg-card);
        border: 1px solid var(--border);
        color: var(--text-muted);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 900;
        transition: all 0.2s;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

        &:hover,
        &.fab-active {
          color: var(--primary);
          border-color: var(--primary);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        }

        .fab-icon {
          font-size: 0.7rem;
          font-weight: 700;
          font-family: monospace;
          letter-spacing: -0.05em;
        }

        .fab-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          background: var(--primary);
          color: #fff;
          font-size: 0.55rem;
          font-weight: 700;
          border-radius: 999px;
          min-width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 3px;
        }
      }

      .tech-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.3);
        z-index: 1000;
      }

      .tech-panel {
        position: fixed;
        bottom: 72px;
        right: 24px;
        width: 460px;
        max-width: calc(100vw - 48px);
        max-height: 72vh;
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 16px;
        box-shadow: 0 8px 40px rgba(0, 0, 0, 0.3);
        z-index: 1001;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 14px;
        border-bottom: 1px solid var(--border);
        background: var(--bg-table-head);
        flex-shrink: 0;
        gap: 8px;
      }

      .panel-title {
        font-size: 0.82rem;
        font-weight: 700;
        color: var(--text-header);
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
        flex: 1;
        overflow: hidden;

        i {
          color: var(--primary);
          flex-shrink: 0;
        }
      }

      .route-chip {
        font-family: monospace;
        font-size: 0.65rem;
        font-weight: 500;
        color: var(--text-muted);
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 4px;
        padding: 1px 5px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 160px;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
      }

      .btn-close,
      .btn-clear-calls {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        border: none;
        background: transparent;
        color: var(--text-muted);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
        transition: all 0.15s;

        &:hover {
          background: var(--border);
          color: var(--text);
        }
      }

      .panel-body {
        overflow-y: auto;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        flex: 1;
      }

      .calls-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .call-row {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 6px 8px;
        border-radius: 6px;
        background: var(--bg-table-head);
        border: 1px solid var(--border-table);
        transition: border-color 0.15s;

        &.call-error {
          border-color: color-mix(in srgb, #ef4444, transparent 60%);
        }
      }

      .call-info {
        flex: 1;
        min-width: 0;
      }

      .call-path {
        font-size: 0.72rem;
        font-weight: 600;
        font-family: monospace;
        color: var(--text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .call-meta {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 2px;
        flex-wrap: wrap;
      }

      .status-chip {
        font-size: 0.6rem;
        font-weight: 700;
        border-radius: 3px;
        padding: 1px 4px;
        &.status-ok {
          background: color-mix(in srgb, #22c55e, transparent 82%);
          color: #4ade80;
        }
        &.status-err {
          background: color-mix(in srgb, #ef4444, transparent 82%);
          color: #f87171;
        }
      }

      .duration-chip {
        font-size: 0.6rem;
        color: var(--text-muted);
        font-family: monospace;
      }

      .time-chip {
        font-size: 0.6rem;
        color: var(--text-muted);
        font-family: monospace;
        margin-left: auto;
      }

      .call-sp-list {
        display: flex;
        flex-direction: column;
        gap: 3px;
        margin-top: 5px;
        padding-top: 5px;
        border-top: 1px dashed var(--border-table);
      }

      .call-sp-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 4px;
      }

      .sp-chip {
        font-size: 0.6rem;
        font-weight: 600;
        font-family: monospace;
        background: color-mix(in srgb, #a78bfa, transparent 85%);
        color: #c4b5fd;
        border: 1px solid color-mix(in srgb, #a78bfa, transparent 55%);
        border-radius: 4px;
        padding: 1px 6px;
        flex-shrink: 0;
      }

      .sp-arrow {
        font-size: 0.6rem;
        color: var(--text-muted);
        flex-shrink: 0;
      }

      .table-ref-chip {
        font-size: 0.58rem;
        font-weight: 500;
        font-family: monospace;
        background: color-mix(in srgb, #06b6d4, transparent 88%);
        color: #67e8f9;
        border: 1px solid color-mix(in srgb, #06b6d4, transparent 60%);
        border-radius: 4px;
        padding: 1px 5px;
      }

      .method-badge {
        font-size: 0.58rem;
        font-weight: 700;
        font-family: monospace;
        border-radius: 4px;
        padding: 2px 4px;
        white-space: nowrap;
        flex-shrink: 0;
        margin-top: 2px;

        &.method-get {
          background: color-mix(in srgb, #22c55e, transparent 82%);
          color: #4ade80;
          border: 1px solid color-mix(in srgb, #22c55e, transparent 60%);
        }
        &.method-post {
          background: color-mix(in srgb, #3b82f6, transparent 82%);
          color: #60a5fa;
          border: 1px solid color-mix(in srgb, #3b82f6, transparent 60%);
        }
        &.method-put {
          background: color-mix(in srgb, #f59e0b, transparent 82%);
          color: #fbbf24;
          border: 1px solid color-mix(in srgb, #f59e0b, transparent 60%);
        }
        &.method-patch {
          background: color-mix(in srgb, #a78bfa, transparent 82%);
          color: #c4b5fd;
          border: 1px solid color-mix(in srgb, #a78bfa, transparent 60%);
        }
        &.method-delete {
          background: color-mix(in srgb, #ef4444, transparent 82%);
          color: #f87171;
          border: 1px solid color-mix(in srgb, #ef4444, transparent 60%);
        }
      }

      .empty-body {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 32px 16px;
        text-align: center;
        color: var(--text-muted);
        font-size: 0.82rem;
        gap: 6px;

        i {
          font-size: 1.8rem;
          opacity: 0.35;
        }

        .empty-sub {
          font-size: 0.7rem;
          opacity: 0.7;
        }
      }
    `,
  ],
})
export class TechInfoComponent {
  svc = inject(TechInfoService);
  auth = inject(AuthService);
  isOpen = signal(false);

  toggle() {
    this.isOpen.update((v) => !v);
  }
  close() {
    this.isOpen.set(false);
  }
}
