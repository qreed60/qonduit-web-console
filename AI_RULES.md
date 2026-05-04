# AI_RULES.md

## Tech Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4 (using `@tailwindcss/vite` plugin and `@theme` configuration)
- **Routing**: React Router DOM v6
- **Icons**: Lucide React
- **UI Components**: shadcn/ui (pre-installed and available)
- **State Management**: React hooks (`useState`, `useEffect`) and `localStorage` for persistence
- **API/Data Fetching**: Native `fetch` API with async/await
- **Animations**: Custom CSS keyframes (fade-in, slide-in, pulse, spin) defined in `src/index.css`

## Library Usage Rules

### Styling
- **Always use Tailwind CSS** for all styling. Do not use CSS modules, styled-components, or inline styles.
- Use the custom theme variables defined in `src/index.css` (e.g., `bg-bg-primary`, `text-accent-primary`, `border-border-primary`).
- Ensure all components are responsive using Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`, etc.).

### Icons
- **Use `lucide-react`** for all icons. Do not use other icon libraries.
- Import icons directly from `lucide-react` (e.g., `import { Search } from 'lucide-react';`).

### UI Components
- **Use `shadcn/ui` components** when available. Do not reinvent basic UI elements like buttons, dialogs, inputs, or cards unless they require significant customization.
- If a `shadcn/ui` component needs customization, create a new wrapper component rather than modifying the original.

### Routing
- **Use `react-router-dom`** for navigation.
- Keep all routes defined in `src/App.tsx`.
- Use `useNavigate` and `useLocation` hooks for programmatic navigation and state synchronization.

### State Management
- **Keep state local** to components using React hooks (`useState`, `useEffect`, `useRef`).
- Use `localStorage` for persistent settings (e.g., endpoint overrides, mode, theme preferences).
- **Avoid heavy state management libraries** like Redux, Zustand, or Recoil unless explicitly requested.

### API & Data Fetching
- **Use native `fetch`** for all API calls.
- Keep all API logic in `src/services/api.ts`.
- Handle errors by throwing them (do not catch errors with try/catch blocks unless specifically requested).

### Animations
- **Use custom CSS keyframes** defined in `src/index.css` (e.g., `animate-fade-in`, `animate-slide-in-left`).
- Use Tailwind's built-in animation utilities (e.g., `animate-spin`, `animate-pulse`) where appropriate.
- **Avoid animation libraries** like Framer Motion unless necessary for complex interactions.

### File Structure
- **Components**: Place reusable components in `src/components/`.
- **Pages**: Place page-level components in `src/pages/`.
- **Services**: Place API and utility functions in `src/services/`.
- **Config**: Place configuration files in `src/config/`.
- **Types**: Place TypeScript interfaces and types in `src/types.ts`.
- Keep files small and focused (aim for <100 lines per component).