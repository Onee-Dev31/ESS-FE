import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import dayjs from 'dayjs';
import { FormsModule } from '@angular/forms';
import { ModalShellComponent } from '../../../../components/shared/modal-shell/modal-shell';
import { IT_ATTACHMENT_FILE_CONFIG } from '../../../../constants/it-attachment-file.constant';
import { SwalService } from '../../../../services/swal.service';
import { ItServiceService } from '../../../../services/it-service.service';
import { AuthService } from '../../../../services/auth.service';
import {
  FilePreviewItem,
  FilePreviewModalComponent,
} from '../../../../components/modals/file-preview-modal/file-preview-modal';

@Component({
  selector: 'app-change-ticket-type-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalShellComponent, FilePreviewModalComponent],
  templateUrl: './change-ticket-type-modal.html',
  styleUrl: './change-ticket-type-modal.scss',
})
export class ChangeTicketTypeModal implements OnChanges, OnDestroy {
  @Input() ticket: any;
  @Input() problemDetailsOnly = false;
  @Input() saving = false;
  @Output() closeModal = new EventEmitter<void>();
  @Output() submitModal = new EventEmitter<{
    ticketTypeId: number;
    subCategoryId: number | null;
    problemSource: 'user' | 'system' | null;
    serviceTypeIds: number[];
    subCategoryName?: string;
    repairCostType?: 'paid' | 'free';
    reason: string;
    attachments: { name: string; size: number; file: File }[];
  }>();

  private readonly swalService = inject(SwalService);
  private readonly itService = inject(ItServiceService);
  private readonly authService = inject(AuthService);
  readonly categories = signal<{ id: number; sub_category_name: string; display_order?: number }[]>(
    [],
  );
  readonly categoriesLoading = signal(false);
  readonly categoriesError = signal(false);
  readonly mainServices = signal<any[]>([]);
  readonly userSubOptions = signal<any[]>([]);
  readonly systemSubOptions = signal<any[]>([]);
  readonly servicesLoading = signal(false);
  readonly servicesError = signal(false);
  selectedCategory: number | null = null;
  problemSource: 'user' | 'system' | null = null;
  readonly fileConfig = IT_ATTACHMENT_FILE_CONFIG;

  get ticketTypes(): { id: number; label: string }[] {
    const types = [
      { id: 2, label: 'แจ้งปัญหา' },
      // ตอน DEPLOY PROD ยังไม่ให้มีแจ้งซ่อม และ ขอใช้บริการ
      // { id: 1, label: 'แจ้งซ่อม' },
    ];

    if (this.canAccessAdditionalTicketTypes) {
      types.push({ id: 3, label: 'ขอใช้บริการ' });
    }

    return types;
  }

  private get canAccessAdditionalTicketTypes(): boolean {
    const employeeCode = String(this.authService.userData()?.CODEMPID ?? '')
      .trim()
      .toUpperCase();
    return (
      employeeCode === 'OTD01125' || employeeCode === 'OTD01128' || employeeCode === 'OTD01050'
    );
  }

  get isViaEmail(): boolean {
    return this.ticket?.viaEmail === true;
  }

  get isTypeChangeLocked(): boolean {
    const isApproved =
      String(this.ticket?.approval_status ?? this.ticket?.approvalStatus ?? '')
        .trim()
        .toLowerCase() === 'approved';
    const ticketTypeId = Number(this.ticket?.ticketTypeId ?? this.ticket?.ticket_type_id);
    const isApprovedServiceRequest = ticketTypeId === 3;
    const isApprovedPaidRepair =
      ticketTypeId === 1 &&
      String(this.ticket?.repair_cost_type ?? this.ticket?.repairCostType ?? '')
        .trim()
        .toLowerCase() === 'paid';

    return isApproved && (isApprovedServiceRequest || isApprovedPaidRepair);
  }

  get availableTicketTypes(): typeof this.ticketTypes {
    if (this.canAccessAdditionalTicketTypes) return this.ticketTypes;
    return this.isViaEmail ? this.ticketTypes : this.ticketTypes.filter((type) => type.id !== 3);
  }

