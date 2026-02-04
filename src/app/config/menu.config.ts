/**
 * @file Menu Config
 * @description Logic for Menu Config
 */

// Section: Logic
export interface MenuItem {
    name: string;
    icon: string;
    subItems?: { label: string; path: string }[];
}

export const SIDEBAR_MENU_ITEMS: MenuItem[] = [
    {
        name: 'Dashboards',
        icon: 'fa-home',
        subItems: [
            { label: 'Default', path: '/dashboard' },
            { label: 'CMS', path: '/dashboard/cms' },
        ]
    },
    {
        name: 'CMS',
        icon: 'fa-book',
        subItems: [
            { label: 'โพสต์ทั้งหมด', path: '/cms/posts' },
            { label: 'เพิ่มเนื้อหาใหม่', path: '/cms/new' }
        ]
    },
    {
        name: 'Widgets',
        icon: 'fa-chart-line',
        subItems: [
            { label: 'สถิติการใช้งาน', path: '/widgets/stats' },
            { label: 'กราฟภาพรวม', path: '/widgets/charts' }
        ]
    },
    {
        name: 'User',
        icon: 'fa-user',
        subItems: [
            { label: 'จัดการผู้ใช้งาน', path: '/users/list' },
            { label: 'บทบาทและสิทธิ์', path: '/users/roles' }
        ]
    },
    {
        name: 'Tables',
        icon: 'fa-table',
        subItems: [
            { label: 'ตารางข้อมูล', path: '/tables/data' }
        ]
    }
];