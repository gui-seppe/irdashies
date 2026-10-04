import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// This custom build hides most widgets (src/types/customBuild.ts). Tests keep
// exercising every widget, so the trim is switched off here; customBuild.spec
// unmocks it to test the real list.
vi.mock('./src/types/customBuild', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./src/types/customBuild')>()),
  BUILD_HIDDEN_SETTINGS_PAGES: [],
  isWidgetHiddenInBuild: () => false,
}));
