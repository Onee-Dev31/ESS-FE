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

    private readonly STORAGE_KEY = 'MOCK_ADDED_TAXI';

    // ข้อมูลจำลองคำขอค่าแท็กซี่
    private taxiRequestsMock!: TaxiRequest[];
    private taxiRequestsSubject!: BehaviorSubject<TaxiRequest[]>;

    constructor() {
        this.refreshMockData();
    }

    refreshMockData() {
        const role = localStorage.getItem('userRole') as 'Admin' | 'Member' || 'Member';
        const generatedMocks = TaxiMock.generateRequestsByRole(15, role);
        const addedRequests = this.getAddedRequestsFromStorage();

        this.taxiRequestsMock = [...addedRequests, ...generatedMocks];

        if (this.taxiRequestsSubject) {
            this.taxiRequestsSubject.next(this.taxiRequestsMock);
        } else {
            this.taxiRequestsSubject = new BehaviorSubject<TaxiRequest[]>(this.taxiRequestsMock);
        }
    }

    private getAddedRequestsFromStorage(): TaxiRequest[] {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    }

    // ดึงข้อมูลคำขอค่าแท็กซี่ทั้งหมด
    getTaxiRequests(): Observable<TaxiRequest[]> {
        return this.loadingService.wrap(this.taxiRequestsSubject.asObservable().pipe(delay(100)));
    }

    // ดึงข้อมูลคำขอค่าแท็กซี่ตาม ID
    getTaxiRequestById(id: string): Observable<TaxiRequest | undefined> {
        const item = this.taxiRequestsMock.find(r => r.id === id);
        return this.loadingService.wrap(of(item).pipe(delay(100)));
    }

    // เพิ่มคำขอค่าแท็กซี่ใหม่
    addTaxiRequest(request: TaxiRequest): Observable<void> {
        const addedRequests = this.getAddedRequestsFromStorage();
        addedRequests.unshift(request);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(addedRequests));

        this.taxiRequestsMock = [request, ...this.taxiRequestsMock];
        this.taxiRequestsSubject.next(this.taxiRequestsMock);
        return this.loadingService.wrap(of(void 0).pipe(delay(200)));
    }

    // อัปเดตข้อมูลคำขอค่าแท็กซี่
    updateTaxiRequest(id: string, updatedRequest: TaxiRequest): Observable<void> {
        const addedRequests = this.getAddedRequestsFromStorage();
        const index = addedRequests.findIndex(r => r.id === id);
        if (index !== -1) {
            addedRequests[index] = updatedRequest;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(addedRequests));
        }

        this.taxiRequestsMock = this.taxiRequestsMock.map(r => r.id === id ? updatedRequest : r);
        this.taxiRequestsSubject.next([...this.taxiRequestsMock]);
        return this.loadingService.wrap(of(void 0).pipe(delay(200)));
    }

    // ลบคำขอค่าแท็กซี่
    deleteTaxiRequest(id: string): Observable<void> {
        this.taxiRequestsMock = this.taxiRequestsMock.filter(r => r.id !== id);
        this.taxiRequestsSubject.next([...this.taxiRequestsMock]);
        return this.loadingService.wrap(of(void 0).pipe(delay(200)));
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
        return of(results).pipe(delay(100));
    }

    // อัปเดตสถานะคำขอแท็กซี่
    updateTaxiStatus(id: string, status: string): void {
        this.taxiRequestsMock = this.taxiRequestsMock.map(r =>
            r.id === id ? { ...r, status: status } : r
        );
        this.taxiRequestsSubject.next(this.taxiRequestsMock);
    }
}
