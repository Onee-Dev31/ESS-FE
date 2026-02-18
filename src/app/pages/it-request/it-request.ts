import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';

@Component({
    selector: 'app-it-request',
    standalone: true,
    imports: [CommonModule, FormsModule, PageHeaderComponent],
    templateUrl: './it-request.html',
    styleUrl: './it-request.scss'
})
export class ITRequestComponent {

    serviceOptions = signal([
        { label: 'บริการ Internet', value: 'internet', checked: false },
        { label: 'บริการ Email', value: 'email', checked: false },
        { label: 'File Sharing', value: 'fileshare', checked: false },
        { label: 'ขอแก้ไขสิทธิการเข้าระบบงาน', value: 'access_edit', checked: false },
        { label: 'ขอ Unlock User', value: 'unlock_user', checked: false },
        { label: 'ขอใช้ระบบงาน (Request System)', value: 'request_system', checked: false },
        { label: 'แจ้งซ่อม', value: 'repair', checked: false },
        { label: 'แจ้งปัญหา', value: 'problem', checked: false },
        { label: 'บริการอื่นๆ', value: 'other', checked: false }
    ]);

    isUserCategorySelected = signal(false);
    isSystemCategorySelected = signal(false);

    userSubOptions = signal([
        { label: 'ห้องประชุม', value: 'meeting_room', checked: false },
        { label: 'ห้องนวด', value: 'massage_room', checked: false }
    ]);

    systemSubOptions = signal([
        { label: 'Oracle', value: 'oracle', checked: false },
        { label: 'BMS', value: 'bms', checked: false },
        { label: 'ONEE', value: 'onee', checked: false },
        { label: 'ONENEWS', value: 'onenews', checked: false },
        { label: 'ONE', value: 'one', checked: false },
        { label: 'CLF', value: 'clf', checked: false },
        { label: 'AGM', value: 'agm', checked: false }
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

    toggleService(index: number) {
        this.serviceOptions.update(items => {
            const newItems = [...items];
            const isChecking = !newItems[index].checked;

            if (newItems[index].value === 'repair' && isChecking) {
                this.showRepairModal.set(true);
            } else {
                newItems[index].checked = isChecking;
            }
            return newItems;
        });
    }

    showSummaryModal = signal(false);

    closeRepairModal() {
        this.showRepairModal.set(false);
    }

    confirmRepairRequest() {
        this.serviceOptions.update(items => {
            return items.map(item => {
                if (item.value === 'repair') {
                    return { ...item, checked: true };
                }
                return item;
            });
        });
        this.showRepairModal.set(false);
    }

    submit() {
        const selectedServices = this.serviceOptions().filter(s => s.checked);

        if (selectedServices.length === 0) {
            alert('กรุณาเลือกบริการอย่างน้อย 1 รายการ');
            return;
        }

        if (this.selectedOpenFor() === 'other' && !this.otherOpenForName().trim()) {
            alert('กรุณาระบุชื่อผู้ขอสิทธิ์ (Other)');
            return;
        }

        if (!this.requestDetails().trim()) {
            alert('กรุณากรอกรายละเอียด (Details)');
            return;
        }

        this.showSummaryModal.set(true);
    }

    closeSummaryModal() {
        this.showSummaryModal.set(false);
    }

    draftRequest = computed(() => {
        const selectedServices = this.serviceOptions().filter(s => s.checked);
        if (selectedServices.length === 0) return null;

        let openForDisplay = '';
        const selected = this.openForOptions().find(o => o.value === this.selectedOpenFor());
        if (this.selectedOpenFor() === 'other') {
            openForDisplay = `อื่นๆ: ${this.otherOpenForName()}`;
        } else {
            openForDisplay = selected ? selected.label : '';
        }

        return {
            id: 'draft',
            date: new Date(),
            services: selectedServices.map(s => s.label),
            details: this.requestDetails(),
            repairData: selectedServices.some(s => s.value === 'repair') ? this.repairFormData() : null,
            openFor: openForDisplay,
            status: 'Draft' // Or 'Selecting...'
        };
    });

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
        alert('ส่งคำขอเรียบร้อยแล้ว');
        this.showSummaryModal.set(false);

        // Reset form
        this.serviceOptions.update(items => items.map(i => ({ ...i, checked: false })));
        this.isUserCategorySelected.set(false);
        this.isSystemCategorySelected.set(false);
        this.userSubOptions.update(items => items.map(i => ({ ...i, checked: false })));
        this.systemSubOptions.update(items => items.map(i => ({ ...i, checked: false })));
        this.repairFormData.set({ device: '', brand: '', model: '', symptom: '' });
    }
}
