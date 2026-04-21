# ESS-FE (Employee Self Service Frontend)

[![Angular](https://img.shields.io/badge/Angular-21+-DD0031.svg?style=for-the-badge&logo=angular)](https://angular.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Status](https://img.shields.io/badge/Status-Premium_Ready-success.svg?style=for-the-badge)](https://github.com/Onee-Dev31/ESS-FE)

**ESS-FE** คือระบบ Employee Self Service (Frontend) เวอร์ชันปรับปรุงใหม่ที่เน้นความทันสมัย ลื่นไหล และความปลอดภัยระดับองค์กร พัฒนาด้วย **Angular 21** และ **Signal-based Reactivity**

---

## 🇹🇭 สรุปภาพรวมโครงการ (Project Summary)

โปรเจกต์นี้เป็นการปรับโฉมระบบบริการตนเองของพนักงาน (ESS) ให้มีความเป็น **Premium Dashboard** มากยิ่งขึ้น โดยมีการปรับปรุงหลักดังนี้:

- **Modern UI/UX**: ปรับปรุงหน้าจอ Dashboard, รายการลา, และการเบิกสวัสดิการต่างๆ ให้มีความสะอาดตาและใช้งานง่าย
- **Quick Navigation**: ระบบค้นหาเมนูทางลัดที่ช่วยให้เข้าถึงหน้างานที่ต้องการได้ภายในไม่กี่วินาที
- **Standardized Tables**: ระบบตารางข้อมูลที่รองรับการเรียงลำดับ การกรอง และการแสดงผลที่เป็นมาตรฐานเดียวกันทุกหน้า
- **Role-Based Filtering**: ระบบความปลอดภัยที่กรองเมนูและข้อมูลตามบทบาทของผู้ใช้งาน (เช่น Member จะไม่เห็นเมนูการอนุมัติ)

---

## �️ Developer Guide: การนำ Pattern ไปใช้งานใหม่ (Copy & Reuse)

หากต้องการเพิ่มระบบเบิกใหม่ (เช่น "เบิกอุปกรณ์ไอที") แนะนำให้ใช้ "Copy Logic" จากหน้า `Vehicle` หรือ `Allowance` ตามขั้นตอนดังนี้:

### 1. **Create Service** (ต่อยอดจาก `BaseRequestService`)

สร้าง Service ใหม่โดย `extends BaseRequestService<T>`. ระบบจะจัดการเรื่อง Loading, Mock Data และ CRUD สิทธิการเข้าถึงให้โดยอัตโนมัติ

### 2. **Setup Component** (ใช้ `listing.util.ts`)

ในตัว Component ให้ใช้ `createListingState()` และ `createListingComputeds()` เพื่อจัดการ Pagination และ Search โดยไม่ต้องเขียน Logic ซ้ำ

### 3. **Standardized HTML Table** (โครงสร้างตารางมาตรฐาน)

เพื่อให้ Hover และสไตล์ตารางออกมาเนี๊ยบเหมือนหน้าอื่นๆ ให้ใช้โครงสร้างที่มี `<tbody>` แยกตามรายแถว (per row) ดังนี้:

```html
<table class="modern-table">
  <thead>
    ...
  </thead>
  <!-- หัวใจสำคัญคือการใช้ *ngFor ที่ tbody เพื่อให้ Hover ติดทั้งกลุ่มข้อมูล -->
  <tbody *ngFor="let item of data">
    <tr>
      ...
    </tr>
  </tbody>
</table>
```

### 4. **Register for Quick-Search**

อย่าลืมนำลิงก์ใหม่ไปเพิ่มใน `NavbarComponent` (ส่วน `allMenuItems`) เพื่อให้สามารถค้นหาหน้าใหม่นี้เจอผ่านระบบ Quick-Search

---

## �🚀 Recent Enhancements (การอัปเดตล่าสุด)

### 1. **Navbar Quick-Search Menu**

ระบบค้นหาอัจฉริยะที่มุมขวาบนของ Navbar:

- รองรับการค้นหาเมนูด้วยคีย์เวิร์ด (เช่น "เบิก", "ลา", "Approval")
- แสดงผลลัพธ์เป็น Dropdown พร้อมไอคอนและหมวดหมู่
- กรองผลลัพธ์ตามสิทธิ์การเข้าถึง (Role-Based)

### 2. **UI Standardization Polish**

ปรับปรุงพื้นฐาน UI ให้มีความสม่ำเสมอทั่วทั้งระบบ:

- **Request ID Styling**: ใช้ตัวหนาสีน้ำเงิน (#1a73e8) สำหรับเลขที่เอกสารทุกหน้า
- **Standard Table Actions**: เพิ่มปุ่ม Edit/Delete ในตาราง Medical Expenses และ Allowance ให้เป็นมาตรฐานเดียวกัน
- **Pagination**: ปรับปรุงการวางตำแหน่งและ Style ของ Pagination ให้ตรงกันทุกหน้า

---

## 🛠️ Tech Stack & Key Libraries

- **Framework**: [Angular v21](https://angular.dev/) (Standalone Components, Signals, Control Flow)
- **State Management**: Angular Signals (Fine-grained reactivity)
- **Data Handling**: `@tanstack/angular-table` for robust headless table logic
- **UI & Icons**: FontAwesome 7 & `@ng-icons`
- **Charts & Export**: Combined use of `jspdf`, `exceljs`, and `html2canvas` for hi-res reporting

---

## 📂 Project Architecture

โครงสร้างโปรเจกต์เน้นความยืดหยุ่นและการแยกส่วนชัดเจน (Separation of Concerns):

```text
src/app/
├── components/          # Reusable UI components
│   ├── features/        # Business-logic heavy (Forms, Search Logic)
│   ├── layout/          # Page Wrappers & Page Headers
│   ├── modals/          # Complex Dialogs (Approval Detail, File Preview)
│   └── shared/          # Generic items (Button, Pagination, Skeleton)
├── pages/               # Primary Route Components (Screens)
│   ├── dashboard/       # Main overview with lazily loaded widgets
│   ├── approvals/       # Universal Approval handling system
│   └── ...medicalexpenses, allowance, vehicle, timeoff
├── services/            # BaseRequestService and domain-specific services
└── utils/               # Listing utilities and data helpers
```

---

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18+)
- npm (v10+), This project uses `npm@11.7.0`

### Installation

```bash
npm install
```

### Execution

```bash
# Development server
npm start # runs `ng serve`
```

---

## 📏 Coding Standards

1. **Standalone First**: ทุก Component เป็น Standalone ไม่ต้องประกาศใน Module
2. **Signals Only**: ใช้ Signal แทน RxJS BehaviorSubject ในส่วนที่เป็น UI State
3. **Control Flow**: ใช้ `@if`, `@for`, `@switch` แทน `*ngIf`, `*ngFor`
4. **Kebab-Case**: ชื่อไฟล์ต้องเป็น kebab-case เสมอ เพื่อความสอดคล้องกับ Angular conventions

---
