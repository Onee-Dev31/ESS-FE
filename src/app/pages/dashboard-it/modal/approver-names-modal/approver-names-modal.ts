import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ModalShellComponent } from '../../../../components/shared/modal-shell/modal-shell';

@Component({
  selector: 'app-approver-names-modal',
  standalone: true,
  imports: [ModalShellComponent],
  templateUrl: './approver-names-modal.html',
  styleUrl: './approver-names-modal.scss',
})
export class ApproverNamesModal {
  @Input() approverNames: unknown;
  @Output() closeModal = new EventEmitter<void>();

  get names(): string[] {
    const value = this.parseValue(this.approverNames);
    return value
      .map((item) => this.toDisplayName(item))
      .filter((name): name is string => !!name);
  }

  private parseValue(value: unknown): unknown[] {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return value == null ? [] : [value];

    const text = value.trim();
    if (!text) return [];
    if (text.startsWith('[')) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Fall back to a comma-separated list.
      }
    }
    return text.split(/[,;\n]+/);
  }

  private toDisplayName(value: unknown): string {
    if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
    if (!value || typeof value !== 'object') return '';

    const approver = value as Record<string, unknown>;
    return String(
      approver['fullName'] ??
        approver['full_name'] ??
        approver['name'] ??
        approver['nickname'] ??
        approver['approver_name'] ??
        '',
    ).trim();
  }
}
