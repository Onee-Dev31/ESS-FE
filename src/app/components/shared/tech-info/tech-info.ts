import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { PAGE_META, PageMeta } from '../../../config/page-meta.config';

@Component({
  selector: 'app-tech-info',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button class="tech-fab" (click)="open()" title="ข้อมูลทางเทคนิค">
      <span class="fab-icon">&lt;/&gt;</span>
    </button>

    @if (isOpen()) {
      <div class="tech-backdrop" (click)="close()"></div>
      <div class="tech-panel" (click)="$event.stopPropagation()">
        <div class="panel-header">
          <div class="panel-title">
            <i class="fas fa-code"></i> ข้อมูลทางเทคนิค
          </div>
          <button class="btn-close" (click)="close()">
            <i class="fas fa-times"></i>
          </button>
        </div>

        @if (meta()) {
          <div class="panel-body">
            <div class="route-row">
              <span class="route-label">หน้า</span>
              <span class="route-value">{{ meta()!.title }}</span>
              <span class="route-path">{{ currentRoute() }}</span>
            </div>

            <div class="section">
              <div class="section-title">
                <i class="fas fa-database"></i> Tables ที่เกี่ยวข้อง
              </div>
              <div class="table-list">
                @for (table of meta()!.tables; track table) {
                  <span class="table-chip">{{ table }}</span>
                }
              </div>
            </div>

            <div class="section">
              <div class="section-title">
                <i class="fas fa-exchange-alt"></i> API Endpoints
              </div>
              <div class="api-list">
                @for (api of meta()!.apis; track api.endpoint) {
                  <div class="api-row">
                    <span class="method-badge" [class]="'method-' + api.method.toLowerCase()">
                      {{ api.method }}
                    </span>
                    <span class="api-endpoint">{{ api.endpoint }}</span>
                    <span class="api-desc">{{ api.description }}</span>
                  </div>
                }
              </div>
            </div>

            @if (meta()!.notes) {
              <div class="notes-row">
                <i class="fas fa-info-circle"></i> {{ meta()!.notes }}
              </div>
            }
          </div>
        } @else {
          <div class="panel-body empty-body">
            <i class="fas fa-map-marked-alt"></i>
            <div>ยังไม่มีข้อมูลทางเทคนิคสำหรับหน้านี้</div>
            <div class="empty-route">{{ currentRoute() }}</div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
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
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);

      &:hover {
        color: var(--primary);
        border-color: var(--primary);
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        transform: translateY(-2px);
      }

      .fab-icon {
        font-size: 0.7rem;
        font-weight: 700;
        font-family: monospace;
        letter-spacing: -0.05em;
      }
    }

    .tech-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.4);
      z-index: 1000;
    }

    .tech-panel {
      position: fixed;
      bottom: 72px;
      right: 24px;
      width: 480px;
      max-width: calc(100vw - 48px);
      max-height: 70vh;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.3);
      z-index: 1001;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      border-bottom: 1px solid var(--border);
      background: var(--bg-table-head);
      flex-shrink: 0;
    }

    .panel-title {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-header);
      display: flex;
      align-items: center;
      gap: 7px;

      i { color: var(--primary); }
    }

    .btn-close {
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
      transition: all 0.15s;

      &:hover {
        background: var(--border);
        color: var(--text);
      }
    }

    .panel-body {
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .route-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .route-label {
      font-size: 0.68rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .route-value {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-header);
    }

    .route-path {
      font-size: 0.72rem;
      color: var(--text-muted);
      font-family: monospace;
      background: var(--bg-table-head);
      padding: 1px 6px;
      border-radius: 4px;
      border: 1px solid var(--border);
    }

    .section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .section-title {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--text-sub);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .table-list {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }

    .table-chip {
      font-size: 0.72rem;
      font-weight: 500;
      font-family: monospace;
      background: color-mix(in srgb, var(--primary), transparent 88%);
      color: var(--primary);
      border: 1px solid color-mix(in srgb, var(--primary), transparent 65%);
      border-radius: 5px;
      padding: 2px 8px;
    }

    .api-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .api-row {
      display: grid;
      grid-template-columns: 56px 1fr;
      grid-template-rows: auto auto;
      gap: 0 8px;
      align-items: center;
      padding: 5px 8px;
      border-radius: 6px;
      background: var(--bg-table-head);
      border: 1px solid var(--border-table);
    }

    .method-badge {
      font-size: 0.6rem;
      font-weight: 700;
      font-family: monospace;
      border-radius: 4px;
      padding: 1px 4px;
      text-align: center;
      grid-row: 1 / 3;
      align-self: center;

      &.method-get    { background: color-mix(in srgb, #22c55e, transparent 82%); color: #4ade80; border: 1px solid color-mix(in srgb, #22c55e, transparent 60%); }
      &.method-post   { background: color-mix(in srgb, #3b82f6, transparent 82%); color: #60a5fa; border: 1px solid color-mix(in srgb, #3b82f6, transparent 60%); }
      &.method-put    { background: color-mix(in srgb, #f59e0b, transparent 82%); color: #fbbf24; border: 1px solid color-mix(in srgb, #f59e0b, transparent 60%); }
      &.method-patch  { background: color-mix(in srgb, #a78bfa, transparent 82%); color: #c4b5fd; border: 1px solid color-mix(in srgb, #a78bfa, transparent 60%); }
      &.method-delete { background: color-mix(in srgb, #ef4444, transparent 82%); color: #f87171; border: 1px solid color-mix(in srgb, #ef4444, transparent 60%); }
    }

    .api-endpoint {
      font-size: 0.72rem;
      font-weight: 600;
      font-family: monospace;
      color: var(--text);
    }

    .api-desc {
      font-size: 0.68rem;
      color: var(--text-muted);
      grid-column: 2;
    }

    .notes-row {
      font-size: 0.72rem;
      color: var(--text-sub);
      background: color-mix(in srgb, #f59e0b, transparent 90%);
      border: 1px solid color-mix(in srgb, #f59e0b, transparent 65%);
      border-radius: 6px;
      padding: 7px 10px;
      display: flex;
      gap: 7px;
      align-items: flex-start;

      i { color: #fbbf24; margin-top: 1px; }
    }

    .empty-body {
      align-items: center;
      justify-content: center;
      padding: 40px 16px;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.82rem;
      gap: 8px;

      i { font-size: 2rem; opacity: 0.4; }

      .empty-route {
        font-family: monospace;
        font-size: 0.7rem;
        opacity: 0.6;
      }
    }
  `],
})
export class TechInfoComponent {
  private router = inject(Router);

  isOpen = signal(false);
  currentRoute = signal('');

  meta = computed<PageMeta | null>(() => {
    const route = this.currentRoute();
    const key = Object.keys(PAGE_META).find(k => route.includes(k));
    return key ? PAGE_META[key] : null;
  });

  constructor() {
    this.currentRoute.set(this.router.url.split('?')[0]);
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.currentRoute.set(e.urlAfterRedirects.split('?')[0]);
        this.isOpen.set(false);
      });
  }

  open() { this.isOpen.set(true); }
  close() { this.isOpen.set(false); }
}
