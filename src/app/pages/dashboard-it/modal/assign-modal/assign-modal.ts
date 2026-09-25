import {
  Component,
  inject,
  computed,
  EventEmitter,
  Input,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environments/environment';
import { ModalShellComponent } from '../../../../components/shared/modal-shell/modal-shell';
import { ItServiceService } from '../../../../services/it-service.service';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-assign-modal',
  imports: [
    CommonModule,
    FormsModule,
    NzSelectModule,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    ModalShellComponent,
  ],
  templateUrl: './assign-modal.html',
  styleUrl: './assign-modal.scss',
})
export class AssignModal {
  getEmployeeImage(empCode: string): string {
    return `${environment.employeeImageUrl}/${empCode}.jpg`;
  }
  @Input() ticket: any;
  @Input() visible = false;
  // @Input() assigneeGroups: any[] = [];

  // เพิ่ม property
  assignSearchKeyword = signal('');
  private _assigneeGroups = signal<any[]>([]);

  // setter สำหรับ Input
  @Input() set assigneeGroups(val: any[]) {
    this._assigneeGroups.set(val);
  }

  @Output() closeModal = new EventEmitter<void>();
  @Output() submitModal = new EventEmitter<any>();

  selectedAssigneeEmpCodes: any[] = [];
  selectedTag: number | null = null;
  selectedCategory: number | null = null;
  problemSource: 'user' | 'system' | null = null;
  private readonly itService = inject(ItServiceService);
  private readonly authService = inject(AuthService);
  readonly categories = signal<{ id: number; sub_category_name: string; display_order?: number }[]>([]);
  readonly categoriesLoading = signal(false);
  readonly categoriesError = signal(false);
  readonly mainServices = signal<any[]>([]);
  readonly userSubOptions = signal<any[]>([]);
  readonly systemSubOptions = signal<any[]>([]);
  readonly servicesLoading = signal(false);
  readonly servicesError = signal(false);

  ngOnInit(): void {
    this.loadCategories();
    this.loadServiceTypes();
  }

  get canAccessAdditionalTicketTypes(): boolean {
    const employeeCode = String(this.authService.userData()?.CODEMPID ?? '').trim().toUpperCase();
    return ['OTD01125', 'OTD01128', 'OTD01050'].includes(employeeCode);
  }

  readonly canAccessRepairTicketType = !environment.production;

  loadServiceTypes(): void {
    this.servicesLoading.set(true);
    this.servicesError.set(false);
    this.itService.getServiceType().subscribe({
      next: (res) => {
        const selectedIds = new Set(
          (this.ticket?.services ?? []).map((service: any) =>
            Number(service.service_type_id ?? service.serviceTypeId ?? service.id),
          ),
        );
        const mapOptions = (items: any[] = []) =>
          items.map((item) => ({
            ...item,
            id: Number(item.id),
            checked: selectedIds.has(Number(item.id)),
          }));
        this.mainServices.set(
          mapOptions((res?.data?.mainServices ?? []).filter((item: any) => Number(item.id) !== 6)),
        );
        this.userSubOptions.set(mapOptions(res?.data?.userSubOptions));
        this.systemSubOptions.set(mapOptions(res?.data?.systemSubOptions));
        this.servicesLoading.set(false);
      },
      error: () => {
        this.servicesLoading.set(false);
        this.servicesError.set(true);
      },
    });
  }

  toggleService(id: number): void {
    this.mainServices.update((items) =>
      items.map((item) => (Number(item.id) === id ? { ...item, checked: !item.checked } : item)),
    );
    this.userSubOptions.update((items) =>
      items.map((item) => ({ ...item, checked: this.isRequestUserSelected })),
    );
  }

  toggleSystemService(id: number): void {
    this.systemSubOptions.update((items) =>
      items.map((item) => (Number(item.id) === id ? { ...item, checked: !item.checked } : item)),
    );
  }

  get isRequestUserSelected(): boolean {
    return this.mainServices().some((service) => Number(service.id) === 22 && service.checked);
  }

  private get selectedServiceTypeIds(): number[] {
    return [...this.mainServices(), ...this.userSubOptions(), ...this.systemSubOptions()]
      .filter((item) => item.checked)
      .map((item) => Number(item.id));
  }

  loadCategories(): void {
    this.categoriesLoading.set(true);
    this.categoriesError.set(false);
    this.itService.getSubProblem().subscribe({
      next: (res) => {
        this.categories.set([...(res.data ?? [])]
          .map((category) => ({ ...category, id: Number(category.id) }))
          .sort((a, b) => Number(a.display_order ?? 0) - Number(b.display_order ?? 0)));
        this.restoreCategory();
        this.categoriesLoading.set(false);
      },
      error: () => {
        this.categoriesLoading.set(false);
        this.categoriesError.set(true);
      },
    });
  }

  get effectiveTicketTypeId(): number {
    return Number(this.isApproved
      ? this.ticket?.ticketTypeId ?? this.ticket?.ticket_type_id
      : this.selectedTag);
  }

  get canSubmit(): boolean {
    return this.selectedAssigneeEmpCodes.length > 0 &&
      [1, 2, 3].includes(this.effectiveTicketTypeId) &&
      (this.effectiveTicketTypeId !== 2 || (
        !this.categoriesLoading() && !this.categoriesError() &&
        this.categories().some((category) => category.id === this.selectedCategory) &&
        (this.problemSource === 'user' || this.problemSource === 'system')
      )) &&
      (this.effectiveTicketTypeId !== 3 || (
        !this.servicesLoading() && !this.servicesError() &&
        [...this.mainServices(), ...this.systemSubOptions()].some((item) => item.checked)
      ));
  }

