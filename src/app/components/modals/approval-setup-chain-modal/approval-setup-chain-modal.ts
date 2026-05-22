import { Component, inject, output, signal } from '@angular/core';
import { Observable, finalize } from 'rxjs';
import { ToastService } from '../../../services/toast';
import { LoadingService } from '../../../services/loading';
import { ErrorService } from '../../../services/error';
import { ApprovalCategory } from '../../../interfaces/approval-setup.interface';
import { fadeIn, modalAnimation } from '../../../animations/animations';
import { SwalService } from '../../../services/swal.service';
import { ApprovalSetupService } from '../../../services/approval-setup.service';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-approval-setup-chain-modal',
  imports: [CommonModule],
  animations: [modalAnimation, fadeIn],
  templateUrl: './approval-setup-chain-modal.html',
  styleUrl: './approval-setup-chain-modal.scss',
})
export class ApprovalSetupChainModal {
  onClose = output<void>();
  onSaved = output<void>();

  isVisible: boolean = true;

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
    this.fetchCategories(this.approvalService.getApprovalSetupChainCurrent());
  }

  reset() {
    this.fetchCategories(this.approvalService.getApprovalSetupChain());
  }

  private fetchCategories(source$: Observable<any>) {
    this.loadingService.start('setup-modal');
    source$.subscribe({
      next: (res) => {
        const mapped = (res?.data ?? []).map((emp: any) => this.mapCategory(emp));
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

  save() {
    this.isSaving.set(true);
    const payload = this.categories().map((cat) => ({
      categoryId: cat.categoryId,
      skipApprover1: cat.skipApprover1,
      skipApprover2: cat.skipApprover2,
      skipApprover3: cat.skipApprover3,
      skipApprover4: cat.skipApprover4,
    }));

    this.approvalService.saveApprovalCategories(payload).pipe(
      finalize(() => this.isSaving.set(false)),
    ).subscribe({
      next: () => {
        this.toastService.success('บันทึกการตั้งค่าสำเร็จ');
        this.onSaved.emit();
        this.onClose.emit();
      },
      error: (err) => {
        this.errorService.handle(err, { component: 'ApprovalSetupModal', action: 'save' });
      },
    });
  }

  close() {
    this.onClose.emit();
  }
}
