import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { createListingState, createListingComputeds, TableSortHelper } from '../../utils/listing.util';
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

interface FreelanceMember {
    id: string;
    employeeId: string;
    name: string;
    nickname: string;
    phone: string;
    company: string;
    department: string;
    salary: number;
    otherIncome: number;
    startDate: string;
    endDate: string;
    selected?: boolean;
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
        FreelanceFormComponent
    ],
    templateUrl: './freelance-management.html',
    styleUrl: './freelance-management.scss'
})
export class FreelanceManagementComponent implements OnInit {
    private loadingService = inject(LoadingService);
    private freelanceService = inject(FreelanceService);
    private swalService = inject(SwalService);

    isLoading = this.loadingService.loading('freelance-list');
    data = signal<FreelanceMember[]>([]);
    listing = createListingState();
    sorting = signal<SortingState>([]);

    // Modal state
    isFormOpen = signal<boolean>(false);
    editingItem = signal<FreelanceMember | null>(null);

    // New Filters
    filterCompany = signal<string>('');
    filterDepartment = signal<string>('');
    filterMonth = signal<string>('');

    processedData = computed(() => {
        let filtered = [...this.data()];
        const search = this.listing.searchText().toLowerCase();
        const company = this.filterCompany();
        const department = this.filterDepartment();

        if (search) {
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(search) ||
                item.nickname.toLowerCase().includes(search) ||
                item.employeeId.toLowerCase().includes(search) ||
                item.phone.includes(search)
            );
        }

        if (company) {
            filtered = filtered.filter(item => item.company === company);
        }

        if (department) {
            filtered = filtered.filter(item => item.department === department);
        }

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

    comps = createListingComputeds(this.processedData, this.listing);

    table = createAngularTable(() => ({
        data: this.comps.paginatedData(),
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
        this.loadData();
    }

    loadData() {
        this.loadingService.start('freelance-list');
        // Updated Mock data based on screenshot
        setTimeout(() => {
            this.data.set([
                {
                    id: '1',
                    employeeId: 'FOTD00001',
                    name: 'Lili Daniels',
                    nickname: 'Lilly',
                    phone: '098-555-5555',
                    company: 'OTD',
                    department: '10806 - IT Department',
                    salary: 100000,
                    otherIncome: 100000,
                    startDate: '10-Jan-2026',
                    endDate: '10-Jan-2027',
                    selected: false
                },
                {
                    id: '2',
                    employeeId: 'FOTD00002',
                    name: 'Henrietta Whitney',
                    nickname: 'Henry',
                    phone: '098-555-5555',
                    company: 'GTV',
                    department: '10806 - IT Department',
                    salary: 20000,
                    otherIncome: 100000,
                    startDate: '15-Feb-2026',
                    endDate: '15-Feb-2027',
                    selected: false
                },
                {
                    id: '3',
                    employeeId: 'FOTD00003',
                    name: 'Seth McDaniel',
                    nickname: 'Set',
                    phone: '098-555-5555',
                    company: 'OTV',
                    department: '10806 - IT Department',
                    salary: 30000,
                    otherIncome: 100000,
                    startDate: '01-Mar-2026',
                    endDate: '01-Mar-2027',
                    selected: false
                },
                {
                    id: '4',
                    employeeId: 'FOTD00004',
                    name: 'Edward King',
                    nickname: 'Ed',
                    phone: '098-555-5555',
                    company: 'ATM',
                    department: '10806 - IT Department',
                    salary: 40000,
                    otherIncome: 100000,
                    startDate: '05-Apr-2026',
                    endDate: '05-Apr-2027',
                    selected: false
                }
            ]);
            this.loadingService.stop('freelance-list');
        }, 1000);
    }

    toggleSort(columnId: string) {
        TableSortHelper.toggleSort(this.table, columnId);
    }

    getSortIcon(columnId: string) {
        return TableSortHelper.getSortIcon(this.table, columnId);
    }

    setPageSize(size: number) {
        this.listing.pageSize.set(size);
        this.listing.currentPage.set(0);
    }

    goToPage(page: number) {
        this.listing.currentPage.set(page);
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

    openEditForm(item: FreelanceMember) {
        this.editingItem.set(item);
        this.isFormOpen.set(true);
    }

    closeForm() {
        this.isFormOpen.set(false);
        this.editingItem.set(null);
    }

    handleFormSave(fData: any) {
        console.log('Form data:', fData);

        const formData = new FormData();

        // 🔹 action
        formData.append('action', fData.attachments.length > 0 ? 'create_with_files' : 'create');

        // 🔹 text fields
        formData.append('firstname_th', fData.firstNameTh); //
        formData.append('lastname_th', fData.lastNameTh); //
        formData.append('firstname_en', fData.firstNameEn); //
        formData.append('lastname_en', fData.lastNameEn); //
        formData.append('nickname', fData.nickname); //
        formData.append('mobile', fData.phone); //
        formData.append('email', fData.email); //
        formData.append('position', fData.position); //
        formData.append('salary', fData.salary.toString()); //
        formData.append('other_income', fData.otherIncome.toString()); //
        formData.append('total_amt', fData.totalIncome.toString()); //
        // formData.append('remark', fData.description);

        formData.append('contract_start_date', new Date(fData.startDate).toISOString().split('T')[0]); // 2025-01-01
        formData.append('contract_end_date', new Date(fData.endDate).toISOString().split('T')[0]); // 2025-01-01
        // formData.append('resign_date', fData.lastWorkingDate ?? '');

        formData.append('acc_book_no', fData.accountNumber); //
        formData.append('namebank', fData.bank); //
        formData.append('costcent', fData.department.COSTCENT); //
        formData.append('namecostcent', fData.department.NAMECOSTCENT); //

        formData.append('candidate_id', '0');
        formData.append('company_code', fData.company.COMPANY_CODE); //
        formData.append('company_name', fData.company.COMPANY_NAME); //
        formData.append('emp_status', 'Active');
        formData.append('jobgrade', 'ZZ'); //
        // formData.append('freelanceId', '');

        // 🔹 files + descriptions
        if (Array.isArray(fData.attachments)) {
            fData.attachments.forEach((item: any) => {

                if (item?.file instanceof File) {
                    formData.append('files', item.file);
                    formData.append('fileDescriptions', item.description || '');
                }

            });
        }

        const obj: any = {};
        formData.forEach((value, key) => {
            obj[key] = value;
        });

        console.log(obj);
        console.log('Descriptions:', formData.getAll('fileDescriptions'));
        console.log('Files:', formData.getAll('files'));

        this.freelanceService.createFreelance(formData).subscribe({
            next: (res) => {
                console.log(res);
                this.swalService.success('เพิ่มพนักงานฟรีแลนซ์สำเร็จ')
            },
            error: (error) => {
                console.error('Error fetching data:', error.error.message);
                const message = error?.error?.message || '';
                if (message.includes('duplicate key')) {
                    this.swalService.warning('ชื่อนามสกุลมีอยู่ในระบบแล้ว');
                } else {
                    this.swalService.error('เกิดข้อผิดพลาด', message);
                }
            }
        });


        // TODO: Implement save logic
        this.closeForm();
    }

    sendData() {
        console.log('Sending selected data:', this.data().filter(item => item.selected));
    }
}
