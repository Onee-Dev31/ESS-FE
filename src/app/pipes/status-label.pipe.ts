import { Pipe, PipeTransform } from '@angular/core';
import { REQUEST_STATUS_LABEL } from '../constants/request-status.constant';

@Pipe({
  name: 'statusLabel',
  standalone: true,
})
export class StatusLabelPipe implements PipeTransform {
  transform(value: string): string {
    return REQUEST_STATUS_LABEL[value] || value;
  }
}
