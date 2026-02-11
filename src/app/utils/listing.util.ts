/** Utility สำหรับจัดการข้อมูลรายการ (Listing) เช่น Pagination, Filtering, และ Sorting */
import { signal, computed, WritableSignal, isSignal, Signal } from '@angular/core';

/** Interface สำหรับเก็บสถานะของรายการ */
export interface ListingState {
    currentPage: WritableSignal<number>;
    pageSize: WritableSignal<number>;
    filterStatus: WritableSignal<string>;
    filterStartDate: WritableSignal<string>;
    filterEndDate: WritableSignal<string>;
    searchText: WritableSignal<string>;
}

/** สร้าง State เริ่มต้นของรายการ */
export function createListingState(initialPageSize = 10): ListingState {
    return {
        currentPage: signal(0),
        pageSize: signal(initialPageSize),
        filterStatus: signal(''),
        filterStartDate: signal(''),
        filterEndDate: signal(''),
        searchText: signal('')
    };
}

/** สร้าง Computed Signals สำหรับข้อมูลที่กรองและแบ่งหน้าแล้ว */
export function createListingComputeds<T>(
    data: Signal<T[]> | (() => T[]),
    state: ListingState,
    filterFn?: (item: T, search: string, status: string, start: string, end: string) => boolean
) {
    const sourceData: () => T[] = isSignal(data) ? data : (data as () => T[]);

    const filteredData = computed<T[]>(() => {
        let list = sourceData();
        const search = state.searchText().toLowerCase();
        const status = state.filterStatus();
        const start = state.filterStartDate();
        const end = state.filterEndDate();

        if (filterFn) {
            list = list.filter((item: T) => filterFn(item, search, status, start, end));
        }

        return list;
    });

    const totalItems = computed(() => filteredData().length);
    const totalPages = computed(() => Math.ceil(totalItems() / state.pageSize()) || 1);

    const paginatedData = computed<T[]>(() => {
        const start = state.currentPage() * state.pageSize();
        const end = start + state.pageSize();
        return filteredData().slice(start, end);
    });

    const canPreviousPage = computed(() => state.currentPage() > 0);
    const canNextPage = computed(() => state.currentPage() < totalPages() - 1);

    return {
        filteredData,
        totalItems,
        totalPages,
        paginatedData,
        canPreviousPage,
        canNextPage
    };
}

/** ล้างค่า Filters ทั้งหมด */
export function clearListingFilters(state: ListingState) {
    state.filterStatus.set('');
    state.filterStartDate.set('');
    state.filterEndDate.set('');
    state.searchText.set('');
    state.currentPage.set(0);
}

/** Helper methods สำหรับจัดการการคำนวณและกรองข้อมูล */
export class ListingUtil {

    static calculateTotalPages(totalItems: number, pageSize: number): number {
        return Math.ceil(totalItems / pageSize);
    }

    static paginateData<T>(data: T[], currentPage: number, pageSize: number): T[] {
        const startIndex = (currentPage - 1) * pageSize;
        return data.slice(startIndex, startIndex + pageSize);
    }

