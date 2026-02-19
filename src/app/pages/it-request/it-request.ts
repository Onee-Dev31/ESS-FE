import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { SwalService } from '../../services/swal.service';

@Component({
    selector: 'app-it-request',
    standalone: true,
    imports: [CommonModule, FormsModule, PageHeaderComponent],
    templateUrl: './it-request.html',
    styleUrl: './it-request.scss'
})
export class ITRequestComponent {

    // Inject SwalService
    private swalService = inject(SwalService);

    serviceOptions = signal([
        { label: 'บริการ Internet', value: 'internet', checked: false, disabled: false, icon: 'fa-wifi' },
        { label: 'บริการ Email', value: 'email', checked: false, disabled: false, icon: 'fa-envelope' },
        { label: 'File Sharing', value: 'fileshare', checked: false, disabled: false, icon: 'fa-share-alt' },
        { label: 'ขอแก้ไขสิทธิ', value: 'access_edit', checked: false, disabled: false, icon: 'fa-user-lock' },
        { label: 'ขอ Unlock User', value: 'unlock_user', checked: false, disabled: false, icon: 'fa-unlock-alt' },
        { label: 'ขอใช้ระบบ', value: 'request_system', checked: false, disabled: false, icon: 'fa-desktop' },
        { label: 'แจ้งซ่อม', value: 'repair', checked: false, disabled: false, icon: 'fa-tools' },
        { label: 'แจ้งปัญหา', value: 'problem', checked: false, disabled: false, icon: 'fa-exclamation-triangle' },
        { label: 'บริการอื่นๆ', value: 'other', checked: false, disabled: false, icon: 'fa-ellipsis-h' }
    ]);

    isUserCategorySelected = signal(false);
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

    showRepairModal = signal(false);

    repairFormData = signal({
        device: '',
        brand: '',
        model: '',
        symptom: ''
    });

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
                const isChecking = !newItems[index].checked;

                if (newItems[index].value === 'repair' && isChecking) {
                    this.showRepairModal.set(true);
                } else {
                    newItems[index].checked = isChecking;
                }
            }

            const repairSet = ['repair', 'problem'];
            const hasRepairActive = newItems.some(i => repairSet.includes(i.value) && i.checked);
            const hasServiceActive = newItems.some(i => !repairSet.includes(i.value) && i.checked);

            return newItems.map(item => {
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

    closeRepairModal() {
        this.showRepairModal.set(false);
    }

    confirmRepairRequest() {
        this.serviceOptions.update(items => {
            const newItems = items.map(item => {
                if (item.value === 'repair') {
                    return { ...item, checked: true };
                }
                return item;
            });

            const repairSet = ['repair', 'problem'];
            const hasRepairActive = newItems.some(i => repairSet.includes(i.value) && i.checked);

            return newItems.map(item => {
                const isRepairType = repairSet.includes(item.value);
                if (hasRepairActive) {
                    item.disabled = !isRepairType;
                }
                return item;
            });
        });
        this.showRepairModal.set(false);
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



    submittedRequests = signal<any[]>([]);

    confirmSubmission() {
        const selectedServices = this.serviceOptions().filter(s => s.checked);

        let openForDisplay = '';
        const selected = this.openForOptions().find(o => o.value === this.selectedOpenFor());
        if (this.selectedOpenFor() === 'other') {
            openForDisplay = `อื่นๆ: ${this.otherOpenForName()}`;
        } else {
            openForDisplay = selected ? selected.label : '';
        }

        const newRequest = {
            id: Date.now(),
            date: new Date(),
            services: selectedServices.map(s => s.label),
            details: this.requestDetails(),
            repairData: selectedServices.some(s => s.value === 'repair') ? this.repairFormData() : null,
            openFor: openForDisplay,
            status: 'Pending'
        };

        this.submittedRequests.update(reqs => [newRequest, ...reqs]);

        console.log('Final Submission Payload:', newRequest);
        this.swalService.success('สำเร็จ', 'ส่งคำขอเรียบร้อยแล้ว');
        this.showSummaryModal.set(false);

        this.serviceOptions.update(items => items.map(i => ({ ...i, checked: false })));
        this.isUserCategorySelected.set(false);
        this.isSystemCategorySelected.set(false);
        this.userSubOptions.update(items => items.map(i => ({ ...i, checked: false })));
        this.systemSubOptions.update(items => items.map(i => ({ ...i, checked: false })));
        this.repairFormData.set({ device: '', brand: '', model: '', symptom: '' });
    }
}
