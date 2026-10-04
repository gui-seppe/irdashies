import { describe, it, expect, vi } from 'vitest';
import { WIDGET_MAP } from '../frontend/WidgetIndex';
import {
  allGeneralItems,
  allWidgetItems,
  generalItems,
  widgetItems,
} from '../frontend/components/Settings/menuItems';
import {
  BUILD_HIDDEN_SETTINGS_PAGES,
  BUILD_WIDGETS,
  isWidgetHiddenInBuild,
} from './customBuild';

// vitest.setup.ts switches the trim off for every other test.
vi.unmock('./customBuild');

describe('customBuild', () => {
  it('names only widgets that actually exist', () => {
    // A typo would hide a widget it meant to keep.
    const known = new Set(Object.keys(WIDGET_MAP));
    expect(BUILD_WIDGETS.filter((id) => !known.has(id))).toEqual([]);
  });

  it('hides only settings pages that exist', () => {
    const allPaths = allGeneralItems.map((item) => item.path);
    BUILD_HIDDEN_SETTINGS_PAGES.forEach((path) => {
      expect(allPaths).toContain(path);
      expect(generalItems.map((item) => item.path)).not.toContain(path);
    });
  });

  it('shows exactly the build widgets in the settings menu', () => {
    expect(widgetItems.map((item) => item.widgetType).sort()).toEqual(
      [...BUILD_WIDGETS].sort()
    );
    expect(allWidgetItems.length).toBeGreaterThan(widgetItems.length);
  });

  it('hides everything else, but never an unnamed widget', () => {
    expect(isWidgetHiddenInBuild('standings')).toBe(false);
    expect(isWidgetHiddenInBuild('input')).toBe(true);
    expect(isWidgetHiddenInBuild(undefined)).toBe(false);
  });
});
