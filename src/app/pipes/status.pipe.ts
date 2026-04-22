import { Pipe, PipeTransform } from '@angular/core';
import { StatusUtil } from '../utils/status.util';

@Pipe({
    name: 'statusClass',
    standalone: true
})

export class StatusPipe implements PipeTransform {
    transform(status: string): string {
        return StatusUtil.getStatusBadgeClass(status);
    }
}
