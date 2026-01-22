# ESS-FE Copilot Instructions

## Overview
This is an Angular 21 standalone application for Employee Self-Service (ESS), featuring login, dashboard, vehicle/allowance requests, and approvals. It uses mock data with localStorage for authentication.

## Architecture
- **Standalone Components**: All components are standalone with explicit imports (e.g., `imports: [CommonModule, FormsModule]` in [allowance-form.ts](src/app/components/features/allowance-form/allowance-form.ts)).
- **Routing**: Nested routes under `LayoutComponent` for authenticated pages; login redirects to dashboard (see [app.routes.ts](src/app/app.routes.ts)).
- **Services**: Injectable services for data (e.g., `AuthService` uses localStorage; [auth.service.ts](src/app/services/auth.service.ts)).
- **State Management**: No global state library; services hold observables for async data (e.g., `userProfile$` in [dashboard.ts](src/app/pages/dashboard/dashboard.ts)).
- **Forms**: Template-driven forms with `FormsModule` (e.g., `[(ngModel)]` in allowance forms).
- **Icons**: Centralized icon registry in `appConfig` using `@ng-icons/core` (see [app.config.ts](src/app/app.config.ts)).

## Key Patterns
- **Data Flow**: Components inject services and subscribe to observables; use `forkJoin` for multiple API calls (e.g., dashboard loads multiple stats).
- **Mock APIs**: Services simulate HTTP with RxJS delays; marked for refactor to real endpoints (e.g., `[API-Refactor]` comments).
- **Component Communication**: `@Input`/`@Output` for parent-child; services for cross-component data.
- **Styling**: SCSS with `ViewEncapsulation.None` for global styles (e.g., dashboard calendar).
- **Guards**: Functional guards check localStorage (e.g., [auth-guard.ts](src/app/guards/auth-guard.ts)).

## Development Workflow
- **Serve**: `npm start` (ng serve) for dev server at localhost:4200.
- **Build**: `npm run build` (ng build) outputs to `dist/`.
- **Test**: `npm test` (ng test) uses Vitest.
- **Watch**: `npm run watch` for incremental builds.
- **Prettier**: Configured with 100 width, single quotes; Angular parser for HTML.

## Conventions
- **File Structure**: `pages/` for routes, `components/` for reusable UI, `services/` for logic.
- **Naming**: Kebab-case files (e.g., `allowance-form.ts`), PascalCase classes.
- **Imports**: Use `inject()` for DI in constructors (e.g., `private userService = inject(UserService)`).
- **Dependencies**: FullCalendar for calendars, TanStack Table for data tables, FontAwesome for icons.</content>
<parameter name="filePath">c:\Users\PawitLea\Desktop\ESS-FE\.github\copilot-instructions.md