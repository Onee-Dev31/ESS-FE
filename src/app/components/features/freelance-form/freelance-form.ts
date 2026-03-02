import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges, ViewEncapsulation, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MasterDataService } from '../../../services/master-data.service';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SwalService } from '../../../services/swal.service';

interface FreelanceFormData {
    id?: string;
    firstNameTh: string;
    lastNameTh: string;
    nickname: string;
    firstNameEn: string;
    lastNameEn: string;
    phone: string;
    email: string;
    company: any | null;
    // company: string;
    department: string;
    position: string;
    startDate: Date | null;
    endDate: Date | null;
    salary: number;
    otherIncome: number;
    totalIncome: number;
    accountNumber: string;
    bank: string;
    fotdNumber: string;
    description: string;
    attachments: { name: string; file: File; description: string; }[];
    resignDate?: Date | null;
    lastWorkingDate?: Date | null;
    supplierCode: string;
    adUser: string;
    btn_action?: string;
    emp_status?: string;
}

@Component({
    selector: 'app-freelance-form',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        NzDatePickerModule,
        NzSelectModule,
        MatIconModule,
        MatTooltipModule
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
    private swalService = inject(SwalService);
    private cdr = inject(ChangeDetectorRef);

    dateFormat = 'dd//MM/yyyy';

    showResignModal = false;
    resignDate: Date | null = null;
    lastWorkingDate: Date | null = null;

    formData: FreelanceFormData = {
        firstNameTh: '',
        lastNameTh: '',
        nickname: '',
        firstNameEn: '',
        lastNameEn: '',
        phone: '',
        email: '',
        company: null,
        department: '',
        position: '',
        startDate: null,
        endDate: null,
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

    formResignData: any = {
        resignDate: null,
        lastWorkingDate: null
    };

    uploadedFiles: {
        name: string; file: File; description: string; url?: string;
        fileId?: number;
    }[] = [];

    private readonly MAX_SIZE = 5 * 1024 * 1024; // 5MB
    private readonly ALLOWED_EXTENSIONS = [
        // documents
        'pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'rtf',

        // images
        'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp',
        'tiff', 'tif', 'svg', 'heic', 'heif'
    ];

    private readonly ALLOWED_MIME_TYPES = [
        // pdf
        'application/pdf',

        // word
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

        // powerpoint
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',

        // text
        'text/plain',
        'application/rtf',

        // images
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/bmp',
        'image/webp',
        'image/tiff',
        'image/svg+xml',
        'image/heic',
        'image/heif'
    ];

    //MASTER
    bankList: any[] = []
    companyList: any[] = []
    departmentList: any[] = []
    filteredDepartmentList: any[] = [];

    isDataLoaded = false;

    ngOnInit() {
        if (this.editData) {
            this.formData = { ...this.formData, ...this.editData };
        }
        this.loadMasterData();
    }

    ngOnChanges(changes: SimpleChanges) {
        this.resetForm();
        if (changes['isOpen'] && changes['isOpen'].currentValue === true) {
            if (!this.isDataLoaded) {

            }
        }
        if (changes['editData'] && changes['editData'].currentValue) {
            const data = changes['editData'].currentValue;

            this.formData = {
                ...this.formData,
                ...data,
                startDate: data.startDate ? new Date(data.startDate) : null,
                endDate: data.endDate ? new Date(data.endDate) : null,
                lastWorkingDate: data.lastWorkingDate
                    ? new Date(data.lastWorkingDate)
                    : null
            };
            this.mapCompanyAndDepartment();
            this.syncMoneyDisplay();
            this.uploadedFiles = this.formData.attachments

            setTimeout(() => {
                this.cdr.detectChanges();
            }, 500);
        }
    }

    loadMasterData() {
        this.getBanks();
        this.getCompanies();
        this.getDepartments();
        this.isDataLoaded = true;
    }

    onFileSelect(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const validFiles: any[] = [];

        Array.from(input.files).forEach((file: File) => {
            // console.log(file)

            const extension = file.name.split('.').pop()?.toLowerCase();

            // ❌ ประเภทไฟล์ไม่ถูกต้อง
            if (!extension || !this.ALLOWED_EXTENSIONS.includes(extension)) {
                this.swalService.warning(
                    `ไฟล์ ${file.name} ไม่รองรับประเภทนี้`
                );
                return;
            }

            // ❌ ขนาดเกิน
            if (file.size > this.MAX_SIZE) {
                this.swalService.warning(
                    `ไฟล์ ${file.name} ต้องไม่เกิน 5MB`
                );
                return;
            }

            // ❌ เช็ค MIME type
            if (!this.ALLOWED_MIME_TYPES.includes(file.type)) {
                this.swalService.warning('ไฟล์ไม่ถูกต้องหรือถูกแก้ไขประเภทไฟล์');
                input.value = '';
                return;
            }


            // ✅ ผ่าน validation
            validFiles.push({
                name: file.name,
                file: file,
                description: '',
                isReplaced: false
            });

        });

        // เพิ่มเฉพาะไฟล์ที่ผ่าน
        this.uploadedFiles = [...this.uploadedFiles, ...validFiles];

        // reset input
        input.value = '';
    }

    removeFile(index: number) {
        this.uploadedFiles = this.uploadedFiles.filter((_, i) => i !== index);
    }

    replaceFile(event: Event, index: number) {
        const input = event.target as HTMLInputElement;

        if (!input.files || input.files.length === 0) return;

        const newFile = input.files[0];
        const extension = newFile.name.split('.').pop()?.toLowerCase();

        // ❌ ตรวจสอบนามสกุล
        if (!extension || !this.ALLOWED_EXTENSIONS.includes(extension)) {
            this.swalService.warning('ประเภทไฟล์ไม่รองรับ');
            input.value = '';
            return;
        }

        // ❌ ตรวจสอบขนาด
        if (newFile.size > this.MAX_SIZE) {
            this.swalService.warning('ไฟล์ต้องมีขนาดไม่เกิน 5MB');
            input.value = '';
            return;
        }

        // ❌ เช็ค MIME type
        if (!this.ALLOWED_MIME_TYPES.includes(newFile.type)) {
            this.swalService.warning('ไฟล์ไม่ถูกต้องหรือถูกแก้ไขประเภทไฟล์');
            input.value = '';
            return;
        }

        // ✅ ผ่าน validation → replace
        this.uploadedFiles[index] = {
            ...this.uploadedFiles[index],
            file: newFile,
            name: newFile.name
        };

        input.value = '';
    }

    handleSave() {
        this.formData.attachments = this.uploadedFiles
        this.onSave.emit(this.formData);
    }

    handleResign() {
        // console.log('Open Resigned')
        this.showResignModal = true;
    }

    handleActive() {
        // console.log('handleActive')
        this.swalService.confirm('ยืนยันการ Activate อีกครั้ง')
            .then(result => {
                if (!result.isConfirmed) return;

                this.onSave.emit({
                    ...this.formData,
                    btn_action: 'ACTIVATE'
                });
            });
    }

    // confirmResign() {
    //     if (!this.resignDate || !this.lastWorkingDate) {
    //         return;
    //     }
    //     this.onSave.emit({
    //         ...this.formData,
    //         id: 'RESIGN',
    //         endDate: this.resignDate,
    //         lastWorkingDate: this.lastWorkingDate
    //     });

    //     this.closeResignModal();
    // }
    confirmResign() {
        // console.log(this.formResignData.resignDate, this.formResignData.lastWorkingDate)
        if (!this.formResignData.resignDate || !this.formResignData.lastWorkingDate) return;

        this.onSave.emit({
            ...this.formData,
            btn_action: 'RESIGN',
            resignDate: this.formResignData.resignDate,
            lastWorkingDate: this.formResignData.lastWorkingDate
        });

        this.closeResignModal();
    }

    closeResignModal() {
        this.showResignModal = false;
        this.formResignData.resignDate = null
        this.formResignData.lastWorkingDate = null
    }

    handleClose() {
        this.resetForm();
        this.editData = null;
        this.onClose.emit();
    }

    private resetForm() {
        this.formData = {
            firstNameTh: '',
            lastNameTh: '',
            nickname: '',
            firstNameEn: '',
            lastNameEn: '',
            phone: '',
            email: '',
            company: null,
            department: '',
            position: '',
            startDate: null,
            endDate: null,
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

        this.uploadedFiles = [];
        this.salaryDisplay = '';
        this.otherIncomeDisplay = '';
    }


    openPicker(event: any) {
        event.target.showPicker();
    }

    // MASTER

    getBanks() {
        this.masterService.getBankMaster().subscribe({
            next: (data) => {
                // console.log(data);
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
                // console.log(data);
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
                // console.log(data);
                this.departmentList = data
            },
            error: (error) => {
                console.error('Error fetching data:', error);
            }
        });
    }

    // function
    onCompanyChange(company: any, isUserChange = true) {
        if (isUserChange) {
            this.formData.department = '';
        }

        if (!company) {
            this.filteredDepartmentList = [];
            return;
        }

        this.filteredDepartmentList = this.departmentList.filter(
            dept => dept.COMPANY_CODE === company.COMPANY_CODE
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

    private mapCompanyAndDepartment() {


        if (!this.formData.company) return;

        // 🔹 map company
        const selectedCompany = this.companyList.find(
            c => c.COMPANY_CODE === this.formData.company
        );

        if (selectedCompany) {
            this.formData.company = selectedCompany;
            this.onCompanyChange(selectedCompany, false);
        }

        // 🔹 map department
        const selectedDepartment = this.departmentList.find(
            d => d.COSTCENT === this.formData.department
        );

        if (selectedDepartment) {
            this.formData.department = selectedDepartment;
        }
    }

    private syncMoneyDisplay() {

        this.salaryDisplay = this.formData.salary
            ? this.formatMoney(this.formData.salary)
            : '';

        this.otherIncomeDisplay = this.formData.otherIncome
            ? this.formatMoney(this.formData.otherIncome)
            : '';

        this.calculateTotal();
    }

    private formatDateLocal(date: Date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

}
