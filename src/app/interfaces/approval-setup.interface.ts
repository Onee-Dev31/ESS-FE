export interface HrApproverEmp {
  empNo: string;
  empName: string;
  empNickName: string;
  empPost: string;
}

export interface ApprovalSetupRow {
  rowNo: number | null;
  workflowId: number | null;
  costCent: string;
  costCenterName: string;
  companyCode: string;
  companyName: string;
  secretaryEmpNo: string | null;
  secretaryEmpName: string | null;
  secretaryEmpNickName: string | null;
  secretaryPost: string | null;
  secretaryDept: string | null;
  approve1EmpNo: string | null;
  approve1EmpName: string | null;
  approve1EmpNickName: string | null;
  approve1Post: string | null;
  approve1Dept: string | null;
  approve1Type: string | null;
  approve2EmpNo: string | null;
  approve2EmpName: string | null;
  approve2EmpNickName: string | null;
  approve2Post: string | null;
  approve2Dept: string | null;
  hrApprovers: HrApproverEmp[];
  hrType: string | null;
  hrNickNames: string | null;
  itDirectorEmpNo: string | null;
  itDirectorEmpName: string | null;
  itDirectorEmpNickName: string | null;
  itDirectorPost: string | null;
  itDirectorDept: string | null;
  configMode: string | null;
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
