import { Injectable, inject } from '@angular/core';
import { Observable, of, BehaviorSubject, delay, tap, finalize } from 'rxjs';
import { MedicalItem, MedicalRequest } from '../interfaces';
import { MedicalMock } from '../mocks';
import { LoadingService } from './loading.service';

export type { MedicalItem, MedicalRequest };

@Injectable({
    providedIn: 'root'
})
export class MedicalexpensesService {
    private loadingService = inject(LoadingService);
    private readonly STORAGE_KEY = 'MOCK_ADDED_MEDICAL';

    private medicalRequestsMock!: MedicalRequest[];
    private medicalRequestsSubject!: BehaviorSubject<MedicalRequest[]>;

    constructor() {
        this.refreshMockData();
    }

    private generateMockData(count: number): MedicalRequest[] {
        const role = localStorage.getItem('userRole') as 'Admin' | 'Member' || 'Member';
        return MedicalMock.generateRequestsByRole(count, role);
    }

    refreshMockData() {
        const role = localStorage.getItem('userRole') as 'Admin' | 'Member' || 'Member';
        const generatedMocks = MedicalMock.generateRequestsByRole(15, role);
        const addedRequests = this.getAddedRequestsFromStorage();

        this.medicalRequestsMock = [...addedRequests, ...generatedMocks];

        if (this.medicalRequestsSubject) {
            this.medicalRequestsSubject.next(this.medicalRequestsMock);
        } else {
            this.medicalRequestsSubject = new BehaviorSubject<MedicalRequest[]>(this.medicalRequestsMock);
        }
    }

    private getAddedRequestsFromStorage(): MedicalRequest[] {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    }

    // ดึงข้อมูลคำขอค่ารักษาพยาบาลทั้งหมด
    getMedicalRequests(): Observable<MedicalRequest[]> {
        return this.loadingService.wrap(this.medicalRequestsSubject.asObservable().pipe(delay(100)));
    }

    // ดึงข้อมูลคำขอค่ารักษาพยาบาลตาม ID
    getRequestById(id: string): Observable<MedicalRequest | undefined> {
        const item = this.medicalRequestsMock.find(r => r.id === id);
        return this.loadingService.wrap(of(item).pipe(delay(100)));
    }

    // สร้างรหัสคำขอถัดไป
    generateNextMedicalId(): Observable<string> {
        const prefix = '2701';

        const ids = this.medicalRequestsMock
            .filter(r => r.id.startsWith(prefix))
            .map(r => {
                const parts = r.id.split('#');
                return parts.length > 1 ? parseInt(parts[1]) : 0;
            })
            .sort((a, b) => b - a);

        const nextNum = ids.length > 0 ? ids[0] + 1 : 1;
        const nextId = `${prefix}#${String(nextNum).padStart(3, '0')}`;
        return of(nextId).pipe(delay(100));
    }

    // เพิ่มคำขอค่ารักษาพยาบาลใหม่
    addRequest(request: MedicalRequest): Observable<void> {
        const addedRequests = this.getAddedRequestsFromStorage();
        addedRequests.unshift(request);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(addedRequests));

        this.medicalRequestsMock = [request, ...this.medicalRequestsMock];
        this.medicalRequestsSubject.next(this.medicalRequestsMock);
        return this.loadingService.wrap(of(void 0).pipe(delay(200)));
    }

    // อัปเดตข้อมูลคำขอค่ารักษาพยาบาล
    updateRequest(updatedRequest: MedicalRequest): Observable<void> {
        const id = updatedRequest.id;
        const addedRequests = this.getAddedRequestsFromStorage();
        const index = addedRequests.findIndex(r => r.id === id);
        if (index !== -1) {
            addedRequests[index] = updatedRequest;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(addedRequests));
        }

        this.medicalRequestsMock = this.medicalRequestsMock.map(r => r.id === id ? updatedRequest : r);
        this.medicalRequestsSubject.next([...this.medicalRequestsMock]);
        return this.loadingService.wrap(of(void 0).pipe(delay(200)));
    }
}
