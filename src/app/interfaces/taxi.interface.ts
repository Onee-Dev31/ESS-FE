import { Requester } from './core.interface';

export interface TaxiItem {
  date: string;
  description: string;
  locationFrom?: string;
  locationTo?: string;
  destination: string;
  distance: number;
  amount: number;
  shiftCode?: string;
  attachedFile?: string | null;
}

export interface TaxiLogItem extends TaxiItem {
  /** Stable identity for rendering and attachment mapping. Never sent to the API. */
  clientId: string;
  /** Backend identity. Present only for details that already exist. */
  detailId?: number;
  attachedFileNames: string[];
  selected: boolean;
  checkIn?: string;
  checkOut?: string;
  dayType?: string;
  remainingAmount: number;
  usedAmount?: number;
  dailyLimit?: number;
  availableAmount?: number;
  isEligible?: boolean;
  locationFromId?: number;
  locationToId?: number;
  otherFrom?: string;
  otherTo?: string;
  fileToUpload?: File | null;
  amountError?: string | null;

  // ==================== เพิ่มสำหรับ Edit Mode ====================
  // existingFileUrl?: string;      // URL ของไฟล์เก่า
  // existingFileName?: string;     // ชื่อไฟล์เก่า (ใช้แสดงสถานะ)
  // ============================================================

  attachedFiles?: File[];
  existingFiles?: string[];
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
