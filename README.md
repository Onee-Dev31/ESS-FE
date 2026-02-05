# ESS-FE (Employee Self Service Frontend)

Welcome to the **ESS-FE** project! This is the frontend application for the Employee Self Service system, built with **Angular (v21+)**, modern architectural patterns, and a focus on performance and maintainability.

---

## 🚀 Tech Stack & Key Libraries

This project utilizes a cutting-edge stack to ensure a premium user experience and developer productivity.

- **Framework**: [Angular v21](https://angular.dev/) (Standalone Components, Signals, Control Flow)
- **State Management**: Angular Signals (`signal`, `computed`, `effect`)
- **UI Components**:
  - **Icons**: `@ng-icons` (Heroicons, Bootstrap Icons, etc.)
  - **Calendar**: `@fullcalendar/angular`
  - **Data Tables**: `@tanstack/angular-table` (Headless UI logic)
  - **Charts/Export**: `jspdf`, `exceljs`, `html2canvas`
- **Utilities**: `dayjs` (Date manipulation), `date-holidays`
- **Testing**: `vitest` (Unit Testing), `cypress` (E2E Testing)

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm (v10+, project uses `npm@11.7.0`)

### Installation
```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
npm install
```

### Development Server
Run the app in development mode with HMR (Hot Module Replacement) enabled.
```bash
npm start
# OR
ng serve
```
Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

### 🏗️ Build
Build the project for production. The build artifacts will be stored in the `dist/` directory.
```bash
npm run build
```

### ✅ Testing
Run the unit test suite to verify system integrity.
```bash
npm test
```

---

## 📂 Project Architecture

The project follows a **Fractal / Domain-Driven Design (DDD)** inspired structure, emphasizing Separation of Concerns (SoC).

```text
src/app/
├── components/          # Reusable UI components
│   ├── features/        # Business-logic heavy components (Forms, Complex Widgets)
│   ├── layout/          # Main Layout, Loader, Wrappers
│   ├── modals/          # All modal dialogs (Approval Details, File Preview)
│   ├── navbar/          # Navigation Bar
│   ├── shared/          # Generic dumb components (Buttons, Skeleton, Inputs)
│   └── sidebar/         # Sidebar Navigation
├── config/              # Global configuration files (Menu, Constants)
├── constants/           # Static constant values (Storage Keys, API Endpoints)
├── guards/              # Route Guards (AuthGuard, RoleGuard)
├── interfaces/          # TypeScript Interfaces & Types
├── pages/               # Route Components (The "Screens" of the app)
│   ├── dashboard/       # Dashboard with Charts & Widgets
│   ├── approvals/       # Universal Approvals Page (Handles generic & medical)
│   └── ...
├── pipes/               # Data transformation pipes
├── services/            # Business Logic & API Communication
└── utils/               # Pure utility functions (Helpers)
```

### Key Architectural Decisions

#### 1. Standalone Components
Almost entire codebase uses **Standalone Components**. We do not use `NgModule`. This simplifies dependency injection and lazy loading.

#### 2. Signal-Based Reactivity
We prioritize **Signals** over `BehaviorSubject` for local state management.
- **Example**: `isLoading = signal(false)`, `total = computed(() => ...)`
- **Why?**: Signals provide finer-grained reactivity and better performance by reducing unnecessary change detection cycles.

#### 3. Listing Utilities (`listing.util.ts`)
To avoid repetitive boilerplate code for tables (Pagination, Search, Filtering), we use a shared utility `createListingState()` and `createListingComputeds()`.
- **Usage**: See `ApprovalsComponent` or `VehicleComponent`.

#### 4. Robust Loading States (`SkeletonComponent`)
We use a shared `<app-skeleton>` component to improve Perceived Performance.
- **Important**: In complex layouts like `DashboardComponent`, ensure `SkeletonComponent` is used within explicitly recognized control flow blocks (`@if`, `@else`) or is otherwise "visible" to compilation tools to avoid compilation warnings.

---

## 🧩 Key Feature Implementation Details

### Approvals Module (`/pages/approvals`)
The Approvals page is designed to be **Universal**. It handles both generic approvals (Leave, Taxi, Allowance) and specific ones (Medical Expenses) using the same component.
- **Routing**: The distinction is made via Route Data.
  - `path: 'approvals'` -> `{ category: 'all' }`
  - `path: 'approvals-medicalexpenses'` -> `{ category: 'medical' }`
- **Logic**: `ApprovalsComponent` reads this `category` from `ActivatedRoute.data` to filter data correctly via `ApprovalsHelperService`.

### Dashboard (`/pages/dashboard`)
The dashboard aggregates data from multiple services. It uses `@defer` and `@placeholder` blocks to load heavy widgets (like the Calendar) lazily, enhancing initial load speed.

---

## 📏 Coding Standards & Best Practices

1. **Naming Convention**:
   - Files: `kebab-case.ts` (e.g., `approval-detail-modal.ts`)
   - Classes: `PascalCase` (e.g., `ApprovalDetailModalComponent`)
   - Variables/Methods: `camelCase` (e.g., `getApprovalDetails()`)

2. **Control Flow**:
   - Always use the new Angular Control Flow syntax (`@if`, `@for`, `@switch`) instead of structural directives (`*ngIf`, `*ngFor`).

3. **CSS/SCSS**:
   - Use SCSS modules or component-scoped styles.
   - Avoid global style pollution unless adding utility classes to `styles.scss`.

4. **Git Workflow**:
   - Commit messages should be descriptive.
   - Run `npm test` before pushing to ensure no regressions.

---

## 🤝 Contribution

If you are the next developer picking up this project:
1. **Check `task.md` (if available)**: It often contains the checklist of recent work.
2. **Review `walkthrough.md`**: For a quick catch-up on the latest implemented features.
3. **Run Tests**: Ensure the baseline is green before starting your work.

**Happy Coding! 🚀**
