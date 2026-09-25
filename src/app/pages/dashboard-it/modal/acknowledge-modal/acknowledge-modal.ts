import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalShellComponent } from '../../../../components/shared/modal-shell/modal-shell';
import { ItServiceService } from '../../../../services/it-service.service';
import { AuthService } from '../../../../services/auth.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-acknowledge-modal',
  imports: [CommonModule, FormsModule, ModalShellComponent],
  templateUrl: './acknowledge-modal.html',
  styleUrl: './acknowledge-modal.scss',
})
export class AcknowledgeModal {
  @Input() ticket: any;
  @Output() submitModal = new EventEmitter<any>();
  @Output() closeModal = new EventEmitter<void>();

  selectedTag: number | null = null;
  selectedCategory: number | null = null;
  problemSource: 'user' | 'system' | null = null;
  readonly categories = signal<{ id: number; sub_category_name: string; display_order?: number }[]>(
    [],
  );
  readonly categoriesLoading = signal(false);
  readonly categoriesError = signal(false);
  private readonly itService = inject(ItServiceService);
  private readonly authService = inject(AuthService);
  readonly mainServices = signal<any[]>([]);
  readonly userSubOptions = signal<any[]>([]);
  readonly systemSubOptions = signal<any[]>([]);
  readonly servicesLoading = signal(false);
  readonly servicesError = signal(false);
  message = '';

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
        this.categories.set(
          [...(res.data ?? [])]
            .map((category) => ({
              ...category,
              id: Number(category.id),
            }))
            .sort((a, b) => Number(a.display_order ?? 0) - Number(b.display_order ?? 0)),
        );
        this.restoreCategory();
        this.categoriesLoading.set(false);
      },
      error: () => {
        this.categoriesError.set(true);
        this.categoriesLoading.set(false);
      },
    });
  }

  get effectiveTicketTypeId(): number {
    return Number(
      this.isApproved
        ? (this.ticket?.ticketTypeId ?? this.ticket?.ticket_type_id)
        : this.selectedTag,
    );
  }

  get canSubmit(): boolean {
    return (
      [1, 2, 3].includes(this.effectiveTicketTypeId) &&
      (this.effectiveTicketTypeId !== 2 ||
        ((this.problemSource === 'user' || this.problemSource === 'system') &&
          !this.categoriesLoading() &&
          !this.categoriesError() &&
          this.categories().some((category) => category.id === this.selectedCategory))) &&
      (this.effectiveTicketTypeId !== 3 ||
        (!this.servicesLoading() &&
          !this.servicesError() &&
          [...this.mainServices(), ...this.systemSubOptions()].some((item) => item.checked)))
    );
  }

  private restoreCategory(): void {
    if (this.effectiveTicketTypeId !== 2 || this.selectedCategory !== null) return;
    const id = Number(this.ticket?.sub_category_id ?? this.ticket?.subCategoryId);
    const name = this.ticket?.sub_category_name ?? this.ticket?.ticketCategory;
    this.selectedCategory =
      this.categories().find((category) =>
        id ? category.id === id : category.sub_category_name === name,
      )?.id ?? null;
  }

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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ticket'] && this.ticket) {
      this.selectedTag = Number(this.ticket.ticketTypeId ?? this.ticket.ticket_type_id) || null;
      this.selectedCategory = null;
      const problemSource = String(this.ticket.problemBy ?? '')
        .trim()
        .toLowerCase();
      this.problemSource =
        this.effectiveTicketTypeId === 2 && (problemSource === 'user' || problemSource === 'system')
          ? problemSource
          : null;
      this.restoreCategory();
      this.message = '';
    }
  }

  close(): void {
    this.closeModal.emit();
  }

  save(): void {
    if (!this.canSubmit) return;

    const ticketTypeId = this.isApproved
      ? Number(this.ticket?.ticketTypeId ?? this.ticket?.ticket_type_id)
      : Number(this.selectedTag);

    // console.log('Ticket Details:', {
    //   ticketTypeId,
    //   problemSource: ticketTypeId === 2 ? this.problemSource : null,
    //   subCategoryId: ticketTypeId === 2 ? this.selectedCategory : null,
    //   message: this.message,
    //   attachments: [],
    //   repairCostType: ticketTypeId === 1 ? 'free' : undefined,
    // });

    this.submitModal.emit({
      ticketTypeId,
      problemSource: ticketTypeId === 2 ? this.problemSource : null,
      subCategoryId: ticketTypeId === 2 ? this.selectedCategory : null,
      serviceTypeIds: ticketTypeId === 3 ? this.selectedServiceTypeIds : [],
      message: this.message,
      attachments: [],
      repairCostType: ticketTypeId === 1 ? 'free' : undefined,
    });
  }

  onTagChange(_value: number): void {
    this.message = '';
  }
}