  private restoreCategory(): void {
    if (this.effectiveTicketTypeId !== 2 || this.selectedCategory !== null) return;
    const id = Number(this.ticket?.subCategoryId ?? this.ticket?.sub_category_id);
    const name = this.ticket?.ticketCategory ?? this.ticket?.sub_category_name;
    this.selectedCategory = this.categories().find((category) =>
      id ? category.id === id : category.sub_category_name === name,
    )?.id ?? null;
  }
  originalTag: number | null = null;
  reason = '';
  // assignSearchKeyword = '';
  ticketId: number | null = null;

  get isApproved(): boolean {
    return (
      String(this.ticket?.approval_status ?? this.ticket?.approvalStatus ?? '')
        .trim()
        .toLowerCase() === 'approved'
    );
  }

  get ticketTypeLabel(): string {
    const ticketTypeId = Number(this.ticket?.ticketTypeId ?? this.ticket?.ticket_type_id);
    const labels: Record<number, string> = {
      1: 'แจ้งซ่อม',
      2: 'แจ้งปัญหา',
      3: 'ขอใช้บริการ',
    };
    return labels[ticketTypeId] ?? '-';
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['ticket'] && this.ticket) {
      this.selectedTag = Number(this.ticket.ticketTypeId ?? this.ticket.ticket_type_id);
      this.originalTag = this.selectedTag;
      this.selectedCategory = null;
      const source = String(this.ticket.problemBy ?? '').trim().toLowerCase();
      this.problemSource = this.effectiveTicketTypeId === 2 &&
        (source === 'user' || source === 'system') ? source : null;
      this.restoreCategory();
      this.reason = '';
      if (this.ticket.assignments) {
        this.ticketId = this.ticket.ticketId;
        this.selectedAssigneeEmpCodes = this.ticket.assignments.map((a: any) => ({
          id: a.codeempid,
          name: a.full_name,
          adUser: a.aduser,
        }));
      }
    }
  }

  get isChangedToRepair(): boolean {
    return this.selectedTag === 1 && this.originalTag !== 1;
  }

  onTagChange() {
    this.reason = '';
  }

  close() {
    this.closeModal.emit();
  }

  // get filteredAssigneeGroups() {
  //   const kw = (this.assignSearchKeyword || '').trim().toLowerCase();
  //   if (!kw) return this.assigneeGroups;
  //   return this.assigneeGroups
  //     .map((g) => ({
  //       ...g,
  //       members: g.members.filter((m: any) => m.name.toLowerCase().includes(kw)),
  //     }))
  //     .filter((g) => g.members.length > 0);
  // }
  filteredAssigneeGroups = computed(() => {
    const kw = this.assignSearchKeyword().trim().toLowerCase();
    if (!kw) return this._assigneeGroups();
    return this._assigneeGroups()
      .map((g) => ({
        ...g,
        members: g.members.filter((m: any) => m.name.toLowerCase().includes(kw)),
      }))
      .filter((g) => g.members.length > 0);
  });

  onImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (!img.src.includes('user.png')) {
      img.src = 'user.png';
    }
  }

  openImage(empCode: string) {
    // console.log('Open image:', empCode);
  }

  toggleAssignee(emp: any) {
    const idx = this.selectedAssigneeEmpCodes.findIndex((e) => e.id === emp.id);

    if (idx > -1) {
      this.selectedAssigneeEmpCodes.splice(idx, 1);
    } else {
      this.selectedAssigneeEmpCodes.push(emp);
    }
  }
  toggleGroup(group: any) {
    const memberIds = group.members.map((m: any) => m.id);

    const allIn = memberIds.every((id: any) =>
      this.selectedAssigneeEmpCodes.some((e) => e.id === id),
    );

    if (allIn) {
      this.selectedAssigneeEmpCodes = this.selectedAssigneeEmpCodes.filter(
        (e) => !memberIds.includes(e.id),
      );
    } else {
      group.members.forEach((m: any) => {
        const exists = this.selectedAssigneeEmpCodes.some((e) => e.id === m.id);

        if (!exists) {
          this.selectedAssigneeEmpCodes.push(m);
        }
      });
    }
  }

  isGroupSelected(group: any): boolean {
    return group.members.every((m: any) =>
      this.selectedAssigneeEmpCodes.some((e) => e.id === m.id),
    );
  }

  isSelected(empId: string): boolean {
    return this.selectedAssigneeEmpCodes.some((e) => e.id === empId);
  }

  removeAssignee(empId: string) {
    this.selectedAssigneeEmpCodes = this.selectedAssigneeEmpCodes.filter((e) => e.id !== empId);
  }

  save() {
    if (!this.canSubmit) return;
    const ticketTypeId = this.isApproved
      ? Number(this.ticket?.ticketTypeId ?? this.ticket?.ticket_type_id)
      : this.selectedTag;
    this.submitModal.emit({
      assignees: this.selectedAssigneeEmpCodes,
      ticketTypeId,
      subCategoryId: ticketTypeId === 2 ? this.selectedCategory : null,
      serviceTypeIds: ticketTypeId === 3 ? this.selectedServiceTypeIds : [],
      problemSource: ticketTypeId === 2 ? this.problemSource : null,
      ticketId: this.ticketId,
      reason: this.reason.trim() || undefined,
      ...(this.isChangedToRepair && { repairCostType: 'free' }),
    });
  }
}
