import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { createListingState, createListingComputeds_v2, TableSortHelper } from '../../utils/listing.util';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { FreelanceFormComponent } from '../../components/features/freelance-form/freelance-form';
import {
    createAngularTable,
    getCoreRowModel,
    SortingState,
} from '@tanstack/angular-table';
import { LoadingService } from '../../services/loading';
import { FreelanceService } from '../../services/freelance-management.service';
import { SwalService } from '../../services/swal.service';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { MasterDataService } from '../../services/master-data.service';
import { finalize, firstValueFrom } from 'rxjs';
import { FileConverterService } from '../../services/file-converter';

interface FreelanceMember {
    id: string;
    employeeId: string;
    name: string;
    nickname: string;
    phone: string;
    company: any | null;
    // company: string;
    department: string;
    salary: number;
    otherIncome: number;
    startDate: string;
    endDate: string;
    empStatus: string;
    selected?: boolean;
}

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
    supplierCode: string;
    adUser: string;
    fotdNumber: string;
    description: string;
    attachments: { name: string; file: File; description: string; }[];
    resignDate?: string;
    lastWorkingDate?: string;
    emp_status: string;
}

@Component({
    selector: 'app-freelance-management',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        PaginationComponent,
        PageHeaderComponent,
        SkeletonComponent,
        EmptyStateComponent,
        FreelanceFormComponent,
        NzSelectModule
    ],
    templateUrl: './freelance-management.html',
    styleUrl: './freelance-management.scss'
})
export class FreelanceManagementComponent implements OnInit {
    private loadingService = inject(LoadingService);
    private freelanceService = inject(FreelanceService);
    private swalService = inject(SwalService);
    private masterService = inject(MasterDataService);
    private fileConvertService = inject(FileConverterService);

    isLoading = this.loadingService.loading('freelance-list');
    data = signal<FreelanceMember[]>([]);
    sorting = signal<SortingState>([]);

    isSaving = false;

    // MASTER
    companyList: any[] = []
    departmentList: any[] = []

    // Modal state
    isFormOpen = signal<boolean>(false);
    editingItem = signal<FreelanceFormData | null>(null);

    // New Filters
    filterCompany = signal<any>(null);
    filterDepartment = signal<any>('');
    filterMonth = signal<string>('');

    appliedCompany = signal<any>(null);
    appliedDepartment = signal<any>(null);
    appliedSearch = signal<string>(''); // ค่าที่กดค้นหาแล้ว

    activeData = signal<FreelanceMember[]>([]);
    resignData = signal<FreelanceMember[]>([]);

    activeListing = createListingState();
    resignListing = createListingState();

    activeComps = createListingComputeds_v2(this.activeData, this.activeListing);
    resignComps = createListingComputeds_v2(this.resignData, this.resignListing);

    activeSorting = signal<SortingState>([]);
    resignSorting = signal<SortingState>([]);

    searchText = signal('');        // ค่าที่พิมพ์อยู่

