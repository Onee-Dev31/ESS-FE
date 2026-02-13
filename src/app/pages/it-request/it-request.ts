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
        { label: 'USER', value: 'user', checked: false },
        { label: 'System', value: 'system', checked: false },
        { label: 'แจ้งซ่อม', value: 'repair', checked: false },
        { label: 'แจ้งปัญหา', value: 'problem', checked: false },
        { label: 'บริการอื่นๆ', value: 'other', checked: false }
    ]);

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

    isUserSelected = computed(() => {
        const userOption = this.serviceOptions().find(o => o.value === 'user');
        return userOption ? userOption.checked : false;
    });

    isSystemSelected = computed(() => {
        const systemOption = this.serviceOptions().find(o => o.value === 'system');
        return systemOption ? systemOption.checked : false;
    });

    hasUserSubOptionsSelected = computed(() => {
        return this.userSubOptions().some(o => o.checked);
    });

    hasSystemSubOptionsSelected = computed(() => {
        return this.systemSubOptions().some(o => o.checked);
    });

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

            if (newItems[index].value === 'user' && !newItems[index].checked) {
                this.userSubOptions.update(subs => subs.map(s => ({ ...s, checked: false })));
            }
            if (newItems[index].value === 'system' && !newItems[index].checked) {
                this.systemSubOptions.update(subs => subs.map(s => ({ ...s, checked: false })));
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

    submit() {
        const selectedServices = this.serviceOptions().filter(s => s.checked);

        if (selectedServices.length === 0) {
            alert('กรุณาเลือกบริการอย่างน้อย 1 รายการ');
            return;
        }

        this.showSummaryModal.set(true);
    }

    closeSummaryModal() {
        this.showSummaryModal.set(false);
    }

    confirmSubmission() {
        const selectedServices = this.serviceOptions().filter(s => s.checked);
        const selectedUserOptions = this.userSubOptions().filter(s => s.checked);
        const selectedSystemOptions = this.systemSubOptions().filter(s => s.checked);

        const payload = {
            services: selectedServices,
            userOptions: this.isUserSelected() ? selectedUserOptions : [],
            systemOptions: this.isSystemSelected() ? selectedSystemOptions : [],
            repairData: selectedServices.some(s => s.value === 'repair') ? this.repairFormData() : null
        };

        console.log('Final Submission Payload:', payload);
        alert('ส่งคำขอเรียบร้อยแล้ว');
        this.showSummaryModal.set(false);
        // TODO: Reset form or navigate away
    }
}
