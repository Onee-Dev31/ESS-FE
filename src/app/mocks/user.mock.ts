import { UserProfile } from '../services/user.service';

export class UserMock {
    static readonly PROFILE: UserProfile = {
        name: 'Rapeepan Pipatvejwong (Jola)',
        email: 'praewnapa.boo@onee.one',
        employeeId: 'OTD01054',
        department: '11206 - Program Development',
        company: 'OTV-บริษัท วัน สามสิบเอ็ด จำกัด',
        position: 'Senior Developer',
        phone: '9409',
        floor: '15',
        itAssets: {
            account: 'praewnapaboo',
            expireDate: '16-Jul-2026',
            laptop: 'Dell 555 Asset No. 44545sf45dfd86',
            pc: 'Dell 888 Asset No. 415v489dfg7df/9',
            monitor: 'Dell 999 Asset No. 415v489dfg7df/9'
        }
    };
}
