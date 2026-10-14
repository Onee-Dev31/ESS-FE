import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
  private readonly route: ActivatedRoute;
  @Input() asPage = true;
  @Output() closeModal = new EventEmitter<void>();
  activeTab: 'documents' | 'templates' = 'documents';

  constructor(route: ActivatedRoute) {
    this.route = route;
  }

  get readOnly(): boolean {
    return this.route.snapshot.data['readOnly'] === true;
  }

  close(): void {
    this.closeModal.emit();
  }
}
