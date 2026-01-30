import { Injectable, inject } from '@angular/core';
import { Observable, of, BehaviorSubject, delay, finalize } from 'rxjs';
import { LoadingService } from './loading.service';
import { RequestItem, VehicleRequest } from '../interfaces';
import { TransportMock } from '../mocks';

export type { RequestItem, VehicleRequest };

@Injectable({
    providedIn: 'root'
})
export class TransportService {
    private loadingService = inject(LoadingService);

    private readonly STORAGE_KEY = 'MOCK_ADDED_TRANSPORT';

    private requestsMock!: VehicleRequest[];
    private requestsSubject!: BehaviorSubject<VehicleRequest[]>;

    constructor() {
        this.refreshMockData();
    }

    refreshMockData() {
        const role = localStorage.getItem('userRole') as 'Admin' | 'Member' || 'Member';
        const generatedMocks = TransportMock.generateRequestsByRole(15, role);
        const addedRequests = this.getAddedRequestsFromStorage();

        this.requestsMock = [...addedRequests, ...generatedMocks];

        if (this.requestsSubject) {
            this.requestsSubject.next(this.requestsMock);
        } else {
            this.requestsSubject = new BehaviorSubject<VehicleRequest[]>(this.requestsMock);
        }
    }

    private getAddedRequestsFromStorage(): VehicleRequest[] {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    }

    // ดึงข้อมูลคำขอทั้งหมด
    getRequests(): Observable<VehicleRequest[]> {
        return this.loadingService.wrap(this.requestsSubject.asObservable().pipe(delay(100)));
    }

    // ดึงข้อมูลคำขอตาม ID
    getRequestById(id: string): Observable<VehicleRequest | undefined> {
        const item = this.requestsMock.find(r => r.id === id);
        return this.loadingService.wrap(of(item).pipe(delay(100)));
    }

    // เพิ่มคำขอใหม่
    addRequest(request: VehicleRequest): Observable<void> {
        const addedRequests = this.getAddedRequestsFromStorage();
        addedRequests.unshift(request);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(addedRequests));

        this.requestsMock = [request, ...this.requestsMock];
        this.requestsSubject.next([...this.requestsMock]);
        return this.loadingService.wrap(of(void 0).pipe(delay(200)));
    }

    // อัปเดตข้อมูลคำขอ
    updateRequest(id: string, updatedRequest: VehicleRequest): Observable<void> {
        const addedRequests = this.getAddedRequestsFromStorage();
        const index = addedRequests.findIndex(r => r.id === id);
        if (index !== -1) {
            addedRequests[index] = updatedRequest;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(addedRequests));
        }

        this.requestsMock = this.requestsMock.map(r => r.id === id ? updatedRequest : r);
        this.requestsSubject.next([...this.requestsMock]);
        return this.loadingService.wrap(of(void 0).pipe(delay(200)));
    }

    // ลบคำขอ
    deleteRequest(id: string): Observable<void> {
        this.requestsMock = this.requestsMock.filter(r => r.id !== id);
        this.requestsSubject.next([...this.requestsMock]);
        return this.loadingService.wrap(of(void 0).pipe(delay(200)));
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
        return of(results).pipe(delay(100));
    }

    // อัปเดตสถานะคำขอ
    updateStatus(id: string, status: string): void {
        this.requestsMock = this.requestsMock.map(r =>
            r.id === id ? { ...r, status: status } : r
        );
        this.requestsSubject.next(this.requestsMock);
    }
}
