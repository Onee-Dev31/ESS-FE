import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { SwalService } from '../../services/swal.service';
import { UserService, UserProfile } from '../../services/user.service';
import { PhoneUtil } from '../../utils/phone.util';

@Component({
    selector: 'app-it-service-request',
    standalone: true,
    imports: [CommonModule, FormsModule, PageHeaderComponent],
    templateUrl: './it-service-request.html',
    styleUrl: './it-service-request.scss'
})
export class ITServiceRequestComponent implements OnInit {

    // Inject Services
    private swalService = inject(SwalService);
    private userService = inject(UserService);

    serviceOptions = signal([
        { label: 'บริการ Internet', value: 'internet', checked: false, disabled: false, icon: 'fa-wifi' },
        { label: 'บริการ Email', value: 'email', checked: false, disabled: false, icon: 'fa-envelope' },
        { label: 'File Sharing', value: 'fileshare', checked: false, disabled: false, icon: 'fa-share-alt' },
        { label: 'ขอแก้ไขสิทธิ', value: 'access_edit', checked: false, disabled: false, icon: 'fa-user-lock' },
        { label: 'ขอ Unlock User', value: 'unlock_user', checked: false, disabled: false, icon: 'fa-unlock-alt' },
        { label: 'ขอใช้ระบบ', value: 'request_system', checked: false, disabled: false, icon: 'fa-desktop' },
        { label: 'บริการอื่นๆ', value: 'other', checked: false, disabled: false, icon: 'fa-ellipsis-h' }
    ]);

    isSystemCategorySelected = signal(false);

    userSubOptions = signal([
        { label: 'ห้องประชุม', value: 'meeting_room', checked: false, icon: 'fa-handshake' },
        { label: 'ห้องนวด', value: 'massage_room', checked: false, icon: 'fa-spa' }
    ]);

    systemSubOptions = signal([
        { label: 'Oracle', value: 'oracle', checked: false, icon: 'fa-database' },
        { label: 'BMS', value: 'bms', checked: false, icon: 'fa-server' },
        { label: 'ONEE', value: 'onee', checked: false, icon: 'fa-globe' },
        { label: 'ONENEWS', value: 'onenews', checked: false, icon: 'fa-newspaper' },
        { label: 'ONE', value: 'one', checked: false, icon: 'fa-tv' },
        { label: 'CLF', value: 'clf', checked: false, icon: 'fa-film' },
        { label: 'AGM', value: 'agm', checked: false, icon: 'fa-users' }
    ]);

    // Open For State
    openForOptions = signal([
        { label: 'อื่นๆ (Other)', value: 'other' },
        { label: 'ตนเอง (Self)', value: 'self' },
        { label: 'พนักงาน ก (Employee A)', value: 'employee_a' },
        { label: 'พนักงาน ข (Employee B)', value: 'employee_b' },
    ]);
    selectedOpenFor = signal<string>('self');
    otherOpenForName = signal<string>('');

    requestDetails = signal('');
    phoneNumber = signal('');

    isFormValid = computed(() => {
        const services = this.serviceOptions();
        const hasService = services.some(s => s.checked);
        const openFor = this.selectedOpenFor();
        const otherNameValid = openFor !== 'other' || this.otherOpenForName().trim().length > 0;

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

        return hasService && otherNameValid && subValidationPassed;
    });

    ngOnInit() {
        this.userService.getUserProfile().subscribe((profile: UserProfile) => {
            if (profile?.phone) {
                const formatted = PhoneUtil.formatPhoneNumber(profile.phone);
                this.phoneNumber.set(formatted);
            }
        });
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





    get nextRequestId() {
        const nextId = this.submittedRequests().length + 1;
        return `#REQ2602-${String(nextId).padStart(4, '0')}`;
    }

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

        if (this.selectedOpenFor() === 'other' && !this.otherOpenForName().trim()) {
            this.swalService.warning('แจ้งเตือน', 'กรุณาระบุชื่อผู้ขอสิทธิ์ (Other)');
            return;
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
        this.otherOpenForName.set('');
        this.requestDetails.set('');
        this.selectedSystemTypes.set([]);

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



    submittedRequests = signal<any[]>([
        {
            id: 3,
            displayId: '#REQ2602-0003',
            date: new Date('2026-02-19T10:45:00'),
            services: ['แจ้งปัญหา'],
            problemData: {
                topic: 'ระบบ ONEE เข้าใช้งานไม่ได้',
                detail: 'ล็อกอินแล้วขึ้น Error 500 ตลอดเวลา'
            },
            openFor: 'พนักงาน ข (Employee B)',
            phoneNumber: '089-999-8888',
            status: 'Pending',
            systemData: { selectedTypes: [], userOptions: [], systemOptions: [] }
        },
        {
            id: 2,
            displayId: '#REQ2602-0002',
            date: new Date('2026-02-19T08:15:00'),
            services: ['แจ้งซ่อม'],
            repairData: {
                device: 'Printer',
                brand: 'Brother',
                model: 'HL-L2370DN',
                symptom: 'กระดาษติดบ่อย และหมึกจาง'
            },
            openFor: 'พนักงาน ก (Employee A)',
            status: 'Pending',
            systemData: { selectedTypes: [], userOptions: [], systemOptions: [] }
        },
        {
            id: 1,
            displayId: '#REQ2602-0001',
            date: new Date('2026-02-18T09:30:00'),
            services: ['บริการ Internet', 'บริการ Email'],
            details: 'ความเร็ว Internet ช้าลง และเปิด App Email ไม่ขึ้น',
            openFor: 'ตนเอง (Self)',
            status: 'Approved',
            systemData: { selectedTypes: [], userOptions: [], systemOptions: [] },
            emailAccount: {
                email: 'employee.test@onemail.com',
                password: 'InitialPassword123!'
            }
        }
    ]);

    confirmSubmission() {
        const selectedServices = this.serviceOptions().filter(s => s.checked);

        let openForDisplay = '';
        const selected = this.openForOptions().find(o => o.value === this.selectedOpenFor());
        if (this.selectedOpenFor() === 'other') {
            openForDisplay = `อื่นๆ: ${this.otherOpenForName()}`;
        } else {
            openForDisplay = selected ? selected.label : '';
        }

        const systemData = {
            selectedTypes: [...this.selectedSystemTypes()],
            userOptions: this.userSubOptions().filter(o => o.checked).map(o => o.label),
            systemOptions: this.systemSubOptions().filter(o => o.checked).map(o => o.label)
        };

        const newRequest = {
            id: Date.now(),
            displayId: this.nextRequestId,
            date: new Date(),
            services: selectedServices.map(s => s.label),
            details: this.requestDetails(),
            repairData: null,
            problemData: null,
            systemData: systemData,
            openFor: openForDisplay,
            phoneNumber: this.phoneNumber(),
            status: 'Pending'
        };

        this.submittedRequests.update(reqs => [newRequest, ...reqs]);

        this.swalService.success('สำเร็จ', 'ส่งคำขอเรียบร้อยแล้ว');
        this.showSummaryModal.set(false);

        this.serviceOptions.update(items => items.map(i => ({ ...i, checked: false })));
        this.isSystemCategorySelected.set(false);
        this.userSubOptions.update(items => items.map(i => ({ ...i, checked: false })));
        this.systemSubOptions.update(items => items.map(i => ({ ...i, checked: false })));
        this.phoneNumber.set('');
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
}
