export interface Employee {
  id?: string;
  empCode: string;
  firstNameTh: string;
  lastNameTh: string;
  firstNameEng: string;
  lastNameEng: string;
  nickName: string;
  department: string;
  company: string;
  type: 'FullTime' | 'Freelance' | 'Contract';
  adUser?: string;
  position: string;
  lastDate?: string;
  effectiveDate?: string;
}
