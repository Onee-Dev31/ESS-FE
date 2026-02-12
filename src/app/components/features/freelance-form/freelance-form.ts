import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface FreelanceFormData {
    id?: string;
    firstNameTh: string;
    lastNameTh: string;
    nickname: string;
    firstNameEn: string;
    lastNameEn: string;
    phone: string;
    email: string;
    company: string;
    department: string;
    startDate: string;
    endDate: string;
    salary: number;
    otherIncome: number;
    totalIncome: number;
    employeeId: string;
    supplierCode: string;
    adUser: string;
    fotdNumber: string;
    description: string;
    attachments: File[];
    lastWorkingDate?: string;
}

@Component({
    selector: 'app-freelance-form',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './freelance-form.html',
    styleUrls: ['./freelance-form.scss'],
    encapsulation: ViewEncapsulation.None
})
export class FreelanceFormComponent implements OnInit, OnChanges {
    @Input() isOpen = false;
    @Input() editData: any = null;
    @Output() onClose = new EventEmitter<void>();
    @Output() onSave = new EventEmitter<FreelanceFormData>();

    formData: FreelanceFormData = {
        firstNameTh: '',
        lastNameTh: '',
        nickname: '',
        firstNameEn: '',
        lastNameEn: '',
        phone: '',
        email: '',
        company: '',
        department: '',
        startDate: '',
        endDate: '',
        salary: 0,
        otherIncome: 0,
        totalIncome: 0,
        employeeId: '',
        supplierCode: '',
        adUser: '',
        fotdNumber: '',
        description: '',
        attachments: []
    };

    uploadedFiles: { name: string; file: File }[] = [];

    ngOnInit() {
        if (this.editData) {
            this.formData = { ...this.formData, ...this.editData };
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['editData'] && changes['editData'].currentValue) {
            this.formData = { ...this.formData, ...changes['editData'].currentValue };
        }
    }

    calculateTotal() {
        this.formData.totalIncome = (this.formData.salary || 0) + (this.formData.otherIncome || 0);
    }

    onFileSelect(event: any) {
        const files = event.target.files;
        if (files && files.length > 0) {
            const newFiles = Array.from(files).map((file: any) => ({
                name: file.name,
                file: file
            }));
            this.uploadedFiles = [...this.uploadedFiles, ...newFiles];
        }
    }

    removeFile(index: number) {
        this.uploadedFiles = this.uploadedFiles.filter((_, i) => i !== index);
    }

    handleSave() {
        this.onSave.emit(this.formData);
    }

    showResignModal = false;
    resignDate = '';
    lastWorkingDate = '';

    handleResign() {
        this.showResignModal = true;
    }

    confirmResign() {
        if (!this.resignDate || !this.lastWorkingDate) {
            return;
        }
        this.onSave.emit({
            ...this.formData,
            id: 'RESIGN',
            endDate: this.resignDate,
            lastWorkingDate: this.lastWorkingDate
        });
        this.closeResignModal();
    }

    closeResignModal() {
        this.showResignModal = false;
        this.resignDate = '';
        this.lastWorkingDate = '';
    }

    handleClose() {
        this.onClose.emit();
    }
}
