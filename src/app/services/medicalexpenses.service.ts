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
    private medicalRequestsMock: MedicalRequest[] = MedicalMock.generateRequests(15);
    private medicalRequestsSubject = new BehaviorSubject<MedicalRequest[]>(this.medicalRequestsMock);

    constructor() { }

    // ดึงข้อมูลคำขอค่ารักษาพยาบาลทั้งหมด
    getMedicalRequests(): Observable<MedicalRequest[]> {
        return this.loadingService.wrap(this.medicalRequestsSubject.asObservable().pipe(delay(200)));
    }

    // ดึงข้อมูลตาม ID
    getRequestById(id: string): Observable<MedicalRequest | undefined> {
        const item = this.medicalRequestsMock.find(r => r.id === id);
        return this.loadingService.wrap(of(item).pipe(delay(200)));
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
        return of(nextId).pipe(delay(200));
    }

    // เพิ่มคำขอใหม่
    addRequest(request: MedicalRequest): Observable<void> {
        this.medicalRequestsMock = [request, ...this.medicalRequestsMock];
        this.medicalRequestsSubject.next([...this.medicalRequestsMock]);
        return this.loadingService.wrap(of(void 0).pipe(delay(500)));
    }

    // อัปเดตข้อมูลคำขอ
    updateRequest(request: MedicalRequest): Observable<void> {
        const index = this.medicalRequestsMock.findIndex(r => r.id === request.id);
        if (index !== -1) {
            this.medicalRequestsMock[index] = request;
            this.medicalRequestsSubject.next([...this.medicalRequestsMock]);
        }
        return this.loadingService.wrap(of(void 0).pipe(delay(500)));
    }
}
