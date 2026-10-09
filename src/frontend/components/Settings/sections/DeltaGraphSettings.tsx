import { useState, useEffect } from 'react';
import { BaseSettingsSection } from '../components/BaseSettingsSection';
import {
  DeltaGraphWidgetSettings,
  SettingsTabType,
  getWidgetDefaultConfig,
} from '@irdashies/types';
import { useDashboard } from '@irdashies/context';
import { TabButton } from '../components/TabButton';
import { SessionVisibility } from '../components/SessionVisibility';
import { SettingsSection } from '../components/SettingSection';
import { SettingToggleRow } from '../components/SettingToggleRow';
import { SettingDivider } from '../components/SettingDivider';
import { SettingSliderRow } from '../components/SettingSliderRow';
import { SettingSelectRow } from '../components/SettingSelectRow';

const SETTING_ID = 'deltagraph';

const defaultConfig = getWidgetDefaultConfig('deltagraph');

export const DeltaGraphSettings = () => {
  const { currentDashboard } = useDashboard();

  const savedSettings = currentDashboard?.widgets.find(
    (w) => w.id === SETTING_ID
  ) as DeltaGraphWidgetSettings | undefined;

  const [settings, setSettings] = useState<DeltaGraphWidgetSettings>({
    id: SETTING_ID,
    enabled: savedSettings?.enabled ?? false,
    config:
      (savedSettings?.config as DeltaGraphWidgetSettings['config']) ??
      defaultConfig,
  });

  // Re-seed when the saved widget changes (dashboard loaded late, profile
  // switch), as DeltaSpeedSettings does, so an edit never writes defaults
  // over the saved config.
  const [prevSaved, setPrevSaved] = useState(savedSettings);
  if (JSON.stringify(savedSettings) !== JSON.stringify(prevSaved)) {
    setPrevSaved(savedSettings);
    if (savedSettings) {
      setSettings({
        id: SETTING_ID,
        enabled: savedSettings.enabled ?? false,
        config:
          (savedSettings.config as DeltaGraphWidgetSettings['config']) ??
          defaultConfig,
      });
    }
  }

  const [activeTab, setActiveTab] = useState<SettingsTabType>(
    () =>
      (localStorage.getItem('deltaGraphTab') as SettingsTabType) || 'options'
  );

  useEffect(() => {
    localStorage.setItem('deltaGraphTab', activeTab);
  }, [activeTab]);

  if (!currentDashboard) return <>Loading...</>;

  return (
    <BaseSettingsSection
      title="Delta Graph"
      description="Live delta to your session best (iRacing's own delta), drawn over the lap, with the time gained or lost in every corner and straight. Red is slower than your best, green faster. The dashed line is your previous lap."
      settings={settings}
      onSettingsChange={setSettings}
      widgetId={SETTING_ID}
    >
      {(handleConfigChange) => (
        <div className="space-y-4">
          <div className="flex border-b border-slate-700/50">
            <TabButton
              id="options"
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            >
              Options
            </TabButton>
            <TabButton
              id="visibility"
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            >
              Visibility
            </TabButton>
          </div>

          <div>
            {activeTab === 'options' && (
              <SettingsSection title="Display">
                <SettingSliderRow
                  title="Background Opacity"
                  description="Opacity of the widget background."
                  value={settings.config.background.opacity}
                  units="%"
                  min={0}
                  max={100}
                  step={5}
                  onChange={(v) =>
                    handleConfigChange({ background: { opacity: v } })
                  }
                />
                <SettingSelectRow
                  title="Corner Labels"
                  description="Turn numbers keep narrow corners readable; names are cut short where they don't fit."
                  value={settings.config.cornerLabelStyle ?? 'number'}
                  options={[
                    { label: 'Turn number', value: 'number' },
                    { label: 'Name', value: 'name' },
                  ]}
                  onChange={(v) => handleConfigChange({ cornerLabelStyle: v })}
                />
                <SettingToggleRow
                  title="Show Lap Time"
                  description="The current lap time, top left."
                  enabled={settings.config.showLapTime ?? true}
                  onToggle={(v) => handleConfigChange({ showLapTime: v })}
                />
                <SettingToggleRow
                  title="Show Session Best"
                  description="Your best lap time this session, next to the lap time."
                  enabled={settings.config.showSessionBest ?? true}
                  onToggle={(v) => handleConfigChange({ showSessionBest: v })}
                />
                <SettingToggleRow
                  title="Show Previous Lap"
                  description="Your previous lap's delta as a dashed line on the graph."
                  enabled={settings.config.showPreviousLap ?? true}
                  onToggle={(v) => handleConfigChange({ showPreviousLap: v })}
                />
              </SettingsSection>
            )}

            {activeTab === 'visibility' && (
              <SettingsSection title="Session Visibility">
                <SessionVisibility
                  sessionVisibility={settings.config.sessionVisibility}
                  handleConfigChange={handleConfigChange}
                />

                <SettingDivider />

                <SettingToggleRow
                  title="Show only when on track"
                  description="If enabled, widget will only be shown when driving."
                  enabled={settings.config.showOnlyWhenOnTrack}
                  onToggle={(v) =>
                    handleConfigChange({ showOnlyWhenOnTrack: v })
                  }
                />
              </SettingsSection>
            )}
          </div>
        </div>
      )}
    </BaseSettingsSection>
  );
};
