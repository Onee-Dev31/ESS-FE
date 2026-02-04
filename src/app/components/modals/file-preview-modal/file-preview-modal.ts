/**
 * @file File Preview Modal
 * @description Logic for File Preview Modal
 */

// Section: Imports
import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

// Section: Logic
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
export class FilePreviewModalComponent implements OnInit {
    @Input() files: FilePreviewItem[] = [];
    @Output() onClose = new EventEmitter<void>();

    selectedFile: FilePreviewItem | null = null;

    ngOnInit() {
        if (this.files.length > 0) {
            this.selectedFile = this.files[0];
        }
    }

    selectFile(file: FilePreviewItem) {
        this.selectedFile = file;
    }

    close() {
        this.onClose.emit();
    }
}
