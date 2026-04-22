import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-rating-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './rating-modal.html',
    styleUrls: ['./rating-modal.scss']
})
export class RatingModalComponent {
    @Output() onClose = new EventEmitter<void>();
    @Output() onRate = new EventEmitter<{ rating: number, comment: string }>();

    rating = signal<number>(0);
    hoverRating = signal<number>(0);
    comment = '';

    setRating(val: number) {
        this.rating.set(val);
    }

    setHover(val: number) {
        this.hoverRating.set(val);
    }

    submit() {
        if (this.rating() > 0) {
            this.onRate.emit({ rating: this.rating(), comment: this.comment });
            this.close();
        }
    }

    close() {
        this.onClose.emit();
    }
}