    static getPageNumbers(currentPage: number, totalPages: number): number[] {
        const pages: number[] = [];
        const maxPagesToShow = 5;

        if (totalPages <= maxPagesToShow) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 5; i++) pages.push(i);
            } else if (currentPage >= totalPages - 2) {
                for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
            } else {
                for (let i = currentPage - 2; i <= currentPage + 2; i++) pages.push(i);
            }
        }
        return pages;
    }

    static filterData<T>(data: T[], searchText: string, fields: (keyof T)[]): T[] {
        if (!searchText) return data;

        const lowerSearch = searchText.toLowerCase();
        return data.filter(item =>
            fields.some(field => {
                const value = item[field];
                return String(value).toLowerCase().includes(lowerSearch);
            })
        );
    }

    static toggleSort<T>(table: any, columnId: string) {
        if (table.sortColumn() === columnId) {
            table.sortDirection.update((d: 'asc' | 'desc') => d === 'asc' ? 'desc' : 'asc');
        } else {
            table.sortColumn.set(columnId);
            table.sortDirection.set('asc');
        }
    }

    static getSortIcon(table: any, columnId: string) {
        if (table.sortColumn() !== columnId) return 'fa-sort text-muted';
        return table.sortDirection() === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
    }

    static sortData<T extends Record<string, any>>(
        data: T[],
        sortColumn: string,
        sortDirection: 'asc' | 'desc'
    ): T[] {
        if (!sortColumn) return data;

        return [...data].sort((a, b) => {
            if (sortColumn === 'totalAmount' && 'items' in (a as object)) {
                const itemsA = (a as any).items || [];
                const itemsB = (b as any).items || [];
                const sumA = itemsA.reduce((s: number, i: any) => s + (i.amount || 0), 0);
                const sumB = itemsB.reduce((s: number, i: any) => s + (i.amount || 0), 0);
                return sortDirection === 'asc' ? sumA - sumB : sumB - sumA;
            }

            const valA = a[sortColumn];
            const valB = b[sortColumn];

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }
}

/** Helper สำหรับการจัดการ Sort ของ TanStack Table หรือตารางทั่วไป */
export class TableSortHelper {
    static toggleSort(table: any, columnId: string) {
        const column = table.getColumn(columnId);
        if (column) column.toggleSorting(column.getIsSorted() === 'asc');
    }

    static getSortIcon(table: any, columnId: string) {
        const isSorted = table.getColumn(columnId)?.getIsSorted();
        return {
            'fa-sort-amount-up': isSorted === 'asc',
            'fa-sort-amount-down-alt': isSorted === 'desc',
            'fa-sort': !isSorted,
            'text-muted': !isSorted,
        };
    }

    static sortVehicleLikeData<T extends { id?: string, requestId?: string, createDate?: string, status?: string, items?: any[] }>(
        data: T[],
        sortId: string,
        sortDesc: boolean,
        keyMap: { id?: string, createDate?: string, status?: string, amount?: string, desc?: string, date?: string, destination?: string } = {}
    ) {
        const direction = sortDesc ? -1 : 1;
        return [...data].sort((a, b) => {

            if (sortId === (keyMap.id || 'id') || sortId === 'requestId') {
                const idA = a.id || a.requestId || '';
                const idB = b.id || b.requestId || '';
                return idA.localeCompare(idB) * direction;
            }

            if (sortId === (keyMap.createDate || 'createDate')) {
                return (a.createDate || '').localeCompare(b.createDate || '') * direction;
            }

            if (sortId === (keyMap.status || 'status')) {
                return (a.status || '').localeCompare(b.status || '') * direction;
            }

            if (sortId === (keyMap.amount || 'amount')) {
                const itemsA = a.items || [];
                const itemsB = b.items || [];
                const sumA = itemsA.reduce((s: number, i: any) => s + (i.amount || 0), 0);
                const sumB = itemsB.reduce((s: number, i: any) => s + (i.amount || 0), 0);
                return (sumA - sumB) * direction;
            }

            if (sortId === (keyMap.desc || 'description')) {
                const itemsA = a.items || [];
                const itemsB = b.items || [];
                const descA = itemsA[0]?.description || '';
                const descB = itemsB[0]?.description || '';
                return descA.localeCompare(descB) * direction;
            }

            if (sortId === (keyMap.date || 'date')) {
                const itemsA = a.items || [];
                const itemsB = b.items || [];
                const dateA = itemsA[0]?.date || '';
                const dateB = itemsB[0]?.date || '';
                return dateA.localeCompare(dateB) * direction;
            }

            if (sortId === (keyMap.destination || 'destination')) {
                const itemsA = a.items || [];
                const itemsB = b.items || [];
                const destA = itemsA[0]?.destination || '';
                const destB = itemsB[0]?.destination || '';
                return destA.localeCompare(destB) * direction;
            }
            return 0;
        });
    }
}
