import { signal, computed, WritableSignal, isSignal, Signal } from '@angular/core';

export interface ListingState {
    currentPage: WritableSignal<number>;
    pageSize: WritableSignal<number>;
    filterStatus: WritableSignal<string>;
    filterStartDate: WritableSignal<string>;
    filterEndDate: WritableSignal<string>;
    searchText: WritableSignal<string>;
}

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

export function clearListingFilters(state: ListingState) {
    state.filterStatus.set('');
    state.filterStartDate.set('');
    state.filterEndDate.set('');
    state.searchText.set('');
    state.currentPage.set(0);
}

export class ListingUtil {

    // Calculate total pages based on total items and page size
    static calculateTotalPages(totalItems: number, pageSize: number): number {
        return Math.ceil(totalItems / pageSize);
    }

    // Get current page data slice
    static paginateData<T>(data: T[], currentPage: number, pageSize: number): T[] {
        const startIndex = (currentPage - 1) * pageSize;
        return data.slice(startIndex, startIndex + pageSize);
    }

    // Generate page numbers array for pagination controls
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

    // Filter data based on search text and fields
    static filterData<T>(data: T[], searchText: string, fields: string[]): T[] {
        if (!searchText) return data;

        const lowerSearch = searchText.toLowerCase();
        return data.filter(item =>
            fields.some(field => {
                const value = (item as any)[field];
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

    static sortData<T>(
        data: T[],
        sortColumn: string,
        sortDirection: 'asc' | 'desc'
    ): T[] {
        if (!sortColumn) return data;

        return [...data].sort((a, b) => {
            // Check if we are sorting by totalAmount (for medical expenses logic)
            if (sortColumn === 'totalAmount' && 'items' in (a as object)) {
                const sumA = (a as any).items.reduce((s: number, i: any) => s + (i.amount || 0), 0);
                const sumB = (b as any).items.reduce((s: number, i: any) => s + (i.amount || 0), 0);
                return sortDirection === 'asc' ? sumA - sumB : sumB - sumA;
            }

            const valA = (a as any)[sortColumn];
            const valB = (b as any)[sortColumn];

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }
}

export class TableSortHelper {
    static toggleSort(table: any, columnId: string) {
        // Implementation for TanStack table or similar
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

    static sortVehicleLikeData(
        data: any[],
        sortId: string,
        sortDesc: boolean,
        keyMap: { id?: string, createDate?: string, status?: string, amount?: string, desc?: string, date?: string, destination?: string } = {}
    ) {
        const direction = sortDesc ? -1 : 1;
        return [...data].sort((a, b) => {

            if (sortId === (keyMap.id || 'id') || sortId === 'requestId') {
                return (a.id || a.requestId).localeCompare(b.id || b.requestId) * direction;
            }

            if (sortId === (keyMap.createDate || 'createDate')) {
                return a.createDate.localeCompare(b.createDate) * direction;
            }

            if (sortId === (keyMap.status || 'status')) {
                return a.status.localeCompare(b.status) * direction;
            }

            if (sortId === (keyMap.amount || 'amount')) {
                const sumA = a.items.reduce((s: number, i: any) => s + (i.amount || 0), 0);
                const sumB = b.items.reduce((s: number, i: any) => s + (i.amount || 0), 0);
                return (sumA - sumB) * direction;
            }

            if (sortId === (keyMap.desc || 'description')) {
                const descA = a.items[0]?.description || '';
                const descB = b.items[0]?.description || '';
                return descA.localeCompare(descB) * direction;
            }

            if (sortId === (keyMap.date || 'date')) {
                const dateA = a.items[0]?.date || '';
                const dateB = b.items[0]?.date || '';
                return dateA.localeCompare(dateB) * direction;
            }

            if (sortId === (keyMap.destination || 'destination')) {
                const destA = a.items[0]?.destination || '';
                const destB = b.items[0]?.destination || '';
                return destA.localeCompare(destB) * direction;
            }
            return 0;
        });
    }
}
