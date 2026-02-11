export interface Employee {
    empCode: string;
    firstName: string;
    lastName: string;
    firstNameEng: string;
    lastNameEng: string;
    nickName: string;
    department: string;
    company: string;
    type: 'FullTime' | 'Freelance' | 'Contract';
    adUser?: string;
};