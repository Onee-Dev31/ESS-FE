import { Injectable } from '@angular/core';
import { STORAGE_KEYS } from '../constants/storage.constants';

@Injectable({
    providedIn: 'root'
})
export class StorageService {

    // ─── Generic helpers ───────────────────────────────────────────────

    get<T>(key: string): T | null {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        try {
            return JSON.parse(raw) as T;
        } catch {
            return raw as unknown as T;
        }
    }

    set(key: string, value: unknown): void {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    }

    remove(key: string): void {
        localStorage.removeItem(key);
    }

    // ─── Typed accessors ───────────────────────────────────────────────

    getAllData<T = unknown>(): T | null {
        return this.get<T>(STORAGE_KEYS.ALL_DATA);
    }

    setAllData(value: unknown): void {
        this.set(STORAGE_KEYS.ALL_DATA, value);
    }

    getUserData<T = unknown>(): T | null {
        return this.get<T>(STORAGE_KEYS.USER_DATA);
    }

    setUserData(value: unknown): void {
        this.set(STORAGE_KEYS.USER_DATA, value);
    }

    getUserRole(): string | null {
        return localStorage.getItem(STORAGE_KEYS.USER_ROLE);
    }

    setUserRole(role: string): void {
        localStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
    }

    getEmployeeId(): string | null {
        return localStorage.getItem(STORAGE_KEYS.EMPLOYEE_ID);
    }

    setEmployeeId(id: string): void {
        localStorage.setItem(STORAGE_KEYS.EMPLOYEE_ID, id);
    }

    isLoggedIn(): boolean {
        return localStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN) === 'true';
    }

    setLoggedIn(value: boolean): void {
        localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, String(value));
    }

    getCurrentUser(): string | null {
        return localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    }

    setCurrentUser(user: string): void {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, user);
    }

    clearSession(): void {
        this.remove(STORAGE_KEYS.IS_LOGGED_IN);
        this.remove(STORAGE_KEYS.CURRENT_USER);
        this.remove(STORAGE_KEYS.USER_ROLE);
        this.remove(STORAGE_KEYS.EMPLOYEE_ID);
        this.remove(STORAGE_KEYS.ALL_DATA);
        this.remove(STORAGE_KEYS.USER_DATA);
    }
}
