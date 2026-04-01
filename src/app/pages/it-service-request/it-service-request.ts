import { Component, signal, inject, OnInit, computed, ChangeDetectorRef, Input, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { SwalService } from '../../services/swal.service';
import { UserService, UserProfile } from '../../services/user.service';
import { PhoneUtil } from '../../utils/phone.util';
import { ItServiceService } from '../../services/it-service.service';
import { AuthService } from '../../services/auth.service';
import { finalize } from 'rxjs';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { decryptValue } from '../../utils/crypto.js ';

@Component({
    selector: 'app-it-service-request',
    standalone: true,
    imports: [CommonModule, FormsModule, PageHeaderComponent, NzSelectModule],
    templateUrl: './it-service-request.html',
    styleUrl: './it-service-request.scss'
})
export class ITServiceRequestComponent implements OnInit {

    // Inject Services
    private swalService = inject(SwalService);
    private userService = inject(UserService);
    private itServiceService = inject(ItServiceService);
    private route = inject(ActivatedRoute);
    private authService = inject(AuthService);
    private cdr = inject(ChangeDetectorRef);
    private router = inject(Router);
    private destroyRef = inject(DestroyRef);

    phoneModel = '';
    phoneNumber = signal('');
    requestDetails = signal('');

    // CONDITION
    @Input() openBy!: string;

    // MASTER
    serviceOptions = signal<any[]>([])
    userSubOptions = signal<any[]>([])
    systemSubOptions = signal<any[]>([])
    openForOptions = signal<any[]>([])
    selectedOpenFor = signal<string>(this.authService.userData().CODEMPID);

    isSystemCategorySelected = signal(false);
    IsOneeJob: boolean = false;
    applicantId: string = '';
    detailJobs: any = null;
    isFormValid = computed(() => {
        const services = this.serviceOptions();
        const hasService = services.some(s => s.checked);
        // const otherNameValid = openFor !== 'other' || this.otherOpenForName().trim().length > 0;

        // Sub-validation for "Request System" (ขอใช้ระบบ)
        const isRequestSystemChecked = services.find(s => s.value === 'request_system')?.checked;
        let subValidationPassed = true;

        if (isRequestSystemChecked) {
            const types = this.selectedSystemTypes();
            const hasType = types.length > 0;

            const hasUserType = types.includes('user');
            const hasSystemType = types.includes('system');

            const userSubSelected = this.userSubOptions().some(o => o.checked);
            const systemSubSelected = this.systemSubOptions().some(o => o.checked);

            // Must have at least one type selected, and if a type is selected, must have sub-options
            subValidationPassed = hasType &&
                (!hasUserType || userSubSelected) &&
                (!hasSystemType || systemSubSelected);
        }

        const detailValid = this.requestDetails().trim().length > 0;
        const phoneValid = this.phoneNumber().trim().length > 0;
        const openForValid = this.selectedOpenFor() !== null;
        return hasService && openForValid && subValidationPassed && detailValid && phoneValid;
    });

    ngOnInit() {
        this.getServiceType();
        this.getOpenFor();
        const userData = this.authService.userData();
        if (userData?.USR_MOBILE) {
            const formatted = PhoneUtil.formatPhoneNumber(userData.USR_MOBILE);
            this.phoneModel = formatted;
            this.phoneNumber.set(formatted);
        }
        
        const hasQueryParams = Object.keys(this.route.snapshot.queryParams).length > 0;

        if (!hasQueryParams) {
            return; // ❌ ไม่มี param → ไม่ต้องทำอะไรต่อ
        }
        const reloaded = sessionStorage.getItem('itServiceRequest-page-reloaded');

        if (!reloaded) {
            sessionStorage.setItem('itServiceRequest-page-reloaded', '1');
            window.location.reload();
            return;
        }

        sessionStorage.removeItem('itServiceRequest-page-reloaded');

        this.IsOneeJob = (localStorage.getItem('systemCode') || '') === 'ONEEJOB';

        this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
            this.applicantId = decryptValue(params['applicantId']) || '';
            this.getDetailFromJobsByApplicantId(this.applicantId)
            if (!this.applicantId) return;
        });
    }

    onPhoneInput(event: Event) {
        const input = event.target as HTMLInputElement;
        let digitsOnly = input.value.replace(/\D/g, '');
        digitsOnly = digitsOnly.slice(0, 10);
        const formatted = PhoneUtil.formatPhoneNumber(digitsOnly);
        input.value = formatted;
        this.phoneModel = formatted;
        this.phoneNumber.set(formatted);
    }

    onPhoneNumberChange(value: string) {
        const formatted = PhoneUtil.formatPhoneNumber(value);
        this.phoneNumber.set(formatted);
    }

    showRepairModal = signal(false);

    repairFormData = signal({
        device: '',
        brand: '',
        model: '',
        symptom: ''
    });

    problemFormData = signal({
        topic: '',
        detail: ''
    });

    activeModalMode = signal<'repair' | 'problem' | null>(null);

    selectedSystemTypes = signal<string[]>([]);

    toggleSystemType(type: string) {
        this.selectedSystemTypes.update(types => {

            if (types.includes(type)) {
                return types.filter(t => t !== type);
            } else {
                return [...types, type];
            }
        });
    }

    toggleService(index: number) {
        this.serviceOptions.update(items => {
            const newItems = [...items];

            if (!newItems[index].disabled) {
                newItems[index].checked = !newItems[index].checked;
            }

            return newItems;
        });

        const selectedValues = this.serviceOptions().filter(s => s.checked).map(s => s.value);
        this.isSystemCategorySelected.set(selectedValues.includes('request_system'));

        if (!selectedValues.includes('request_system')) {
            this.selectedSystemTypes.set([]);
            this.userSubOptions.update(items => items.map(i => ({ ...i, checked: false })));
            this.systemSubOptions.update(items => items.map(i => ({ ...i, checked: false })));
        }
    }

    toggleUserSubOption(index: number) {
        this.userSubOptions.update(items => {
            const newItems = [...items];
            newItems[index].checked = !newItems[index].checked;
            return newItems;
        });
    }

    toggleSystemSubOption(index: number) {
        this.systemSubOptions.update(items => {
            const newItems = [...items];
            newItems[index].checked = !newItems[index].checked;
            return newItems;
        });
    }

    showSummaryModal = signal(false);

    submit() {
        const selectedServices = this.serviceOptions().filter(s => s.checked);

        if (selectedServices.length === 0) {
            this.swalService.warning('แจ้งเตือน', 'กรุณาเลือกบริการอย่างน้อย 1 รายการ');
            return;
        }

        const isRequestSystem = selectedServices.some(s => s.value === 'request_system');
        if (isRequestSystem) {
            if (this.selectedSystemTypes().length === 0) {
                this.swalService.warning('แจ้งเตือน', 'กรุณาเลือกประเภทระบบ (Basic หรือ Specific)');
                return;
            }

            const hasUserType = this.selectedSystemTypes().includes('user');
            const hasSystemType = this.selectedSystemTypes().includes('system');

            const userSubSelected = this.userSubOptions().some(o => o.checked);
            const systemSubSelected = this.systemSubOptions().some(o => o.checked);

            if (hasUserType && !userSubSelected) {
                this.swalService.warning('แจ้งเตือน', 'กรุณาระบุระบบพื้นฐาน (Basic System) ที่ต้องการ');
                return;
            }

            if (hasSystemType && !systemSubSelected) {
                this.swalService.warning('แจ้งเตือน', 'กรุณาระบุระบบเฉพาะ (Specific System) ที่ต้องการ');
                return;
            }

        }

        if (!this.requestDetails().trim()) {
            this.swalService.warning('แจ้งเตือน', 'กรุณากรอกรายละเอียด (Details)');
            return;
        }

        this.showSummaryModal.set(true);
    }

    closeSummaryModal() {
        this.showSummaryModal.set(false);
    }

    clearForm() {
        this.serviceOptions.update(items => items.map(i => ({ ...i, checked: false })));
        this.isSystemCategorySelected.set(false);
        this.userSubOptions.update(items => items.map(i => ({ ...i, checked: false })));
        this.systemSubOptions.update(items => items.map(i => ({ ...i, checked: false })));
        this.selectedOpenFor.set('self');
        // this.otherOpenForName.set('');
        this.requestDetails.set('');
        this.selectedSystemTypes.set([]);

        this.phoneNumber.set('');

        const original = this.authService.userPhone();
        this.phoneModel = '';
        this.cdr.detectChanges();
        this.phoneModel = original;

        // Re-fetch phone number from profile
        this.userService.getUserProfile().subscribe((profile: UserProfile) => {
            if (profile?.phone) {
                const formatted = PhoneUtil.formatPhoneNumber(profile.phone);
                this.phoneNumber.set(formatted);
            } else {
                this.phoneNumber.set('');
            }
        });
    }

    confirmSubmission() {
        const selectedServices = this.serviceOptions().filter(s => s.checked);

        this.openForOptions().find(o => o.value === this.selectedOpenFor());

        const userOptions = this.userSubOptions().filter(o => o.checked)
        const systemOptions = this.systemSubOptions().filter(o => o.checked)

        const formData = new FormData();
        formData.append('ticketTypeId', '3');

        formData.append('openForCodeempid', this.selectedOpenFor());
        formData.append('description', this.IsOneeJob ? `[ONEE JOBS]\n ${this.requestDetails()}` : this.requestDetails());
        formData.append('requesterAduser', this.authService.currentUser() || '-');
        formData.append('contactPhone', this.phoneNumber());
        formData.append('IsSelfRequestByIT', this.openBy ? 'false' : this.authService.userData().DEPARTMENT === '10806 IT Department' ? 'true' : 'false'); //it เปิดให้ตัวเอง ?


        selectedServices.forEach(service => {
            formData.append('serviceTypeIds', service.id.toString());
        });

        userOptions.forEach(service => {
            formData.append('serviceTypeIds', service.id.toString());
        });

        systemOptions.forEach(service => {
            formData.append('serviceTypeIds', service.id.toString());
        });


        this.swalService.loading('กำลังบันทึกข้อมูล...');
        this.itServiceService.createTicket(formData)
            .pipe(
                finalize(() => {
                    this.closeSummaryModal();
                })
            ).subscribe({
                next: (res) => {
                    if (res.success) {
                        // this.signalrService.sendTestRealtime()
                        this.swalService.success('ส่งคำขอเรียบร้อยแล้ว', res.ticketNumber).then(() => {
                            this.clearForm();
                            this.router.navigate(['/it-service-list']);
                        });
                    }
                },
                error: (error) => {
                    console.error('Error fetching data:', error.error.message);
                    // const message = error?.error?.message || '';
                }
            });

    }

    closeRepairModal() {
        // If canceling, uncheck the service
        if (this.activeModalMode()) {
            this.serviceOptions.update(items => {
                const newItems = items.map(item => {
                    if (item.value === this.activeModalMode()) {
                        return { ...item, checked: false };
                    }
                    return item;
                });
                return this.applyServiceExclusion(newItems);
            });
        }
        this.showRepairModal.set(false);
        this.activeModalMode.set(null);
    }

    confirmModalData() {
        if (this.activeModalMode() === 'repair') {
            const { device, brand, model, symptom } = this.repairFormData();
            if (!device || !brand || !model || !symptom) {
                this.swalService.warning('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบทุกช่อง');
                return;
            }
        } else if (this.activeModalMode() === 'problem') {
            const { topic, detail } = this.problemFormData();
            if (!topic || !detail) {
                this.swalService.warning('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบทุกช่อง');
                return;
            }
        }

        this.serviceOptions.update(items => {
            const newItems = items.map(item => {
                if (item.value === this.activeModalMode()) {
                    return { ...item, checked: true };
                }
                return item;
            });
            return this.applyServiceExclusion(newItems);
        });

        this.showRepairModal.set(false);
        this.activeModalMode.set(null);
    }

    private applyServiceExclusion(items: any[]) {
        const repairSet = ['repair', 'problem'];
        const hasRepairActive = items.some(i => repairSet.includes(i.value) && i.checked);
        const hasServiceActive = items.some(i => !repairSet.includes(i.value) && i.checked);

        return items.map(item => {
            const isRepairType = repairSet.includes(item.value);
            if (hasRepairActive) {
                item.disabled = !isRepairType;
            } else if (hasServiceActive) {
                item.disabled = isRepairType;
            } else {
                item.disabled = false;
            }
            return item;
        });
    }
    showHistoryDetailModal = signal(false);
    selectedRequest = signal<any>(null);

    viewRequestDetails(request: any) {
        this.selectedRequest.set(request);
        this.showHistoryDetailModal.set(true);
    }

    closeHistoryDetailModal() {
        this.showHistoryDetailModal.set(false);
        this.selectedRequest.set(null);
    }


    // GET MASTER
    getServiceType() {
        this.itServiceService.getServiceType().subscribe({
            next: (res) => {
                const mappedServices_main = res.data.mainServices.map((item: any) => ({
                    ...item,
                    checked: false,
                    disabled: false
                }));

                this.serviceOptions.set(mappedServices_main);

                const mappedServices_user = res.data.userSubOptions.map((item: any) => ({
                    ...item,
                    checked: false
                }));

                this.userSubOptions.set(mappedServices_user);

                const mappedServices_system = res.data.systemSubOptions.map((item: any) => ({
                    ...item,
                    checked: false
                }));

                this.systemSubOptions.set(mappedServices_system);


                // this.availableCategories = res.data
                // this.cdr.detectChanges();
            },
            error: (error) => {
                console.error('Error fetching data:', error);
            }
        });
    }
    getOpenFor() {
        this.itServiceService.getOpenFor({ currentEmpId: this.authService.userData().CODEMPID }).subscribe({
            next: (res) => {
                this.openForOptions.set(res.data)
            },
            error: (error) => {
                console.error('Error fetching data:', error);
            }
        });
    }

    getDetailFromJobsByApplicantId(id: string) {
        this.itServiceService.getDetailFromJobsByApplicant(id).subscribe({
            next: (res) => {
                this.detailJobs = res
                const data = res[0];

                this.requestDetails.set(
                    `ชื่อ-นามสกุล: ${data.FirstNameThai} ${data.LastNameThai}\n` +
                    `Email: ${data.Email}\n` +
                    `ตำแหน่ง: ${data.JobTitle}\n` +
                    `บริษัท: ${data.Location}`
                );
            },
            error: (error) => {
                console.error('Error fetching data:', error);
            }
        });
    }
}
