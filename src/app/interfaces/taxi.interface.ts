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

/** Raw detail contract returned by GET /taxi-claim/claims. */
export interface TaxiClaimDetailResponse {
  detail_id: number;
  work_date: string;
  day_type: string | null;
  shift_code: string | null;
  time_in: string | null;
  time_out: string | null;
  description?: string | null;
  location_from_id?: number | null;
  location_to_id?: number | null;
  other_from?: string | null;
  other_to?: string | null;
  rate_amount?: number | null;
  used_amount?: number | null;
  remaining_amount?: number | null;
  daily_limit?: number | null;
  attachments?: string[] | null;
}

/** Normalized claim detail used by the View/Edit form. */
export interface TaxiClaimDetail {
  detailId: number;
  workDate: string;
  dayType: string | null;
  shiftCode: string | null;
  timeIn: string | null;
  timeOut: string | null;
  description: string;
  locationFromId?: number;
  locationToId?: number;
  otherFrom: string;
  otherTo: string;
  rateAmount: number;
  usedAmount: number;
  remainingAmount: number;
  dailyLimit: number;
  attachments: string[];
}

export function mapTaxiClaimDetail(detail: TaxiClaimDetailResponse): TaxiClaimDetail {
  return {
    detailId: detail.detail_id,
    workDate: detail.work_date,
    dayType: detail.day_type,
    shiftCode: detail.shift_code,
    timeIn: detail.time_in,
    timeOut: detail.time_out,
    description: detail.description ?? '',
    locationFromId: detail.location_from_id ?? undefined,
    locationToId: detail.location_to_id ?? undefined,
    otherFrom: detail.other_from ?? '',
    otherTo: detail.other_to ?? '',
    rateAmount: Number(detail.rate_amount ?? 0),
    usedAmount: Number(detail.used_amount ?? 0),
    remainingAmount: Number(detail.remaining_amount ?? 0),
    dailyLimit: Number(detail.daily_limit ?? 0),
    attachments: detail.attachments ?? [],
  };
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
