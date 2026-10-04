/**
 * Trims this custom build down to the widgets actually in use.
 *
 * A widget not listed in BUILD_WIDGETS is hidden from the settings menu and
 * key bindings, and rendered as if it were switched off — the same way a
 * widget the running sim cannot support is handled (see simWidgetSupport.ts).
 * Nothing is deleted and saved settings are left untouched, so adding an id
 * back to the list brings that widget back exactly as it was.
 *
 * Ids are the WIDGET_MAP keys / menuItems `widgetType` values.
 */
export const BUILD_WIDGETS: readonly string[] = [
  'standings',
  'relative',
  'fuel',
  'wind',
];

/** Settings pages (menuItems `path`) hidden from the menu in this build. */
export const BUILD_HIDDEN_SETTINGS_PAGES: readonly string[] = ['/car-setup'];

/** Whether a widget is left out of this build. */
export const isWidgetHiddenInBuild = (widgetId: string | undefined): boolean =>
  !!widgetId && !BUILD_WIDGETS.includes(widgetId);
