# ESS-FE (Employee Self Service - Front End)

ระบบบริการตนเองสำหรับพนักงาน (Employee Self Service) พัฒนาด้วย **Angular 21**

## 🚀 Tech Stack

- **Framework:** [Angular v21](https://angular.dev/)
- **Styling:** SCSS (Sass)
- **Calendar:** [FullCalendar](https://fullcalendar.io/)
- **Date Handling:** [Day.js](https://day.js.org/) (พร้อม Thai Locale)
- **Icons:** [FontAwesome 6](https://fontawesome.com/)
- **State Management:** Angular Signals

## 🛠️ Getting Started

### Prerequisites
- Node.js (Latest LTS recommended)
- npm

### Installation

```bash
# Clone the repository
git clone <repository-url>

# Navigate to project directory
cd ESS-FE

# Install dependencies
npm install
```

### Development Server

```bash
npm start
# หรือ
ng serve
```
Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## 📂 Project Structure

```text
src/app/
├── components/          # Reusable UI components
│   ├── features/       # Feature-specific components (e.g., forms)
│   ├── modals/         # Modal dialogs
│   └── shared/         # Shared UI components (Pagination, etc.)
├── pages/              # Main route pages (Dashboard, Approvals, etc.)
├── services/           # Business logic and API communication
├── guards/             # Route guards (Auth, Role)
├── interfaces/         # TypeScript interfaces and types
├── constants/          # Static data and configuration
├── utils/              # Shared utility functions
└── styles/             # Global styles
    ├── _responsive-layout.scss  # Responsive mixins
    ├── _theme.scss              # Global variables
    ├── _utilities.scss          # Common utility classes
    └── _table-components.scss   # Standard table styles
```

## 💡 Key Architectural Patterns

### 1. Styling Strategy
โปรเจคนี้ใช้ **SCSS** ในการจัดการ Style ทั้งหมด
- **Global Styles**: ไฟล์ `_theme.scss` เก็บตัวแปรสีและค่าคงที่ต่างๆ, `_utilities.scss` สำหรับ utility classes (e.g. status badges), `_table-components.scss` สำหรับตารางมาตรฐาน
- **Component Styles**: ใช้ SCSS แยกตาม Component (Encapsulated)
- **Shared Components**: เช่น `PaginationComponent` จะมีไฟล์ SCSS ของตัวเอง (`pagination.scss`) เพื่อความเป็นระเบียบและลด global styles

### 2. Shared Utilities
เรามี Helper Classes เพื่อลดโค้ดที่ซ้ำซ้อนใน `src/app/utils/`:
- **TableSortHelper**: จัดการ Logic การ Sort ตารางทั้งหมด
    - `toggleSort(table, colId)`: สลับการจัดเรียง
    - `getSortIcon(table, colId)`: แสดงไอคอน Sort
    - `sortVehicleLikeData(...)`: ฟังก์ชัน Sort มาตรฐานสำหรับข้อมูลกลุ่ม Vehicle/Taxi

### 3. Service Layer
แยก Business Logic ออกจาก Component ให้ชัดเจน
- **AllowanceService**: คำนวณยอดเงินและชั่วโมง OT (ย้ายจาก Component มาลง Service)
- **DashboardService**: จัดการข้อมูลหน้ารวม และ Logic การนับจำนวน Pending ต่างๆ
- **BaseRequestService**: Abstract class หลักสำหรับ Request Service ทั่วไป

### 4. Mock Data System
ระบบใช้ Mock Data 100% ผ่าน Service และ `localStorage`
- **Mock Files**: อยู่ใน `src/app/mocks/` แยกตาม module
- **Data Persistence**: ข้อมูลจะถูกเก็บใน LocalStorage เพื่อจำลอง Database (กด Refresh ข้อมูลยังอยู่)
- **Hard Reset**: สามารถกดปุ่ม "Reset Data" ในหน้า Dashboard เพื่อล้างข้อมูลทั้งหมดได้

### 5. Status Management
ระบบจัดการสถานะแบ่งเป็น 2 ส่วน:
- **Backend/Logic**: ใช้ภาษาอังกฤษเป็นหลัก (e.g., `NEW`, `APPROVED`, `WAITING_CHECK`) เพื่อความเสถียรในการเขียนโค้ด
- **UI Display**: ใช้ **Thai Labels** ในการแสดงผลให้ user เห็น โดยผ่าน `StatusLabelPipe` หรือการ map ค่าคงที่จาก `REQUEST_STATUS_LABEL`

## 📝 CLI Commands

| Command | Description |
|---------|-------------|
| `ng generate component <name>` | สร้าง Component ใหม่ |
| `ng generate service <name>` | สร้าง Service ใหม่ |
| `ng build` | Build โปรเจคสำหรับ Production (output ที่ `dist/`) |
| `ng test` | รัน Unit Tests |

## 🤝 Contribution Guidelines
1. เช็ค Code ล่าสุดก่อนแก้เสมอ (`git pull`)
2. พยายามรักษา Clean Code และลบ unused imports
3. หากมีการแก้ไข Logic วันหยุด หรือการคำนวณวันลา ให้ตรวจสอบไฟล์ `DashboardService` และ `TimeOffForm`

---
**Maintained by Onee-Dev Team**
