import { Injectable, inject } from '@angular/core';
import { Observable, of, BehaviorSubject, delay, finalize } from 'rxjs';
import { LoadingService } from './loading.service';
import { AllowanceItem, AllowanceRequest } from '../interfaces';
import { Requester } from '../interfaces';
import { AllowanceMock } from '../mocks';

export type { AllowanceItem, AllowanceRequest };

@Injectable({
    providedIn: 'root'
})
export class AllowanceService {
    private loadingService = inject(LoadingService);

    // ข้อมูลจำลองคำขอเบี้ยเลี้ยง
    private allowanceRequestsMock: AllowanceRequest[] = AllowanceMock.generateRequests(15);
    private allowanceRequestsSubject = new BehaviorSubject<AllowanceRequest[]>(this.allowanceRequestsMock);

    constructor() { }

    // ดึงข้อมูลคำขอเบี้ยเลี้ยงทั้งหมด
    getAllowanceRequests(): Observable<AllowanceRequest[]> {
        return this.loadingService.wrap(this.allowanceRequestsSubject.asObservable().pipe(delay(200)));
    }

    // ดึงข้อมูลคำขอเบี้ยเลี้ยงตาม ID
    getAllowanceRequestById(id: string): Observable<AllowanceRequest | undefined> {
        const item = this.allowanceRequestsMock.find(r => r.id === id);
        return this.loadingService.wrap(of(item).pipe(delay(200)));
    }

    // เพิ่มคำขอเบี้ยเลี้ยงใหม่
    addAllowanceRequest(request: AllowanceRequest): Observable<void> {
        this.allowanceRequestsMock = [request, ...this.allowanceRequestsMock];
        this.allowanceRequestsSubject.next(this.allowanceRequestsMock);
        return this.loadingService.wrap(of(void 0).pipe(delay(300)));
    }

    // อัปเดตข้อมูลคำขอเบี้ยเลี้ยง
    updateAllowanceRequest(id: string, updatedRequest: AllowanceRequest): Observable<void> {
        this.allowanceRequestsMock = this.allowanceRequestsMock.map(r => r.id === id ? updatedRequest : r);
        this.allowanceRequestsSubject.next([...this.allowanceRequestsMock]);
        return this.loadingService.wrap(of(void 0).pipe(delay(300)));
    }

    // ลบคำขอเบี้ยเลี้ยง
    deleteAllowanceRequest(id: string): Observable<void> {
        this.allowanceRequestsMock = this.allowanceRequestsMock.filter(r => r.id !== id);
        this.allowanceRequestsSubject.next([...this.allowanceRequestsMock]);
        return this.loadingService.wrap(of(void 0).pipe(delay(300)));
    }

    // สร้างรหัสคำขอถัดไป
    generateNextAllowanceId(): Observable<string> {
        const prefix = '2701';
        const lastIdNum = this.allowanceRequestsMock.reduce((max, item) => {
            if (item.id.startsWith(prefix)) {
                const parts = item.id.split('#');
                const num = parseInt(parts[1] || '0');
                return num > max ? num : max;
            }
            return max;
        }, 0);

        return of(`${prefix}#${(lastIdNum + 1).toString().padStart(3, '0')}`);
    }

    // ดึงข้อมูล log จำลองสำหรับเบี้ยเลี้ยง
    getMockAllowanceLogs(month: number, year: number): Observable<any[]> {
        const results = AllowanceMock.getMockAllowanceLogs(month, year);
        return of(results).pipe(delay(200));
    }

    // อัปเดตสถานะคำขอเบี้ยเลี้ยง
    updateAllowanceStatus(id: string, status: string): void {
        this.allowanceRequestsMock = this.allowanceRequestsMock.map(r =>
            r.id === id ? { ...r, status: status } : r
        );
        this.allowanceRequestsSubject.next(this.allowanceRequestsMock);
    }
}
