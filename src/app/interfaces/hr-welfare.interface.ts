/** Mock-only interfaces for the HR Welfare responsible-person mapping page.
 * TODO: align with real backend contract once the API is ready. */

export interface HrWelfareResponsible {
  id: number;
  hrCode: string;
  hrName: string;
  welfareTypes: string[];
  companies: string[];
  note: string;
}

export interface HrWelfareFormValue {
  hrCodes: string[];
  welfareTypes: string[];
  companies: string[];
  note: string;
}
