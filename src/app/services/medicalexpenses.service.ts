import { Injectable, inject } from '@angular/core';
import { Observable, of, BehaviorSubject, delay } from 'rxjs';
import { MedicalItem, MedicalRequest } from '../interfaces';
import { MedicalMock } from '../mocks';

export type { MedicalItem, MedicalRequest };

@Injectable({
    providedIn: 'root'
})
export class MedicalexpensesService {

    private medicalRequestsMock: MedicalRequest[] = MedicalMock.generateRequests(15);
    private medicalRequestsSubject = new BehaviorSubject<MedicalRequest[]>(this.medicalRequestsMock);

    constructor() { }

    // ดึงข้อมูลคำขอค่ารักษาพยาบาลทั้งหมด
    getMedicalRequests(): Observable<MedicalRequest[]> {
        return this.medicalRequestsSubject.asObservable().pipe(delay(200));
    }

    // ดึงข้อมูลตาม ID
    getRequestById(id: string): Observable<MedicalRequest | undefined> {
        const request = this.medicalRequestsMock.find(r => r.id === id);
        return of(request).pipe(delay(200));
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
        this.medicalRequestsMock.unshift(request);
        this.medicalRequestsMock.sort((a, b) => b.id.localeCompare(a.id));
        this.medicalRequestsSubject.next([...this.medicalRequestsMock]);
        return of(undefined).pipe(delay(500));
    }

    // อัปเดตข้อมูลคำขอ
    updateRequest(request: MedicalRequest): Observable<void> {
        const index = this.medicalRequestsMock.findIndex(r => r.id === request.id);
        if (index !== -1) {
            this.medicalRequestsMock[index] = request;
            this.medicalRequestsSubject.next([...this.medicalRequestsMock]);
        }
        return of(undefined).pipe(delay(500));
    }
}
