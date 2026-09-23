/** HR Welfare Responsibility mapping — backed by freelance-api's WelfareController
 * (GET/POST/DELETE api/welfare/responsibility -> dbo.HR_WelfareResponsibility table).
 * WelfareCodes is stored as a single CSV string on the backend, each token being a
 * "CompanyCode-WelfareCode" pair (e.g. "OTD-WF001"); the GET endpoint splits it into
 * an array server-side, but POST expects the CSV string back. There is no separate
 * CompanyCodes column — company is embedded in each WelfareCodes token. */

export interface HrWelfareResponsibility {
  id: number;
  hrCodeEmp: string;
  adUser: string;
  hrName: string;
  email: string;
  welfareCodes: string[];
  /** ชื่อไทยพร้อม prefix บริษัท คู่ตำแหน่งกับ welfareCodes เช่น "[OTD] ค่ารักษาพยาบาล" — มาจาก /search เท่านั้น */
  welfare?: string[];
  remark: string | null;
  createdBy: string;
  createdDate: string;
  updatedBy: string | null;
  updatedDate: string | null;
}

export interface GetWelfareResponsibilityResponse {
  success: boolean;
  data: HrWelfareResponsibility[];
}

/** Query params ของ GET api/welfare/responsibility/search — ไม่ใส่ตัวไหนเลย = คืนทุกคน */
export interface SearchWelfareResponsibilityParams {
  search?: string;
  hrCodeEmp?: string;
  welfareCode?: string;
  companyCode?: string;
}

/** POST body item for api/welfare/responsibility.
 * sp_HR_WelfareResponsibility_Save upserts by matching AdUser (then HrCodeEmp) — id is
 * ignored, so it's not sent. welfareCodes must be a CSV string of "CompanyCode-WelfareCode"
 * pairs (e.g. "OTD-WF001,OTD-WF002") — the SP reads it as a plain string column. */
export interface SaveWelfareResponsibilityItem {
  hrCodeEmp: string;
  adUser: string;
  hrName: string;
  welfareCodes: string;
  remark: string;
  createdBy: string;
}

export interface SaveWelfareResponsibilityResponse {
  success: boolean;
  message: string;
  totalRecords: number;
}

export interface HrWelfareFormValue {
  hrCodes: string[];
  welfareTypes: string[];
  companies: string[];
  note: string;
}
