import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { SettingService } from '../../services/setting.service';
import { LoadingService } from '../../services/loading';

interface DeptHeadPerson {
  level: number;
  code: string;
  name: string;
  num_lvl: number;
}

interface DeptEmployee {
  emp_code: string;
  emp_name: string;
  nickname: string | null;
  numlvl: number;
}

interface DeptHeadItem {
  cost_cent: string;
  name_cost_cent: string;
  company_code: string;
  company_name: string;
  heads: DeptHeadPerson[];
  employees: DeptEmployee[];
}

@Component({
  selector: 'app-dept-heads',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    SkeletonComponent,
    EmptyStateComponent,
    PaginationComponent,
  ],
  templateUrl: './dept-heads.html',
  styleUrl: './dept-heads.scss',
})
export class DeptHeadsComponent implements OnInit {
  private settingService = inject(SettingService);
  private loadingService = inject(LoadingService);

  pageTitle = signal<string>('หัวหน้าแผนก');
  items = signal<DeptHeadItem[]>([]);
  isLoading = this.loadingService.loading('dept-heads');

  // Filter form state
  filterText = signal<string>('');
  filterCompany = signal<string>('');
  filterDept = signal<string>('');

  // Applied filters (after Search)
  appliedText = signal<string>('');
  appliedCompany = signal<string>('');
  appliedDept = signal<string>('');

  // Modal
  selectedDept = signal<DeptHeadItem | null>(null);

  // Pagination
  currentPage = signal<number>(0);
  pageSize = signal<number>(10);

  // Unique company list
  companyList = computed(() => {
    const map = new Map<string, string>();
    this.items().forEach((d) => map.set(d.company_code, d.company_name));
    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  });

  // Department list filtered by selected company
  deptList = computed(() => {
    const company = this.filterCompany();
    return this.items()
      .filter((d) => !company || d.company_code === company)
      .map((d) => ({ cost_cent: d.cost_cent, name: d.name_cost_cent }));
  });

  filteredItems = computed(() => {
    const text = this.appliedText().toLowerCase().trim();
    const company = this.appliedCompany();
    const dept = this.appliedDept();
    return this.items().filter((d) => {
      const matchText =
        !text ||
        d.employees.some(
          (e) =>
            e.emp_name.toLowerCase().includes(text) ||
            e.emp_code.toLowerCase().includes(text) ||
            (e.nickname ?? '').toLowerCase().includes(text),
        );
      const matchCompany = !company || d.company_code === company;
      const matchDept = !dept || d.cost_cent === dept;
      return matchText && matchCompany && matchDept;
    });
  });

  totalItems = computed(() => this.filteredItems().length);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));

  paginatedItems = computed(() => {
    const start = this.currentPage() * this.pageSize();
    return this.filteredItems().slice(start, start + this.pageSize());
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loadingService.start('dept-heads');
    this.settingService.getDeptHeads().subscribe({
      next: (res) => {
        this.items.set(res.data ?? []);
        this.loadingService.stop('dept-heads');
      },
      error: () => {
        this.loadingService.stop('dept-heads');
      },
    });
  }

  onCompanyChange(value: string) {
    this.filterCompany.set(value);
    this.filterDept.set(''); // reset แผนกเมื่อเปลี่ยนบริษัท
  }

  applyFilter() {
    this.appliedText.set(this.filterText());
    this.appliedCompany.set(this.filterCompany());
    this.appliedDept.set(this.filterDept());
    this.currentPage.set(0);
  }

  clearFilter() {
    this.filterText.set('');
    this.filterCompany.set('');
    this.filterDept.set('');
    this.appliedText.set('');
    this.appliedCompany.set('');
    this.appliedDept.set('');
    this.currentPage.set(0);
  }

  goToPage(page: number) {
    this.currentPage.set(page);
  }

  setPageSize(size: number) {
    this.pageSize.set(size);
    this.currentPage.set(0);
  }

  getMatchingEmployees(dept: DeptHeadItem): DeptEmployee[] {
    const text = this.appliedText().toLowerCase().trim();
    if (!text) return [];
    return dept.employees.filter(
      (e) =>
        e.emp_name.toLowerCase().includes(text) ||
        e.emp_code.toLowerCase().includes(text) ||
        (e.nickname ?? '').toLowerCase().includes(text),
    );
  }

  modalEmployees = computed(() => {
    const dept = this.selectedDept();
    if (!dept) return [];
    const text = this.appliedText().toLowerCase().trim();
    if (!text) return dept.employees;
    return dept.employees.filter(
      (e) =>
        e.emp_name.toLowerCase().includes(text) ||
        e.emp_code.toLowerCase().includes(text) ||
        (e.nickname ?? '').toLowerCase().includes(text),
    );
  });

  openDetail(dept: DeptHeadItem) {
    this.selectedDept.set(dept);
  }

  closeDetail() {
    this.selectedDept.set(null);
  }

  sortedHeads(heads: DeptHeadPerson[]): DeptHeadPerson[] {
    return [...heads].sort((a, b) => b.level - a.level);
  }

  getLevelLabel(level: number): string {
    return `ระดับ ${level}`;
  }
}
