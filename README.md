# ESS-FE (Employee Self Service) 🏢✨

> **The Next-Gen Employee Self Service Portal** built with **Angular 21** and **Extreme Clean Code** principles.

![Angular](https://img.shields.io/badge/Angular-v21-dd0031.svg?style=flat-square&logo=angular)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178c6.svg?style=flat-square&logo=typescript)
![SCSS](https://img.shields.io/badge/Style-SCSS-cc6699.svg?style=flat-square&logo=sass)
![Code Quality](https://img.shields.io/badge/Code%20Quality-A++-success.svg?style=flat-square)

---

## 🌟 Introduction

**ESS-FE** is the frontend application for the Employee Self Service system of Onee. It allows employees to manage their work-life needs, including:
- 📅 **Time Off**: Request leave and view holidays.
- � **Transport**: Vehicle and Taxi reimbursement requests.
- 💊 **Medical**: Medical expense claims.
- 💰 **Allowance**: Per diem and accommodation requests.
- 📊 **Dashboard**: Real-time overview of quotas and status.

---

## ✨ Extreme Clean Code Standards

We adhere to a **Structure & Discipline First** philosophy. All contributors must follow these strict rules:

### 1. 🚫 NO `any` Policy
We have eliminated `any` usage in core modules. **Strict Typing** is mandatory.
- **Bad:** `logs: any[] = []`
- **Good:** `logs: VehicleLogItem[] = []`

### 2. 🛡️ Strict Interface Inheritance
We use TypeScript's power to ensure data consistency across Services, Mocks, and Components.

```typescript
// Core Interface (Single Source of Truth)
export interface AttendanceLog {
  date: string;
  timeIn: string;
  timeOut: string;
}

// Component View Model (Extends Core)
interface VehicleLogItem extends AttendanceLog {
  amount: number; // Extended property specific to this view
  selected: boolean;
}
```

### 3. 🎨 Modular SCSS Architecture
We don't do "global soup". Styles are highly modular and component-scoped, but use shared mixins for consistency.

- `src/styles/_theme.scss`: Global variables (Colors, Fonts).
- `src/styles/_mixins.scss`: Reusable mixins (e.g., `flex-center`, `card-shadow`).
- `src/styles/_layout-structure.scss`: Standard structural classes (`.content-card`, `.top-header-strip`).
- `src/styles/_form-elements.scss`: Standardized form inputs and buttons (Legacy styles refactored).

---

## 🏗️ Architecture

### 📂 Folder Structure

```text
src/app/
├── components/
│   ├── features/       # Feature-rich Smart Components (Forms)
│   ├── modals/         # Reusable Dialogs
│   └── shared/         # Dumb Components (Pagination, Cards)
├── interfaces/         # 🧠 The Brain: All Type Definitions
├── services/           # ⚙️ The Engine: Business Logic & API
├── mocks/              # 🧪 The Data: Strong-typed Mock Generators
└── styles/             # 🎨 The Skin: Global SCSS & Mixins
```

### 🧠 Service Layer Pattern
Services are responsible for **Data Transformation** and **Type Safety**. Components should receive *ready-to-use* data.

- **BaseRequestService<T>**: Generic Abstract Class handling CRUD operations (Get, GetById, Add, Update).
- **Mock Integration**: Services simulate network latency (`delay(100)`) and return `Observable<T>`, ensuring the UI is async-ready.

## 🔄 Application Flow

### 1. 🔑 Login & Authentication
- User logs in via `LoginComponent`.
- Token is verified. Roles (`Admin` vs `User`) are assigned.
- **Guard Protection**: `AuthGuard` protects all internal routes.

### 2. 📊 Dashboard (Landing)
- Central hub showing:
  - **Attendance Stats**: Leave balance, Late count.
  - **Performance**: Yearly grading.
  - **Pending Actions**: Admin sees a "Bell" icon if there are requests to approve.

### 3. 📝 Request Submission (Employee)
- User selects a module (e.g., `Vehicle`, `Medical`, `Time Off`).
- **Smart Forms**:
  - Forms auto-calculate totals (e.g., specific shifts trigger OT).
  - Validations run in real-time.
- **Submission**: Data is sent to Service -> Mapped to Interface -> Stored in LocalStorage (Mock DB).

### 4. ✅ Approval Process (Manager/Admin)
- Admin navigates to **Approvals Page**.
- **Unified View**: Can see *all* request types in one table (Polymorphic UI).
- Actions: `Approve`, `Reject`, or `Send Back`.
- Status updates immediately reflect on the Employee's dashboard.

---



## 🚀 Features & Logic

### 1. 🚗 Vehicle & Transport
- **Automatic Calculation**: Logic calculates reimbursement based on `timeIn`/`timeOut` (Before 06:00 or After 22:00).
- **Linked Data**: `VehicleLogItem` is strictly mapped to `AttendanceLog`.

### 2. 🚕 Taxi
- **Strict Evidence**: Requires explicit checking of `attachedFile`, `distance`, and `amount`.
- **Validation**: Strict validation rules in `TaxiService` before submission.

### 3. 🛡️ Approvals
- **Union Types**: The `ApprovalsHelperService` handles multiple request types using Union Types:
  ```typescript
  type RequestType = AllowanceRequest | TaxiRequest | VehicleRequest;
  ```
  This ensures the Approval Dashboard can display any request type without losing type safety.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (Latest LTS)
- npm

### Installation

```bash
git clone <repository-url>
cd ESS-FE
npm install
```

### Development

```bash
# Start Dev Server
ng serve

# Build for Production
ng build --watch=false
```

### 🧪 Verification
Before pushing, run the build to ensure strict mode compliance:
```bash
ng build
```

---

## 🤝 Contribution Guide

1.  **Strict Types Only**: Do not use `any`. Define an Interface in `src/app/interfaces/`.
2.  **SCSS Modules**: If adding a new feature, use a dedicated `.scss` file and imports standard mixins.
3.  **Mock First**: Update `src/app/mocks/` with typed mock data before implementing logic.

---

**Maintained by Onee-Dev Team** ❤️ Code Quality
