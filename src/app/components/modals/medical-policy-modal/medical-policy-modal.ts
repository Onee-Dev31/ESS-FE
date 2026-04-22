import { Component, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MedicalApiService } from '../../../services/medical-api.service';
import { BenefitPlan, PolicyContent } from '../../../interfaces/medical.interface';

@Component({
    selector: 'app-medical-policy-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './medical-policy-modal.html',
    styleUrl: './medical-policy-modal.scss'
})
export class MedicalPolicyModalComponent implements OnInit {
    @Output() onClose = new EventEmitter<void>();

    private medicalApi = inject(MedicalApiService);

    isLoading = signal(true);
    benefitPlans = signal<BenefitPlan[]>([]);
    allContent = signal<PolicyContent[]>([]);
    rootSections = signal<PolicyContent[]>([]);
    metaContent = signal<PolicyContent | null>(null);

    ngOnInit() {
        this.medicalApi.getPolicy().subscribe({
            next: (res) => {
                this.benefitPlans.set(res.data.benefit_plans);
                this.allContent.set(res.data.policy_content);
                this.metaContent.set(res.data.policy_content.find(c => c.contentType === 'meta') ?? null);
                this.rootSections.set(res.data.policy_content.filter(c => c.parentId === null && c.contentType !== 'meta'));
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
        });
    }

    getChildren(parentId: number): PolicyContent[] {
        return this.allContent().filter(c => c.parentId === parentId);
    }

    close() {
        this.onClose.emit();
    }
}
