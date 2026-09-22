/** HR Welfare Responsibility mapping — backed by freelance-api's WelfareController
 * (GET/POST/DELETE api/welfare/responsibility -> dbo.HR_WelfareResponsibility table).
 * WelfareCodes/CompanyCodes are stored as CSV strings on the backend; the GET endpoint
 * parses them into arrays server-side, but POST expects CSV strings back. */

export interface HrWelfareResponsibility {
  id: number;
  hrCodeEmp: string;
  hrName: string;
  welfareCodes: string[];
  companyCodes: string[];
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

/** POST body item for api/welfare/responsibility.
 * id absent/0 = insert, id present = update. welfareCodes/companyCodes must be CSV
 * strings (e.g. "WF001,WF002") — sp_HR_WelfareResponsibility_Save reads them as plain
 * string columns, not JSON arrays. */
export interface SaveWelfareResponsibilityItem {
  id?: number | null;
  hrCodeEmp: string;
  hrName: string;
  welfareCodes: string;
  companyCodes: string;
  remark: string;
  executedBy: string;
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
