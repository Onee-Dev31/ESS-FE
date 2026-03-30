import { Requester } from './core.interface';

export interface TaxiItem {
    date: string;
    description: string;
    destination: string;
    distance: number;
    amount: number;
    shiftCode?: string;
    attachedFile?: string | null;
}

export interface ExistingAttachment {
    attachmentId?: number;
    fileName: string;
    fileUrl?: string;
    filePath?: string;
    fileType?: string;
    fileSize?: number;
}

export interface TaxiLogItem extends TaxiItem {
    selected: boolean;
    checkIn?: string;
    checkOut?: string;
    dayType?: string;
    remainingAmount: number;
    usedAmount?: number;
    locationFromId?: number;
    locationToId?: number;
    otherFrom?: string;
    otherTo?: string;
    filesToUpload: File[];
    amountError?: string | null;

    // ==================== Edit Mode ====================
    existingAttachments: ExistingAttachment[];
    // ===================================================
}

export interface TaxiLocation {
    location_id: number;
    location_name: string;
    is_office: boolean;
    description: string;
}

export interface TaxiRequest {
    id: string;
    typeId: number;
    createDate: string;
    status: string;
    items: TaxiItem[];
    requester?: Requester;
    voucherNo?: string;
    totalAmount?: number;
}