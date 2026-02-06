import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { shareReplay, delay } from 'rxjs/operators';
import { LEAVE_TYPES, LeaveType } from '../interfaces/time-off.interface';

import { DateConfig } from '../interfaces/core.interface';

export interface ClaimType {
    id: string;
    label: string;
    amount: string;
    icon: string;
    color: string;
}

@Injectable({
    providedIn: 'root'
})
export class MasterDataService {

    private leaveTypesCache$: Observable<LeaveType[]> | null = null;
    private claimTypesCache$: Observable<ClaimType[]> | null = null;
    private dateConfigCache$: Observable<DateConfig> | null = null;

    getLeaveTypes(): Observable<LeaveType[]> {
        if (!this.leaveTypesCache$) {
            this.leaveTypesCache$ = of(LEAVE_TYPES).pipe(
                delay(500),
                shareReplay(1)
            );
        }
        return this.leaveTypesCache$;
    }

    getMedicalClaimTypes(): Observable<ClaimType[]> {
        if (!this.claimTypesCache$) {
            const types: ClaimType[] = [
                { id: 'opd', label: 'ผู้ป่วยนอก (OPD)', amount: '10,500', icon: 'fas fa-stethoscope', color: '#ff6b6b' },
                { id: 'dental', label: 'ทันตกรรม', amount: '584', icon: 'fas fa-tooth', color: '#4d96ff' },
                { id: 'vision', label: 'สายตา', amount: '876', icon: 'fas fa-glasses', color: '#6bc1ff' },
                { id: 'ipd', label: 'ผู้ป่วยใน', amount: '3,500', icon: 'fas fa-user-md', color: '#6bcb77' },
            ];
            this.claimTypesCache$ = of(types).pipe(
                delay(500),
                shareReplay(1)
            );
        }
        return this.claimTypesCache$;
    }

    getDateConfig(): Observable<DateConfig> {
        if (!this.dateConfigCache$) {
            const config = {
                months: [
                    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
                ],
                years: [2568, 2569, 2570]
            };
            this.dateConfigCache$ = of(config).pipe(
                delay(300),
                shareReplay(1)
            );
        }
        return this.dateConfigCache$;
    }
}
