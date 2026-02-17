import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MasterDataService } from '../../../services/master-data.service';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzSelectModule } from 'ng-zorro-antd/select';

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
    position: string;
    startDate: string;
    endDate: string;
    salary: number;
    otherIncome: number;
    totalIncome: number;
    accountNumber: string;
    bank: string;
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
    imports: [
        CommonModule,
        FormsModule,
        NzDatePickerModule,
        NzSelectModule
    ],
    templateUrl: './freelance-form.html',
    styleUrls: ['./freelance-form.scss'],
    encapsulation: ViewEncapsulation.None
})
export class FreelanceFormComponent implements OnInit, OnChanges {
    @Input() isOpen = false;
    @Input() editData: any = null;
    @Output() onClose = new EventEmitter<void>();
    @Output() onSave = new EventEmitter<FreelanceFormData>();

    private masterService = inject(MasterDataService);

    dateFormat = 'dd//MM/yyyy';

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
        position: '',
        startDate: '',
        endDate: '',
        salary: 0,
        otherIncome: 0,
        totalIncome: 0,
        accountNumber: '',
        bank: '',
        supplierCode: '',
        adUser: '',
        fotdNumber: '',
        description: '',
        attachments: []
    };

    uploadedFiles: { name: string; file: File }[] = [];

    //MASTER
    bankList: any[] = []
    companyList: any[] = []
    departmentList: any[] = []
    filteredDepartmentList: any[] = [];

    ngOnInit() {
        this.getBanks()
        this.getCompanies()
        this.getDepartments()
        if (this.editData) {
            this.formData = { ...this.formData, ...this.editData };
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['editData'] && changes['editData'].currentValue) {
            this.formData = { ...this.formData, ...changes['editData'].currentValue };
        }
    }

    // calculateTotal() {
    //     this.formData.totalIncome = (this.formData.salary || 0) + (this.formData.otherIncome || 0);
    // }

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

    openPicker(event: any) {
        event.target.showPicker();
    }

    // MASTER

    getBanks() {
        this.masterService.getBankMaster().subscribe({
            next: (data) => {
                console.log(data);
                this.bankList = data
            },
            error: (error) => {
                console.error('Error fetching data:', error);
            }
        });
    }

    getCompanies() {
        this.masterService.getCompanyMaster().subscribe({
            next: (data) => {
                console.log(data);
                this.companyList = data
            },
            error: (error) => {
                console.error('Error fetching data:', error);
            }
        });
    }

    getDepartments() {
        this.masterService.getDepartmentMaster().subscribe({
            next: (data) => {
                console.log(data);
                this.departmentList = data
            },
            error: (error) => {
                console.error('Error fetching data:', error);
            }
        });
    }

    // function
    onCompanyChange(companyCode: string) {
        this.formData.department = '';

        if (!companyCode) {
            this.filteredDepartmentList = [];
            return;
        }

        this.filteredDepartmentList = this.departmentList.filter(
            dept => dept.COMPANY_CODE === companyCode
        );
    }

    salaryDisplay = '';
    otherIncomeDisplay = '';

    onMoneyInput(field: 'salary' | 'otherIncome', event: any) {
        let value = event.target.value;

        // 1️⃣ เอาเฉพาะตัวเลขกับจุด
        value = value.replace(/[^0-9.]/g, '');

        // 2️⃣ ให้มีจุดได้แค่ 1 จุด
        const parts = value.split('.');
        if (parts.length > 2) {
            value = parts[0] + '.' + parts.slice(1).join('');
        }

        // 3️⃣ จำกัดทศนิยม 2 ตำแหน่ง
        const [integer, decimal] = value.split('.');
        const limitedDecimal = decimal?.substring(0, 2);

        // 4️⃣ ใส่ comma ให้จำนวนเต็ม
        const formattedInteger = integer
            ? parseInt(integer, 10).toLocaleString('en-US')
            : '';

        const formattedValue =
            limitedDecimal !== undefined
                ? `${formattedInteger}.${limitedDecimal}`
                : formattedInteger;

        // 5️⃣ อัปเดต display
        if (field === 'salary') {
            this.salaryDisplay = formattedValue;
        } else {
            this.otherIncomeDisplay = formattedValue;
        }

        // 6️⃣ เก็บค่าเป็น number จริง
        const numericValue = parseFloat(value) || 0;
        this.formData[field] = numericValue;

        // 7️⃣ คำนวณรวม
        this.calculateTotal();
    }

    calculateTotal() {
        this.formData.totalIncome =
            (this.formData.salary || 0) +
            (this.formData.otherIncome || 0);
    }

    formatMoney(value: number): string {
        return (value || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

}
