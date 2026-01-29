import { Injectable, inject } from '@angular/core';
import { Observable, of, BehaviorSubject, delay, finalize } from 'rxjs';
import { LoadingService } from './loading.service';
import { TaxiItem, TaxiRequest } from '../interfaces';
import { Requester } from '../interfaces';
import { TaxiMock } from '../mocks';

export type { TaxiItem, TaxiRequest };

@Injectable({
    providedIn: 'root'
})
export class TaxiService {
    private loadingService = inject(LoadingService);

    // ข้อมูลจำลองคำขอค่าแท็กซี่
    private taxiRequestsMock: TaxiRequest[] = TaxiMock.generateRequests(15);
    private taxiRequestsSubject = new BehaviorSubject<TaxiRequest[]>(this.taxiRequestsMock);

    constructor() { }

    // ดึงข้อมูลคำขอค่าแท็กซี่ทั้งหมด
    getTaxiRequests(): Observable<TaxiRequest[]> {
        return this.loadingService.wrap(this.taxiRequestsSubject.asObservable().pipe(delay(200)));
    }

    // ดึงข้อมูลคำขอค่าแท็กซี่ตาม ID
    getTaxiRequestById(id: string): Observable<TaxiRequest | undefined> {
        const item = this.taxiRequestsMock.find(r => r.id === id);
        return this.loadingService.wrap(of(item).pipe(delay(200)));
    }

    // เพิ่มคำขอค่าแท็กซี่ใหม่
    addTaxiRequest(request: TaxiRequest): Observable<void> {
        this.taxiRequestsMock = [request, ...this.taxiRequestsMock];
        this.taxiRequestsSubject.next([...this.taxiRequestsMock]);
        return this.loadingService.wrap(of(void 0).pipe(delay(300)));
    }

    // อัปเดตข้อมูลคำขอค่าแท็กซี่
    updateTaxiRequest(id: string, updatedRequest: TaxiRequest): Observable<void> {
        this.taxiRequestsMock = this.taxiRequestsMock.map(r => r.id === id ? updatedRequest : r);
        this.taxiRequestsSubject.next([...this.taxiRequestsMock]);
        return this.loadingService.wrap(of(void 0).pipe(delay(300)));
    }

    // ลบคำขอค่าแท็กซี่
    deleteTaxiRequest(id: string): Observable<void> {
        this.taxiRequestsMock = this.taxiRequestsMock.filter(r => r.id !== id);
        this.taxiRequestsSubject.next([...this.taxiRequestsMock]);
        return this.loadingService.wrap(of(void 0).pipe(delay(300)));
    }

    // สร้างรหัสคำขอแท็กซี่ถัดไป
    generateNextTaxiId(): Observable<string> {
        const lastIdNum = this.taxiRequestsMock.reduce((max, item) => {
            const num = parseInt(item.id.split('#')[1] || '0');
            return num > max ? num : max;
        }, 0);
        const nextNum = (lastIdNum + 1).toString().padStart(3, '0');
        return of(`2701#${nextNum}`);
    }

    // ดึงข้อมูล log จำลองสำหรับค่าแท็กซี่
    getMockTaxiLogs(month: number, year: number): Observable<any[]> {
        const results = TaxiMock.getMockTaxiLogs(month, year);
        return of(results).pipe(delay(200));
    }

    // อัปเดตสถานะคำขอแท็กซี่
    updateTaxiStatus(id: string, status: string): void {
        this.taxiRequestsMock = this.taxiRequestsMock.map(r =>
            r.id === id ? { ...r, status: status } : r
        );
        this.taxiRequestsSubject.next(this.taxiRequestsMock);
    }
}
