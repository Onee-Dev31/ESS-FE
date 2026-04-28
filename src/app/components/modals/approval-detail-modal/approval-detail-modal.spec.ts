import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { ApprovalDetailModalComponent } from './approval-detail-modal';
import { ApprovalsHelperService } from '../../../services/approvals-helper.service';
import { ApprovalService } from '../../../services/approval.service';
import { AllowanceApiService } from '../../../services/allowance-api.service';
import { AuthService } from '../../../services/auth.service';
import { SwalService } from '../../../services/swal.service';
import { FileConverterService } from '../../../services/file-converter';
import { DateUtilityService } from '../../../services/date-utility.service';

describe('ApprovalDetailModalComponent', () => {
  let component: ApprovalDetailModalComponent;
  let fixture: ComponentFixture<ApprovalDetailModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApprovalDetailModalComponent],
      providers: [
        provideNoopAnimations(),
        {
          provide: ApprovalsHelperService,
          useValue: {
            getServiceByType: () => ({
              getRequestById: () => of(null),
            }),
          },
        },
        {
          provide: ApprovalService,
          useValue: {
            updateTypeClaims: () => of({ success: true }),
          },
        },
        {
          provide: AllowanceApiService,
          useValue: {
            reviewClaim: () => of({ success: true }),
          },
        },
        {
          provide: AuthService,
          useValue: {
            userData: () => ({ CODEMPID: 'EMP001', AD_USER: 'ad.user' }),
            currentUser: () => 'ad.user',
          },
        },
        {
          provide: SwalService,
          useValue: {
            success: () => undefined,
            warning: () => undefined,
          },
        },
        {
          provide: FileConverterService,
          useValue: {
            buildPreviewFile: (file: unknown) => file,
            buildPreviewFiles: (files: unknown[]) => files,
          },
        },
        {
          provide: DateUtilityService,
          useValue: {
            formatDateToBE: (value: string) => value,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ApprovalDetailModalComponent);
    component = fixture.componentInstance;

    component.approvalItem = {
      requestNo: 'REQ-001',
      requestDate: '2024-01-01',
      requestBy: {
        name: 'Test User',
        employeeId: 'EMP001',
        department: 'Test Dept',
        company: 'Test Co',
      },
      requestType: 'ค่ารักษาพยาบาล' as any,
      requestDetail: 'Test detail',
      amount: 1000,
      status: 'Pending',
      rawStatus: 'Waiting Check',
    } as any;

    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
