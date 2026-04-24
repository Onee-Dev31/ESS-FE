import { Component, inject, output, signal } from '@angular/core';
import { ToastService } from '../../../services/toast';
import { LoadingService } from '../../../services/loading';
import { ErrorService } from '../../../services/error';
import { ApprovalCategory } from '../../../interfaces/approval-setup.interface';
import { fadeIn, modalAnimation } from '../../../animations/animations';
import { SwalService } from '../../../services/swal.service';
import { ApprovalSetupService } from '../../../services/approval-setup.service';
import { AuthService } from '../../../services/auth.service';

// TODO: เปลี่ยนเป็น API จริง
const MOCK_CATEGORIES: any[] = [
  {
    CategoryID: 1,
    CategoryCode: 'IT_REQUEST',
    CategoryName: 'IT Request',
    SkipApprover1: true,
    SkipApprover2: false,
    SkipApprover3: true,
    SkipApprover4: false,
    ActiveFlag: true,
  },
  {
    CategoryID: 2,
    CategoryCode: 'WELFARE',
    CategoryName: 'สวัสดิการ',
    SkipApprover1: true,
    SkipApprover2: false,
    SkipApprover3: false,
    SkipApprover4: true,
    ActiveFlag: true,
  },
];

@Component({
  selector: 'app-approval-setup-chain-modal',
  imports: [],
  animations: [modalAnimation, fadeIn],
  templateUrl: './approval-setup-chain-modal.html',
  styleUrl: './approval-setup-chain-modal.scss',
})
export class ApprovalSetupChainModal {
  onClose = output<void>();
  onSaved = output<void>();

  private approvalService = inject(ApprovalSetupService);
  private swalService = inject(SwalService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private loadingService = inject(LoadingService);
  private errorService = inject(ErrorService);

  isLoading = this.loadingService.loading('setup-modal');
  isSaving = signal<boolean>(false);

  categories = signal<ApprovalCategory[]>([]);

  readonly approverSteps = [
    { key: 'skipApprover1' as const, label: 'Approver 1' },
    { key: 'skipApprover2' as const, label: 'Approver 2' },
    { key: 'skipApprover3' as const, label: 'Approver 3' },
    { key: 'skipApprover4' as const, label: 'Approver 4' },
  ];

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.loadingService.start('setup-modal');

    this.approvalService.getApprovalSetupChain().subscribe({
      next: (res) => {
        const mapped = (res?.data ?? []).map((emp: any) => this.mapCategory(emp));

        // const mapped = res?.data ?? [];
        this.categories.set(mapped);
        this.loadingService.stop('setup-modal');
      },
      error: (err) => {
        console.error(err);
        this.loadingService.stop('setup-modal');
      },
    });
  }

  private mapCategory(raw: any): ApprovalCategory {
    return {
      categoryId: raw.CategoryID,
      categoryCode: raw.CategoryCode,
      categoryName: raw.CategoryName,
      skipApprover1: raw.SkipApprover1,
      skipApprover2: raw.SkipApprover2,
      skipApprover3: raw.SkipApprover3,
      skipApprover4: raw.SkipApprover4,
      activeFlag: raw.ActiveFlag,
    };
  }

  toggle(
    categoryId: number,
    step: keyof Pick<
      ApprovalCategory,
      'skipApprover1' | 'skipApprover2' | 'skipApprover3' | 'skipApprover4'
    >,
  ) {
    this.categories.update((list) =>
      list.map((cat) => (cat.categoryId === categoryId ? { ...cat, [step]: !cat[step] } : cat)),
    );
  }

  async save() {
    this.isSaving.set(true);
    try {
      // TODO: เปลี่ยนเป็น API call จริง
      await new Promise((resolve) => setTimeout(resolve, 800));
      this.toastService.success('บันทึก mock การตั้งค่าสำเร็จ');
      this.onSaved.emit();
      this.onClose.emit();
    } catch (error) {
      this.errorService.handle(error, { component: 'ApprovalSetupModal', action: 'save' });
    } finally {
      this.isSaving.set(false);
    }
  }

  close() {
    this.onClose.emit();
  }
}
