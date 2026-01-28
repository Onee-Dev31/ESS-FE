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

    private requestsMock: TimeOffRequest[] = TimeOffMock.generateRequests(5);
    private requestsSubject = new BehaviorSubject<TimeOffRequest[]>(this.requestsMock);

    constructor() { }

    getRequests(): Observable<TimeOffRequest[]> {
        return this.requestsSubject.asObservable().pipe(delay(200));
    }

    addRequest(request: TimeOffRequest): Observable<void> {
        this.requestsMock = [request, ...this.requestsMock];
        this.requestsSubject.next(this.requestsMock);
        return of(void 0).pipe(delay(300));
    }
}
