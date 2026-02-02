import { UserProfile } from '../services/user.service';
import { USER_ROLES } from '../constants/user-roles.constant';

export class UserMock {
    static readonly ADMIN_PROFILE: UserProfile = {
        name: 'Admin User (Admin)',
        email: 'admin@onee.one',
        employeeId: 'OTD00001',
        department: '10801 - Management',
        company: 'OTV-บริษัท วัน สามสิบเอ็ด จำกัด',
        position: 'System Administrator',
        phone: '9001',
        floor: '15',
        itAssets: {
            account: 'admin',
            expireDate: '31-Dec-2026',
            laptop: 'MacBook Pro M3 Asset No. ADMIN001',
            pc: 'Dell Workstation Asset No. ADMIN002',
            monitor: 'Dell UltraSharp 32" Asset No. ADMIN003'
        }
    };

    static readonly MEMBER_PROFILE: UserProfile = {
        name: 'Rapeepan Pipatvejwong (Jola)',
        email: 'member@onee.one',
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

    static readonly PROFILE = UserMock.MEMBER_PROFILE;

    static readonly MOCK_USERS = [
        { username: 'admin', password: '123', name: 'Admin User', role: USER_ROLES.ADMIN, employeeId: 'OTD00001' },
        { username: 'member', password: '123', name: 'Member User', role: USER_ROLES.MEMBER, employeeId: 'OTD01054' }
    ];
}
