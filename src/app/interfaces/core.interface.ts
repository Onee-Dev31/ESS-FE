export interface Requester {
    name: string;
    employeeId: string;
    department: string;
    company: string;
}

export interface RequestBase {
    id: string;
    createDate: string;
    status: string;
    requester?: Requester;
}