  selectedTypeId = 2;
  originalTypeId = 2;
  repairCostType: 'paid' | 'free' | null = null;
  originalRepairCostType: 'paid' | 'free' | null = null;
  private lastRepairCostType: 'paid' | 'free' | null = null;
  reason = '';
  attachments: { name: string; size: number; file: File }[] = [];
  showAttachmentError = false;
  showReasonError = false;
  isPreviewModalOpen = signal(false);
  previewFiles = signal<FilePreviewItem[]>([]);

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['ticket']) return;

    this.closePreview();
    this.selectedTypeId = Number(this.ticket?.ticketTypeId ?? this.ticket?.ticket_type_id ?? 2);
    this.originalTypeId = this.selectedTypeId;
    this.selectedCategory = null;
    const problemSource = String(this.ticket?.problemBy ?? '')
      .trim()
      .toLowerCase();
    this.problemSource =
      this.selectedTypeId === 2 && (problemSource === 'user' || problemSource === 'system')
        ? problemSource
        : null;
    this.restoreCategory();
    this.repairCostType =
      this.selectedTypeId === 1 && ['paid', 'free'].includes(this.ticket?.repair_cost_type)
        ? this.ticket.repair_cost_type
        : null;
    this.originalRepairCostType = this.repairCostType;
    this.lastRepairCostType = this.repairCostType;
    this.reason = '';
    this.attachments = [];
    this.showAttachmentError = false;
    this.showReasonError = false;
  }

  ngOnInit(): void {
    this.loadCategories();
    this.loadServiceTypes();
  }

  loadServiceTypes(): void {
    this.servicesLoading.set(true);
    this.servicesError.set(false);
    this.itService.getServiceType().subscribe({
      next: (res) => {
        console.log(res);
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
    if (this.isTypeChangeLocked) return;
    this.mainServices.update((items) =>
      items.map((item) => (Number(item.id) === id ? { ...item, checked: !item.checked } : item)),
    );
    this.userSubOptions.update((items) =>
      items.map((item) => ({ ...item, checked: this.isRequestUserSelected })),
    );
  }

  get isRequestUserSelected(): boolean {
    return this.mainServices().some((service) => Number(service.id) === 22 && service.checked);
  }

  toggleSubService(group: 'basic' | 'specific', id: number): void {
    if (this.isTypeChangeLocked) return;
    const target = group === 'basic' ? this.userSubOptions : this.systemSubOptions;
    target.update((items) =>
      items.map((item) => (Number(item.id) === id ? { ...item, checked: !item.checked } : item)),
    );
  }

  private get selectedServiceTypeIds(): number[] {
    return [...this.mainServices(), ...this.userSubOptions(), ...this.systemSubOptions()]
      .filter((item) => item.checked)
      .map((item) => Number(item.id));
  }

  get hasServiceDetailsChanged(): boolean {
    if (this.selectedTypeId !== 3) return false;
    const originalIds = (this.ticket?.services ?? [])
      .map((service: any) => Number(service.service_type_id ?? service.serviceTypeId ?? service.id))
      .filter(Number.isFinite)
      .sort((a: number, b: number) => a - b);
    const selectedIds = [...this.selectedServiceTypeIds].sort((a, b) => a - b);
    return (
      originalIds.length !== selectedIds.length ||
      originalIds.some((id: number, index: number) => id !== selectedIds[index])
    );
  }

  loadCategories(): void {
    this.categoriesLoading.set(true);
    this.categoriesError.set(false);
    this.itService.getSubProblem().subscribe({
      next: (res) => {
        this.categories.set(
          [...(res.data ?? [])]
            .map((category) => ({ ...category, id: Number(category.id) }))
            .sort((a, b) => Number(a.display_order ?? 0) - Number(b.display_order ?? 0)),
        );
        this.restoreCategory();
        this.categoriesLoading.set(false);
      },
      error: () => {
        this.categoriesLoading.set(false);
        this.categoriesError.set(true);
      },
    });
  }

  private restoreCategory(): void {
    if (this.selectedTypeId !== 2 || this.selectedCategory !== null) return;
    const id = Number(this.ticket?.subCategoryId ?? this.ticket?.sub_category_id);
    const name = this.ticket?.ticketCategory ?? this.ticket?.sub_category_name;
    this.selectedCategory =
      this.categories().find((category) =>
        id ? category.id === id : category.sub_category_name === name,
      )?.id ?? null;
  }

  selectType(ticketTypeId: number): void {
    // console.log(ticketTypeId);
    if (this.isTypeChangeLocked) return;
    // if (this.isTypeChangeLocked || (ticketTypeId === 3 && !this.isViaEmail)) return;
    if (this.selectedTypeId === 1) {
      this.lastRepairCostType = this.repairCostType;
    }
    this.selectedTypeId = ticketTypeId;
    this.showReasonError = false;
    if (ticketTypeId !== 1) {
      this.repairCostType = null;
      this.attachments = [];
      this.showAttachmentError = false;
    } else {
      this.repairCostType = this.lastRepairCostType;
    }
  }

  selectRepairCostType(value: 'paid' | 'free'): void {
    if (this.isTypeChangeLocked) return;
    this.repairCostType = value;
    this.showAttachmentError = false;
    this.showReasonError = false;
    if (value !== 'paid') this.attachments = [];
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;

    const validFiles: { name: string; size: number; file: File }[] = [];
    const errors: string[] = [];
    let hasFileLimitError = false;

    for (const file of files) {
      if (this.attachments.length + validFiles.length >= this.fileConfig.maxFiles) {
        hasFileLimitError = true;
        continue;
      }
      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (file.size > this.fileConfig.maxSizeMB * 1024 * 1024) {
        errors.push(`${file.name}: ขนาดไฟล์เกิน ${this.fileConfig.maxSizeMB} MB`);
      } else if (
        !this.fileConfig.allowedTypes.includes(file.type) &&
        !this.fileConfig.allowedExtensions.includes(extension)
      ) {
        errors.push(`${file.name}: ประเภทไฟล์ไม่รองรับ`);
      } else {
        validFiles.push({ name: file.name, size: file.size, file });
      }
    }

    this.attachments = [...this.attachments, ...validFiles];
    if (this.attachments.length) this.showAttachmentError = false;
    if (hasFileLimitError) errors.unshift(`อัปโหลดได้สูงสุด ${this.fileConfig.maxFiles} ไฟล์`);
    if (errors.length) this.swalService.warning(errors.join('\n'));
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (!files?.length) return;

    const input = { files, value: '' } as unknown as HTMLInputElement;
    this.onFileSelected({ target: input } as unknown as Event);
  }

  removeAttachment(index: number): void {
    this.attachments = this.attachments.filter((_, fileIndex) => fileIndex !== index);
  }

  previewAttachment(file: { name: string; size: number; file: File }): void {
    this.closePreview();
    this.previewFiles.set([
      {
        fileName: file.name,
        date: dayjs().format('DD/MM/YYYY HH:mm'),
        url: URL.createObjectURL(file.file),
        type: file.file.type,
      },
    ]);
    this.isPreviewModalOpen.set(true);
  }

  closePreview(): void {
    this.isPreviewModalOpen.set(false);
    for (const file of this.previewFiles()) {
      if (file.url) URL.revokeObjectURL(file.url);
    }
    this.previewFiles.set([]);
  }

  ngOnDestroy(): void {
    this.closePreview();
  }

  get hasTypeChanged(): boolean {
    return this.selectedTypeId !== this.originalTypeId;
  }

  get hasRepairCostChanged(): boolean {
    return this.selectedTypeId === 1 && this.repairCostType !== this.originalRepairCostType;
  }

  get hasProblemDetailsChanged(): boolean {
    if (this.selectedTypeId !== 2) return false;
    const originalId = Number(this.ticket?.subCategoryId ?? this.ticket?.sub_category_id);
    const originalName = this.ticket?.ticketCategory ?? this.ticket?.sub_category_name;
    const originalCategory =
      this.categories().find((category) =>
        originalId ? category.id === originalId : category.sub_category_name === originalName,
      )?.id ?? null;
    const source = String(this.ticket?.problemBy ?? '')
      .trim()
      .toLowerCase();
    const originalSource = source === 'user' || source === 'system' ? source : null;
    return this.selectedCategory !== originalCategory || this.problemSource !== originalSource;
  }

  get canSubmit(): boolean {
    if (this.saving) return false;
    if (this.isTypeChangeLocked) return false;
    // if (this.isTypeChangeLocked || (this.selectedTypeId === 3 && !this.isViaEmail)) return false;
    if (
      !this.hasTypeChanged &&
      !this.hasRepairCostChanged &&
      !this.hasProblemDetailsChanged &&
      !this.hasServiceDetailsChanged
    )
      return false;
    if (
      this.selectedTypeId === 2 &&
      (this.categoriesLoading() ||
        this.categoriesError() ||
        !this.categories().some((category) => category.id === this.selectedCategory) ||
        (this.problemSource !== 'user' && this.problemSource !== 'system'))
    )
      return false;
    if (
      this.selectedTypeId === 3 &&
      (this.servicesLoading() ||
        this.servicesError() ||
        ![...this.mainServices(), ...this.systemSubOptions()].some((item) => item.checked))
    )
      return false;

    return this.selectedTypeId !== 1 || this.repairCostType !== null;
  }

  save(): void {
    if (!this.canSubmit) return;
    if (
      (this.hasTypeChanged || this.hasRepairCostChanged) &&
      this.repairCostType === 'paid' &&
      this.attachments.length === 0
    ) {
      this.showAttachmentError = true;
      return;
    }
    if (
      (this.hasTypeChanged || this.hasRepairCostChanged) &&
      this.repairCostType === 'paid' &&
      !this.reason.trim()
    ) {
      this.showReasonError = true;
      return;
    }

    this.submitModal.emit({
      ticketTypeId: this.selectedTypeId,
      subCategoryId: this.selectedTypeId === 2 ? this.selectedCategory : null,
      problemSource: this.selectedTypeId === 2 ? this.problemSource : null,
      serviceTypeIds: this.selectedTypeId === 3 ? this.selectedServiceTypeIds : [],
      subCategoryName: this.categories().find((category) => category.id === this.selectedCategory)
        ?.sub_category_name,
      ...(this.selectedTypeId === 1 && { repairCostType: this.repairCostType! }),
      reason: this.reason.trim(),
      attachments: this.attachments,
    });
  }
}
