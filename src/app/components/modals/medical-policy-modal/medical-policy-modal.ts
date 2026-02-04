/**
 * @file Medical Policy Modal
 * @description Logic for Medical Policy Modal
 */

// Section: Imports
import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

// Section: Logic
@Component({
    selector: 'app-medical-policy-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './medical-policy-modal.html',
    styleUrl: './medical-policy-modal.scss'
})
export class MedicalPolicyModalComponent {
    @Output() onClose = new EventEmitter<void>();

    close() {
        this.onClose.emit();
    }
}
