/**
 * @file Listing Util
 * @description Logic for Listing Util
 */

// Section: Imports
import { signal, computed, WritableSignal, isSignal, Signal } from '@angular/core';

// Section: Logic
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
}