    processedData = computed(() => {
        let filtered = [...this.data()];
        const search = this.appliedSearch().toLowerCase();
        const company = this.appliedCompany();
        const department = this.appliedDepartment();

        if (search) {
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(search) ||
                item.nickname.toLowerCase().includes(search) ||
                item.employeeId.toLowerCase().includes(search) ||
                item.phone.includes(search)
            );
        }

        if (company) {
            filtered = filtered.filter(item =>
                item.company === company.COMPANY_CODE
            );
        }

        if (department) {
            filtered = filtered.filter(item =>
                item.department ===
                department.COSTCENT + ' - ' + department.NAMECOSTCENT
            );
        }

        // sort เหมือนเดิม
        const sortState = this.sorting()[0];
        if (sortState) {
            const { id, desc } = sortState;
            const direction = desc ? -1 : 1;
            filtered.sort((a, b) => {
                const valA = a[id as keyof FreelanceMember];
                const valB = b[id as keyof FreelanceMember];
                if (valA === undefined || valB === undefined) return 0;
                if (valA < valB) return -1 * direction;
                if (valA > valB) return 1 * direction;
                return 0;
            });
        }

        return filtered;
    });

    filteredDepartmentList = computed(() => {
        const company = this.filterCompany();

        if (!company) return [];

        return this.departmentList.filter(dep =>
            dep.COMPANY_CODE === company.COMPANY_CODE
        );
    });

    activeTable = createAngularTable(() => ({
        data: this.activeComps.paginatedData(),
        columns: [
            { id: 'select', header: '' },
            { accessorKey: 'name', header: 'พนักงาน' },
            { accessorKey: 'phone', header: 'เบอร์โทรศัพท์' },
            { accessorKey: 'company', header: 'บริษัท' },
            { accessorKey: 'department', header: 'แผนก' },
            { accessorKey: 'salary', header: 'เงินเดือน' },
            { accessorKey: 'otherIncome', header: 'รายได้อื่น' },
            { accessorKey: 'startDate', header: 'วันที่เริ่มต้น' },
            { accessorKey: 'endDate', header: 'วันที่สิ้นสุด' },
            { id: 'actions', header: '' }
        ],
        state: { sorting: this.sorting() },
        onSortingChange: (updaterOrValue) => {
            const next = typeof updaterOrValue === 'function' ? updaterOrValue(this.sorting()) : updaterOrValue;
            this.sorting.set(next);
        },
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
    }));

    resignTable = createAngularTable(() => ({
        data: this.resignComps.paginatedData(),
        columns: [
            { id: 'select', header: '' },
            { accessorKey: 'name', header: 'พนักงาน' },
            { accessorKey: 'phone', header: 'เบอร์โทรศัพท์' },
            { accessorKey: 'company', header: 'บริษัท' },
            { accessorKey: 'department', header: 'แผนก' },
            { accessorKey: 'salary', header: 'เงินเดือน' },
            { accessorKey: 'otherIncome', header: 'รายได้อื่น' },
            { accessorKey: 'startDate', header: 'วันที่เริ่มต้น' },
            { accessorKey: 'endDate', header: 'วันที่สิ้นสุด' },
            { id: 'actions', header: '' }
        ],
        state: { sorting: this.sorting() },
        onSortingChange: (updaterOrValue) => {
            const next = typeof updaterOrValue === 'function' ? updaterOrValue(this.sorting()) : updaterOrValue;
            this.sorting.set(next);
        },
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
    }));

    ngOnInit() {
        // this.loadData();
        this.getCompanies();
        this.getDepartments();
        // this.getFreelance();
        this.loadInitialData();
    }

    toggleSort(tableType: 'active' | 'resign', columnId: string) {
        const table =
            tableType === 'active' ? this.activeTable : this.resignTable;

        TableSortHelper.toggleSort(table, columnId);
    }
    getSortIcon(tableType: 'active' | 'resign', columnId: string) {
        const table =
            tableType === 'active' ? this.activeTable : this.resignTable;

        return TableSortHelper.getSortIcon(table, columnId);
    }

    goToPage(tableType: 'active' | 'resign', page: number) {

        if (tableType === 'active') {
            this.activeListing.currentPage.set(page);

            this.fetchFreelanceByStatus(
                'Active',
                page + 1,
                this.activeListing.pageSize()
            ).subscribe(res => this.dataActiveFromApi(res));

        } else {

            this.resignListing.currentPage.set(page);

            this.fetchFreelanceByStatus(
                'Resigned',
                page + 1,
                this.resignListing.pageSize()
            ).subscribe(res => this.dataResignFromApi(res));
        }
    }

    setPageSize(tableType: 'active' | 'resign', size: number) {

        if (tableType === 'active') {
            this.activeListing.pageSize.set(size);
            this.activeListing.currentPage.set(0);

            this.fetchFreelanceByStatus(
                'Active',
                1,
                size
            ).subscribe(res => this.dataActiveFromApi(res));

        } else {

            this.resignListing.pageSize.set(size);
            this.resignListing.currentPage.set(0);

            this.fetchFreelanceByStatus(
                'Resigned',
                1,
                size
            ).subscribe(res => this.dataResignFromApi(res));
        }
    }


    toggleSelectAll(event: Event) {
        const checked = (event.target as HTMLInputElement).checked;
        this.data.update(items => items.map(item => ({ ...item, selected: checked })));
    }

    toggleItemSelection(item: FreelanceMember) {
        this.data.update(items => items.map(i => i.id === item.id ? { ...i, selected: !i.selected } : i));
    }

    isAllSelected(): boolean {
        return this.data().length > 0 && this.data().every(item => item.selected);
    }

    openCreateForm() {
        this.editingItem.set(null);
        this.isFormOpen.set(true);
    }

    original_formData_freelance: any;

    async openEditForm(item: FreelanceMember) {

        const res = await firstValueFrom(
            this.getFreelanceById(item.id)
        );

        const info = res.info
        const file = res.files
        // console.log(info, file)

        let convertedFiles: any[] = [];

        if (file?.length) {
            // convertedFiles = await Promise.all(
            //     file.map((f: any) =>
            //         this.convertUrlToFile(f)
            //     )
            // );

            convertedFiles = await this.fileConvertService.convertUrlsToFiles(file);
        }

        const formData = {
            id: info.ID,
            firstNameTh: info.FIRSTNAME_TH,
            lastNameTh: info.LASTNAME_TH,
            firstNameEn: info.FIRSTNAME_EN,
            lastNameEn: info.LASTNAME_EN,
            nickname: info.NICKNAME,
            phone: info.MOBILE,
            email: info.EMAIL,
            company: info.COMPANY_CODE,
            department: info.COSTCENT,
            position: info.POSITION,
            startDate: info.CONTRACT_START_DATE ? new Date(info.CONTRACT_START_DATE) : null,
            endDate: info.CONTRACT_END_DATE ? new Date(info.CONTRACT_END_DATE) : null,
            salary: info.SALARY,
            otherIncome: info.OTHER_INCOME || 0,
            totalIncome: info.TOTAL_AMT,
            accountNumber: info.ACC_BOOK_NO,
            bank: info.NAMEBANK,
            supplierCode: info.SUPPLIER_CODE || '-',
            adUser: info.AD_USER || '-',
            fotdNumber: info.EMP_NO,
            description: info.REMARK,
            attachments: convertedFiles || [],
            resignDate: info.RESIGN_DATE,
            lastWorkingDate: info.LAST_DATE,
            emp_status: info.EMP_STATUS
        }

        this.original_formData_freelance = structuredClone(formData);

        // console.log(formData);

        this.editingItem.set(formData);
        this.isFormOpen.set(true);
    }

    closeForm() {
        this.isFormOpen.set(false);
        this.editingItem.set(null);
    }

    handleFormSave(fData: any) {
        // this.loadingService.start('freelance-list');
        if (this.isSaving) return;   // ✅ กันกดซ้ำ
        this.isSaving = true;
        this.swalService.loading('กำลังบันทึกข้อมูล...');

        const is_update = fData.id ? true : false
        const is_resign = fData.btn_action === "RESIGN" ? true : false
        const is_Activate = fData.btn_action === "ACTIVATE" ? true : false

        // console.log(is_update)
        // console.log('Form data:', fData);

        let changedData: any = fData;

        if (is_update) {
            // console.log('original Form data:', this.original_formData_freelance);
            const diff = this.getChangedFields(fData, this.original_formData_freelance);
            // console.log('Changed fields:', diff);
            changedData = diff;
        }

        const formData = new FormData();

        // 🔹 action
        formData.append('action', is_update ? 'update' : fData.attachments.length > 0 ? 'create_with_files' : 'create');
        (is_update && formData.append('freelanceId', fData.id));

        // 🔹 text fields
        (!is_update || changedData.firstNameTh !== undefined) && formData.append('firstname_th', fData.firstNameTh);
        (!is_update || changedData.lastNameTh !== undefined) && formData.append('lastname_th', fData.lastNameTh);
        (!is_update || changedData.firstNameEn !== undefined) && formData.append('firstname_en', fData.firstNameEn);
        (!is_update || changedData.lastNameEn !== undefined) && formData.append('lastname_en', fData.lastNameEn);
        (!is_update || changedData.nickname !== undefined) && formData.append('nickname', fData.nickname);

        (!is_update || changedData.phone !== undefined) && formData.append('mobile', fData.phone);
        (!is_update || changedData.email !== undefined) && formData.append('email', fData.email);
        (!is_update || changedData.position !== undefined) && formData.append('position', fData.position);

        (!is_update || changedData.salary !== undefined) && formData.append('salary', fData.salary.toString());
        (!is_update || changedData.otherIncome !== undefined) && formData.append('other_income', fData.otherIncome.toString());
        (!is_update || changedData.totalIncome !== undefined) && formData.append('total_amt', fData.totalIncome.toString());

        (!is_update || changedData.startDate !== undefined) && formData.append('contract_start_date', this.formatDateLocal(fData.startDate));
        (!is_update || changedData.endDate !== undefined) && formData.append('contract_end_date', this.formatDateLocal(fData.endDate));

        (!is_update || changedData.accountNumber !== undefined) && formData.append('acc_book_no', fData.accountNumber ?? '');
        (!is_update || changedData.bank !== undefined) && formData.append('namebank', fData.bank ?? '');
        (!is_update || changedData.department !== undefined) && formData.append('costcent', fData.department.COSTCENT ?? '');
        (!is_update || changedData.department !== undefined) && formData.append('namecostcent', fData.department.NAMECOSTCENT ?? '');

        (!is_update || changedData.company !== undefined) && formData.append('company_code', fData.company.COMPANY_CODE ?? '');
        (!is_update || changedData.company !== undefined) && formData.append('company_name', fData.company.COMPANY_NAME ?? '');
        (!is_update && formData.append('candidate_id', '0'));
        (!is_update && formData.append('emp_status', 'Active'));
        (!is_update && formData.append('jobgrade', 'ZZ'));

        (is_resign) && formData.append('resign_date', this.formatDateLocal(fData.resignDate));
        (is_resign) && formData.append('last_date', this.formatDateLocal(fData.lastWorkingDate));
        (is_resign) && formData.append('emp_status', 'Resigned');

        (is_Activate) && formData.append('emp_status', 'Active');

        if (Array.isArray(fData.attachments)) {

            // 1️⃣ new files
            fData.attachments.forEach((item: any) => {
                if (item?.file instanceof File && !item.fileId) {
                    formData.append('newFiles', item.file);
                    formData.append('newFileDescriptions', item.description || '');
                }
            });

            if (is_update) {

                const originalFiles = this.original_formData_freelance.attachments || [];

                // 2️⃣ deleted
                const deletedFiles = originalFiles.filter((oldFile: any) =>
                    !fData.attachments.some((newFile: any) =>
                        Number(newFile.fileId) === Number(oldFile.fileId)
                    )
                );

                if (deletedFiles.length > 0) {
                    const deleteIds = deletedFiles
                        .map((file: any) => file.fileId)
                        .join(',');

                    formData.append('deleteFileIds', deleteIds);
                }

                // 3️⃣ description changed only
                const updatedDescriptions = fData.attachments.filter((item: any) => {
                    if (!item.fileId || item.file instanceof File) return false;

                    const oldFile = originalFiles.find((f: any) =>
                        f.fileId === item.fileId
                    );

                    return oldFile && (oldFile.description || '') !== (item.description || '');
                });

                updatedDescriptions.forEach((file: any) => {
                    formData.append('fileIdForDesc', file.fileId.toString());
                    formData.append('newFileDescription', file.description || '');
                });

                // 4️⃣ replaced files
                const replacedFiles = fData.attachments.filter((item: any) => {

                    if (!item.fileId) return false;
                    if (!(item.file instanceof File)) return false;

                    const oldFile = originalFiles.find((f: any) =>
                        Number(f.fileId) === Number(item.fileId)
                    );

                    if (!oldFile) return false;

                    // เช็คว่าชื่อไฟล์เปลี่ยนจริง
                    return item.file.name !== oldFile.name;
                });

                replacedFiles.forEach((file: any) => {
                    // formData.append('replaceFileIds', file.fileId.toString());
                    formData.append('replaceFiles', file.file);
                    formData.append('replaceDescriptions', file.description || '');
                });

                if (replacedFiles.length > 0) {
                    const replaceIds = replacedFiles
                        .map((file: any) => file.fileId)
                        .join(',');

                    formData.append('replaceFileIds', replaceIds);
                }

            }
        }

        const obj: any = {};
        formData.forEach((value, key) => {
            obj[key] = value;
        });

        console.log(obj);
        console.log('replaceDescriptions:', formData.getAll('replaceDescriptions'));
        console.log('replaceFiles:', formData.getAll('replaceFiles'));
        console.log('newFileDescriptions:', formData.getAll('newFileDescriptions'));
        console.log('Files:', formData.getAll('newFiles'));

        this.freelanceService.createFreelance(formData)
            .pipe(
                finalize(() => {
                    this.swalService.close();
                    this.isSaving = false;
                    this.loadInitialData();
                    this.closeForm();
                })
            ).subscribe({
                next: (res) => {
                    // console.log(res);
                    if (res.message.toLowerCase().includes('update')) {
                        this.swalService.success('อัพเดทพนักงานฟรีแลนซ์สำเร็จ')
                    } else if (res.message.toLowerCase().includes('create')) {
                        this.swalService.success('เพิ่มพนักงานฟรีแลนซ์สำเร็จ')
                    } else {
                        console.log('ตกเงื่อนไข')
                        this.swalService.success(res.message)
                    }
                },
                error: (error) => {
                    console.error('Error fetching data:', error.error.message);
                    const message = error?.error?.message || '';
                    if (message.includes('duplicate key')) {
                        this.swalService.warning('ชื่อนามสกุลมีอยู่ในระบบแล้ว');
                    } else {
                        this.swalService.error('เกิดข้อผิดพลาด', message);
                    }
                },
                complete: () => {
                    console.log("COMPLETE");
                }
            });
    }

    // FUNCTION
    onCompanyChange(company: any) {
        this.filterCompany.set(company);
        this.filterDepartment.set(null);
    }

    applyFilter() {
        this.activeListing.currentPage.set(0);
        this.resignListing.currentPage.set(0);

        this.loadInitialData();
    }

    private async convertUrlToFile(fileData: any) {

        const response = await fetch(fileData.FILE_DIR);

        if (!response.ok) {
            throw new Error('Failed to fetch file: ' + fileData.FILE_NAME);
        }

        const blob = await response.blob();

        const file = new File(
            [blob],
            fileData.FILE_NAME,
            { type: fileData.FILE_TYPE }
        );

        // console.log(file)

        return {
            name: fileData.FILE_NAME,
            file: file,
            description: fileData.DESCRIPTION || '',
            // url: fullUrl,        // ✅ สำหรับเปิดดูใน tab ใหม่
            fileId: fileData.FileID
        };
    }

    private getChangedFields(current: any, original: any) {
        const changes: any = {};

        Object.keys(current).forEach(key => {
            if (current[key] !== original[key]) {
                changes[key] = {
                    oldValue: original[key],
                    newValue: current[key]
                };
            }
        });
        return changes;
    }

    private formatDateLocal(date: Date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    loadInitialData() {
        this.loadingService.start('freelance-list');

        const pageA = this.activeListing.currentPage() + 1;
        const sizeA = this.activeListing.pageSize();

        const pageR = this.resignListing.currentPage() + 1;
        const sizeR = this.resignListing.pageSize();

        this.fetchFreelanceByStatus('Active', pageA, sizeA)
            .subscribe(res => {
                // console.log("Active >>", res)
                this.dataActiveFromApi(res);
            });

        this.fetchFreelanceByStatus('Resigned', pageR, sizeR)
            .subscribe(res => {
                // console.log("Resigned >>", res)
                this.dataResignFromApi(res);
                this.loadingService.stop('freelance-list');
            });
    }

    private dataActiveFromApi(res: any) {
        // console.log("Active >>", res)
        const items = res.items ?? []
        this.activeData.set(this.mapApiData(items));

        this.activeListing.totalItems.set(res.total ?? 0);
        this.activeListing.totalPages.set(res.totalPages ?? 1);
        this.activeListing.currentPage.set((res.page ?? 1) - 1);
    }

    private dataResignFromApi(res: any) {
        // console.log("Resigned >>", res)
        const items = res.items ?? []
        this.resignData.set(this.mapApiData(items));

        this.resignListing.totalItems.set(res.total ?? 0);
        this.resignListing.currentPage.set((res.page ?? 1) - 1);
        this.resignListing.totalPages.set(res.totalPages ?? 1);
    }

    private mapApiData(items: any[]): FreelanceMember[] {
        // console.log("items >> ", items)
        return items.map((item: any) => ({
            id: item.ID,
            employeeId: item.EMP_NO,
            name: `${item.FIRSTNAME_TH} ${item.LASTNAME_TH}`,
            nickname: item.NICKNAME,
            phone: item.MOBILE,
            company: item.COMPANY_CODE,
            department: `${item.COSTCENT} - ${item.NAMECOSTCENT}`,
            salary: item.SALARY,
            otherIncome: item.OTHER_INCOME,
            startDate: item.CONTRACT_START_DATE,
            endDate: item.CONTRACT_END_DATE,
            empStatus: item.EMP_STATUS,
            selected: false
        }));
    }

    // GET

    private fetchFreelanceByStatus(
        status: 'Active' | 'Resigned',
        page: number,
        pageSize: number
    ) {
        const searchText = this.searchText();
        const company = this.filterCompany();
        const department = this.filterDepartment();

        return this.freelanceService.getFreelance({
            page,
            pageSize,
            searchText: searchText || undefined,
            companyCode: company?.COMPANY_CODE,
            costCent: department?.COSTCENT,
            empStatus: status
        });
    }

    getFreelanceById(id: any) {
        return this.freelanceService.getFreelanceById(id);
    }

    // GET MASTER
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
}

