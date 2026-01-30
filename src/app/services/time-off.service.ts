import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject, delay } from 'rxjs';
import { TimeOffRequest } from '../interfaces';
import { TimeOffMock } from '../mocks';

export type { TimeOffRequest };

@Injectable({
    providedIn: 'root'
})
export class TimeOffService {
    private http = inject(HttpClient);

    private readonly STORAGE_KEY = 'MOCK_ADDED_TIMEOFF';

    private requestsMock!: TimeOffRequest[];
    private requestsSubject!: BehaviorSubject<TimeOffRequest[]>;

    constructor() {
        this.refreshMockData();
    }

    private generateMockData(count: number): TimeOffRequest[] {
        const role = localStorage.getItem('userRole') as 'Admin' | 'Member' || 'Member';
        return TimeOffMock.generateRequestsByRole(count, role);
    }

    refreshMockData() {
        const role = localStorage.getItem('userRole') as 'Admin' | 'Member' || 'Member';
        const generatedMocks = TimeOffMock.generateRequestsByRole(15, role); // Regenerate with 15 items
        const addedRequests = this.getAddedRequestsFromStorage();

        this.requestsMock = [...addedRequests, ...generatedMocks];

        if (this.requestsSubject) {
            this.requestsSubject.next(this.requestsMock);
        } else {
            this.requestsSubject = new BehaviorSubject<TimeOffRequest[]>(this.requestsMock);
        }
    }

    private getAddedRequestsFromStorage(): TimeOffRequest[] {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    }

    getRequests(): Observable<TimeOffRequest[]> {
        return this.requestsSubject.asObservable().pipe(delay(200));
    }

    getRequestById(id: string): Observable<TimeOffRequest | undefined> {
        const req = this.requestsMock.find(r => r.id === id);
        return of(req).pipe(delay(200));
    }

    addRequest(request: TimeOffRequest): Observable<void> {
        const addedRequests = this.getAddedRequestsFromStorage();
        addedRequests.unshift(request);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(addedRequests));

        this.requestsMock = [request, ...this.requestsMock];
        this.requestsSubject.next(this.requestsMock);
        return of(void 0).pipe(delay(400));
    }

    updateRequest(id: string, updatedRequest: TimeOffRequest): Observable<void> {
        const addedRequests = this.getAddedRequestsFromStorage();
        const index = addedRequests.findIndex(r => r.id === id);
        if (index !== -1) {
            addedRequests[index] = updatedRequest;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(addedRequests));
        }

        this.requestsMock = this.requestsMock.map(r => r.id === id ? updatedRequest : r);
        this.requestsSubject.next(this.requestsMock);
        return of(void 0).pipe(delay(400));
    }
}
