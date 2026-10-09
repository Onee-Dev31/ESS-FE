import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { GuideDocumentSettings } from './guide-document-settings/guide-document-settings';
import { ReplyTemplateSettings } from './reply-template-settings/reply-template-settings';

@Component({
  selector: 'app-setting-for-it',
  standalone: true,
  imports: [PageHeaderComponent, GuideDocumentSettings, ReplyTemplateSettings],
  templateUrl: './setting-for-it.html',
  styleUrl: './setting-for-it.scss',
})
export class SettingForIT {
  @Input() asPage = true;
  @Output() closeModal = new EventEmitter<void>();
  activeTab: 'documents' | 'templates' = 'documents';

  close(): void {
    this.closeModal.emit();
  }
}
