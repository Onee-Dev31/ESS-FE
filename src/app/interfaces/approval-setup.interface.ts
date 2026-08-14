export interface HrApproverEmp {
  empNo: string;
  empName: string;
}

export interface ApprovalSetupRow {
  costCent: string;
  costCenterName: string;
  companyCode: string;
  companyName: string;
  secretaryEmpNo: string | null;
  secretaryEmpName: string | null;
  approve1EmpNo: string | null;
  approve1EmpName: string | null;
  approve2EmpNo: string | null;
  approve2EmpName: string | null;
  hrApprovers: HrApproverEmp[];
  itDirectorEmpNo: string | null;
  itDirectorEmpName: string | null;
  isSkipSecretary: boolean;
  modifiedDate: string | null;
  modifiedBy: string | null;
}

// หลัง group แล้ว
export interface ApprovalSetupGroup {
  companyCode: string;
  companyName: string;
  departments: ApprovalSetupRow[];
}

export interface ApprovalCategory {
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  skipApprover1: boolean;
  skipApprover2: boolean;
  skipApprover3: boolean;
  skipApprover4: boolean;
  skipApprover5: boolean;
  activeFlag: boolean;
}
