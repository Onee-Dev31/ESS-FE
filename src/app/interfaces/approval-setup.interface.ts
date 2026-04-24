export interface Approve3Emp {
  empNo: string;
  empName: string;
}

export interface ApprovalSetupRow {
  costCent: string;
  costCenterName: string;
  companyCode: string;
  approve1EmpNo: string | null;
  approve1EmpName: string | null;
  approve2EmpNo: string | null;
  approve2EmpName: string | null;
  approve3Emps: Approve3Emp[];
  approve4EmpNo: string | null;
  approve4EmpName: string | null;
  isSkipApprove1: boolean;
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
  activeFlag: boolean;
}
