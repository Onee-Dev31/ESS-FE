import { inject } from '@angular/core';
import { Observable, of, BehaviorSubject, delay, take } from 'rxjs';
import { LoadingService } from './loading';
import { STORAGE_KEYS } from '../constants/storage.constants';
import { BUSINESS_CONFIG } from '../constants/business.constant';
import { RequestBase } from '../interfaces/core.interface';

/** คลาสพื้นฐาน (Abstract Class) สำหรับการจัดการบริการคำขอต่าง ๆ (CRUD) พร้อมระบบจัดเก็บข้อมูลใน LocalStorage */
export abstract class BaseRequestService<T extends RequestBase> {
    protected loadingService = inject(LoadingService);
    protected abstract readonly STORAGE_KEY: string;
    protected requestsSubject = new BehaviorSubject<T[]>([]);

    /** เริ่มต้นข้อมูลจาก LocalStorage หากไม่มีข้อมูลจะสร้างจาก Mock Generator */
    protected initializeData(mockGenerator: () => T[]) {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            this.updateSubject(data);
        } else {
            const masterData = mockGenerator();
            this.saveToStorage(masterData);
            this.updateSubject(masterData);
        }
    }

    protected saveToStorage(data: T[]) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    }

    /** กรองและอัปเดตข้อมูลที่จะแสดงผลตามสิทธิ์ของผู้ใช้งาน (Admin/Member) */
    protected updateSubject(masterData: T[]) {
        const role = localStorage.getItem(STORAGE_KEYS.USER_ROLE) || 'Member';
        const employeeId = localStorage.getItem(STORAGE_KEYS.EMPLOYEE_ID);

        let viewData = [...masterData];
        if (role !== 'Admin' && employeeId) {
            viewData = masterData.filter(req => req.requester?.employeeId === employeeId);
        }

        viewData.sort((a, b) => b.id.localeCompare(a.id));
        this.requestsSubject.next(viewData);
    }

    protected getMasterData(): T[] {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    }

    getRequests(): Observable<T[]> {
        const masterData = this.getMasterData();
        this.updateSubject(masterData);
        return this.requestsSubject.asObservable().pipe(delay(100), take(1));
    }

    getRequestById(id: string): Observable<T | undefined> {
        const masterData = this.getMasterData();
        const item = masterData.find(r => r.id === id);
        return of(item).pipe(delay(100));
    }

    addRequest(request: T): Observable<void> {
        const masterData = this.getMasterData();
        masterData.unshift(request);
        this.saveToStorage(masterData);
        this.updateSubject(masterData);
        return this.loadingService.wrap(of(void 0).pipe(delay(200)));
    }

    updateRequest(updatedRequest: T): Observable<void> {
        const id = updatedRequest.id;
        const masterData = this.getMasterData();
        const index = masterData.findIndex(r => r.id === id);
        if (index !== -1) {
            masterData[index] = updatedRequest;
            this.saveToStorage(masterData);
            this.updateSubject(masterData);
        }
        return this.loadingService.wrap(of(void 0).pipe(delay(200)));
    }

    /** ลบคำขอ */
    deleteRequest(id: string): Observable<void> {
        let masterData = this.getMasterData();
        masterData = masterData.filter(r => r.id !== id);
        this.saveToStorage(masterData);
        this.updateSubject(masterData);
        return this.loadingService.wrap(of(void 0).pipe(delay(200)));
    }

    /** สร้างรหัสคำขอใหม่โดยอ้างอิงจากเลขลำดับล่าสุด */
    generateNextId(prefix: string = BUSINESS_CONFIG.DEFAULT_PREFIX): Observable<string> {
        const masterData = this.getMasterData();
        const lastIdNum = masterData.reduce((max, item) => {
            const parts = item.id.split('#');
            const numPart = parts.length > 1 ? parts[1] : item.id.replace(/[^0-9]/g, '');
            const num = parseInt(numPart || '0');
            return num > max ? num : max;
        }, 0);
        return of(`${prefix}#${(lastIdNum + 1).toString().padStart(3, '0')}`);
    }

    updateStatus(id: string, status: string): void {
        const masterData = this.getMasterData();
        const index = masterData.findIndex(r => r.id === id);
        if (index !== -1) {
            masterData[index].status = status;
            this.saveToStorage(masterData);
            this.updateSubject(masterData);
        }
    }

    refreshMockData(mockGenerator?: () => T[]) {
        const masterData = this.getMasterData();
        if (masterData.length === 0 && mockGenerator) {
            this.initializeData(mockGenerator);
        } else {
            this.updateSubject(masterData);
        }
    }
}
