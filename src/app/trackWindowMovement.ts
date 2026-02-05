import type { DashboardWidget } from '@irdashies/types';
import { BrowserWindow } from 'electron';
import { updateDashboardWidget, getDashboard } from './storage/dashboards';
import type { OverlayManager } from './overlayManager';

export const trackWindowMovement = (
  widget: DashboardWidget,
  browserWindow: BrowserWindow,
  overlayManager: OverlayManager
) => {
  // Tracks dragged events on window and updates the widget layout
  browserWindow.on('moved', () => updateWidgetLayout(browserWindow, widget.id, overlayManager));
  browserWindow.on('resized', () => updateWidgetLayout(browserWindow, widget.id, overlayManager));
};

function updateWidgetLayout(
  browserWindow: BrowserWindow,
  widgetId: string,
  overlayManager: OverlayManager
) {
  // Get current dashboard to access latest widget state
  const dashboard = getDashboard('default');
  if (!dashboard) return;

  // Find the current widget (with latest config)
  const currentWidget = dashboard.widgets.find((w) => w.id === widgetId);
  if (!currentWidget) return;

  // Update only the layout properties (position and size)
  const [x, y] = browserWindow.getPosition();
  const [width, height] = browserWindow.getSize();

  const updatedWidget: DashboardWidget = {
    ...currentWidget,
    layout: {
      ...currentWidget.layout,
      x,
      y,
      width,
      height,
    },
  };

  updateDashboardWidget(updatedWidget, 'default');

  // Synchronize sizes for flag widgets
  if (widgetId === 'flag' || widgetId === 'flag2') {
    // Find the other flag widget
    const otherFlagId = widgetId === 'flag' ? 'flag2' : 'flag';
    const otherFlagWidget = dashboard.widgets.find((w) => w.id === otherFlagId);
    
    if (otherFlagWidget) {
      // Update the other flag with the same dimensions, keeping its original position
      const syncedFlagWidget: DashboardWidget = {
        ...otherFlagWidget,
        layout: {
          ...otherFlagWidget.layout,
          width,
          height,
        },
      };
      updateDashboardWidget(syncedFlagWidget, 'default');

      // Also update the actual Electron window size for the other flag
      const otherFlagWindow = overlayManager.getOverlays().find((o) => o.widget.id === otherFlagId)?.window;
      if (otherFlagWindow && !otherFlagWindow.isDestroyed()) {
        otherFlagWindow.setSize(width, height);
      }
    }
  }
}
