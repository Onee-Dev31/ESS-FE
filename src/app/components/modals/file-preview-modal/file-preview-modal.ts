import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface FilePreviewItem {
    fileName: string;
    date: string;
}

@Component({
    selector: 'app-file-preview-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './file-preview-modal.html',
    styleUrls: ['./file-preview-modal.scss']
})
export class FilePreviewModalComponent {
    @Input() files: FilePreviewItem[] = [];
    @Output() onClose = new EventEmitter<void>();

    selectedFile: FilePreviewItem | null = null;

    selectFile(file: FilePreviewItem) {
        this.selectedFile = file;
    }

    close() {
        this.onClose.emit();
    }
}
