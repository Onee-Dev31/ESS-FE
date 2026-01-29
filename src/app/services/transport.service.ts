import { Injectable, inject } from '@angular/core';
import { Observable, of, BehaviorSubject, delay, finalize } from 'rxjs';
import { LoadingService } from './loading.service';
import { RequestItem, VehicleRequest } from '../interfaces';
import { Requester } from '../interfaces';
import { TransportMock } from '../mocks';

export type { RequestItem, VehicleRequest };

@Injectable({
    providedIn: 'root'
})
export class TransportService {
    private loadingService = inject(LoadingService);

    // ข้อมูลจำลองคำขอค่าเดินทาง
    private requestsMock: VehicleRequest[] = TransportMock.generateRequests(15);
    private requestsSubject = new BehaviorSubject<VehicleRequest[]>(this.requestsMock);

    constructor() { }

    // ดึงข้อมูลคำขอทั้งหมด
    getRequests(): Observable<VehicleRequest[]> {
        return this.loadingService.wrap(this.requestsSubject.asObservable().pipe(delay(200)));
    }

    // ดึงข้อมูลคำขอตาม ID
    getRequestById(id: string): Observable<VehicleRequest | undefined> {
        const item = this.requestsMock.find(r => r.id === id);
        return this.loadingService.wrap(of(item).pipe(delay(200)));
    }

    // เพิ่มคำขอใหม่
    addRequest(request: VehicleRequest): Observable<void> {
        this.requestsMock = [request, ...this.requestsMock];
        this.requestsSubject.next([...this.requestsMock]);
        return this.loadingService.wrap(of(void 0).pipe(delay(300)));
    }

    // อัปเดตข้อมูลคำขอ
    updateRequest(id: string, updatedRequest: VehicleRequest): Observable<void> {
        this.requestsMock = this.requestsMock.map(r => r.id === id ? updatedRequest : r);
        this.requestsSubject.next([...this.requestsMock]);
        return this.loadingService.wrap(of(void 0).pipe(delay(300)));
    }

    // ลบคำขอ
    deleteRequest(id: string): Observable<void> {
        this.requestsMock = this.requestsMock.filter(r => r.id !== id);
        this.requestsSubject.next([...this.requestsMock]);
        return this.loadingService.wrap(of(void 0).pipe(delay(300)));
    }

    // สร้างรหัสคำขอถัดไป
    generateNextId(): Observable<string> {
        const lastIdNum = this.requestsMock.reduce((max, item) => {
            const num = parseInt(item.id.split('#')[1] || '0');
            return num > max ? num : max;
        }, 0);
        const nextNum = (lastIdNum + 1).toString().padStart(3, '0');
        return of(`2701#${nextNum}`);
    }

    // ดึงข้อมูล log การมาทำงานจำลอง
    getMockAttendanceLogs(month: number, year: number): Observable<any[]> {
        const results = TransportMock.getMockAttendanceLogs(month, year);
        return of(results).pipe(delay(200));
    }

    // อัปเดตสถานะคำขอ
    updateStatus(id: string, status: string): void {
        this.requestsMock = this.requestsMock.map(r =>
            r.id === id ? { ...r, status: status } : r
        );
        this.requestsSubject.next(this.requestsMock);
    }
}
