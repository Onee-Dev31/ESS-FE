import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type ApprovalStepState =
  'completed' | 'active' | 'pending' | 'rejected' | 'sendback' | 'cancelled';

export interface ApprovalStep {
  label: string;
  state: ApprovalStepState;
  approverCode?: string;
  actionReason?: string;
}

@Component({
  selector: 'app-approval-steps',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './approval-steps.html',
  styleUrl: './approval-steps.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalStepsComponent {
  @Input({ required: true }) steps: ApprovalStep[] = [];

  get actionReasonSteps(): ApprovalStep[] {
    return this.steps.filter(
      (step) => (step.state === 'rejected' || step.state === 'sendback') && step.actionReason,
    );
  }
}
