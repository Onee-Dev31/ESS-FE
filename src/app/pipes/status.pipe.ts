/**
 * @file Status Pipe
 * @description Logic for Status Pipe
 */

// Section: Imports
import { Pipe, PipeTransform } from '@angular/core';
import { StatusUtil } from '../utils/status.util';

@Pipe({
    name: 'statusClass',
    standalone: true
})
// Section: Logic
export class StatusPipe implements PipeTransform {
    transform(status: string): string {
        return StatusUtil.getStatusBadgeClass(status);
    }
}
