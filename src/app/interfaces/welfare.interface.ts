export interface CompanyWelfare {
  id: number;
  companyCode: string;
  companyShortName: string;
  companyNameTH: string;
  companyNameEN: string;
  welfareCode: string;
  welfareNameTH: string;
  welfareNameEN: string;
  welfareDescriptionTH: string;
  welfareDescriptionEN: string;
  sortOrder: number;
}

export interface CompanyWelfarePayload {
  companyCode: string;
  companyShortName: string;
  companyNameTH: string;
  companyNameEN: string | null;
  welfareCode: string;
  welfareNameTH: string;
  welfareNameEN: string;
  welfareDescriptionTH: string;
  welfareDescriptionEN: string;
  sortOrder: number;
  createdBy?: string;
  updatedBy?: string;
  createdDate?: string;
  updatedDate?: string;
}
