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
│   └── navbar/         # Navigation components
├── pages/              # Main route pages (Dashboard, Approvals, etc.)
├── services/           # Business logic and API communication
├── guards/             # Route guards (Auth, Role)
├── interfaces/         # TypeScript interfaces and types
├── constants/          # Static data and configuration
└── styles/             # Global styles
    ├── _responsive-layout.scss  # Responsive mixins
    └── _theme.scss              # Global variables
```

## 💡 Key Architectural Patterns

### 1. Styling Strategy
โปรเจคนี้ใช้ **SCSS** ในการจัดการ Style ทั้งหมด
- **Global Styles**: ไฟล์ `_theme.scss` เก็บตัวแปรสีและค่าคงที่ต่างๆ, `_responsive-layout.scss` เก็บ Mixins สำหรับ Responsive Design
- **Component Styles**: ใช้ SCSS แยกตาม Component (Encapsulated)
- **Grid Layout**: ใช้ CSS Grid และ Flexbox เป็นหลักใน `dashboard.scss` และ layout อื่นๆ

### 2. Date & Time Handling
เราใช้ **Day.js** แทน Moment.js หรือ Date Object ปกติเพื่อความเบาและง่ายต่อการจัดการ
- Locale: ตั้งค่าเป็น `th` (ไทย) เป็น global default
- Holidays: ใช้ library `date-holidays` ในการดึงวันหยุดไทยอัตโนมัติ (ดูตัวอย่างใน `DashboardService`)

### 3. Service Layer
แยก Business Logic ออกจาก Component ให้ชัดเจน
- **DashboardService**: จัดการข้อมูลหน้ารวม และ Logic การนับจำนวน Pending ต่างๆ
- **ApprovalsHelperService**: ช่วยจัดการ Logic ที่ซับซ้อนในหน้าอนุมัติ
- **AuthService**: จัดการ User Role และ State การ Login (Mock data)

### 4. Status Management
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
