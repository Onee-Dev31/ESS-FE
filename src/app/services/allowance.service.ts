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

    private readonly STORAGE_KEY = 'MOCK_ADDED_ALLOWANCE';

    // ข้อมูลจำลองคำขอเบี้ยเลี้ยง
    private allowanceRequestsMock!: AllowanceRequest[];
    private allowanceRequestsSubject!: BehaviorSubject<AllowanceRequest[]>;

    constructor() {
        this.refreshMockData();
    }

    private generateMockData(count: number): AllowanceRequest[] {
        const role = localStorage.getItem('userRole') as 'Admin' | 'Member' || 'Member';
        return AllowanceMock.generateRequestsByRole(count, role);
    }

    refreshMockData() {
        const role = localStorage.getItem('userRole') as 'Admin' | 'Member' || 'Member';
        const generatedMocks = AllowanceMock.generateRequestsByRole(15, role);
        const addedRequests = this.getAddedRequestsFromStorage();

        // Merge generated mocks with user-added requests
        // Added requests go first to appear at the top
        this.allowanceRequestsMock = [...addedRequests, ...generatedMocks];

        // If subject exists, update it. If not (constructor), create it.
        if (this.allowanceRequestsSubject) {
            this.allowanceRequestsSubject.next(this.allowanceRequestsMock);
        } else {
            this.allowanceRequestsSubject = new BehaviorSubject<AllowanceRequest[]>(this.allowanceRequestsMock);
        }
    }

    private getAddedRequestsFromStorage(): AllowanceRequest[] {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    }

    // ดึงข้อมูลคำขอเบี้ยเลี้ยงทั้งหมด
    getAllowanceRequests(): Observable<AllowanceRequest[]> {
        return this.loadingService.wrap(this.allowanceRequestsSubject.asObservable().pipe(delay(100)));
    }

    // ดึงข้อมูลคำขอเบี้ยเลี้ยงตาม ID
    getAllowanceRequestById(id: string): Observable<AllowanceRequest | undefined> {
        const item = this.allowanceRequestsMock.find(r => r.id === id);
        return this.loadingService.wrap(of(item).pipe(delay(100)));
    }

    // เพิ่มคำขอเบี้ยเลี้ยงใหม่
    addAllowanceRequest(request: AllowanceRequest): Observable<void> {
        // Save to LocalStorage
        const addedRequests = this.getAddedRequestsFromStorage();
        addedRequests.unshift(request);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(addedRequests));

        // Update In-Memory State
        this.allowanceRequestsMock = [request, ...this.allowanceRequestsMock];
        this.allowanceRequestsSubject.next(this.allowanceRequestsMock);
        return this.loadingService.wrap(of(void 0).pipe(delay(200)));
    }

    // อัปเดตข้อมูลคำขอเบี้ยเลี้ยง
    updateAllowanceRequest(id: string, updatedRequest: AllowanceRequest): Observable<void> {
        // Update in storage if it exists there
        const addedRequests = this.getAddedRequestsFromStorage();
        const index = addedRequests.findIndex(r => r.id === id);
        if (index !== -1) {
            addedRequests[index] = updatedRequest;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(addedRequests));
        }

        this.allowanceRequestsMock = this.allowanceRequestsMock.map(r => r.id === id ? updatedRequest : r);
        this.allowanceRequestsSubject.next([...this.allowanceRequestsMock]);
        return this.loadingService.wrap(of(void 0).pipe(delay(200)));
    }

    // ลบคำขอเบี้ยเลี้ยง
    deleteAllowanceRequest(id: string): Observable<void> {
        this.allowanceRequestsMock = this.allowanceRequestsMock.filter(r => r.id !== id);
        this.allowanceRequestsSubject.next([...this.allowanceRequestsMock]);
        return this.loadingService.wrap(of(void 0).pipe(delay(200)));
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
        return of(results).pipe(delay(100));
    }

    // อัปเดตสถานะคำขอเบี้ยเลี้ยง
    updateAllowanceStatus(id: string, status: string): void {
        this.allowanceRequestsMock = this.allowanceRequestsMock.map(r =>
            r.id === id ? { ...r, status: status } : r
        );
        this.allowanceRequestsSubject.next(this.allowanceRequestsMock);
    }
}
