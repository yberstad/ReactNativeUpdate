import {
  useUpdates,
  checkForUpdateAsync,
  fetchUpdateAsync,
  reloadAsync,
} from 'expo-updates';
import React, {useEffect} from 'react';
import {StyleProp, View, ViewStyle} from 'react-native';
import {ExpoDemoCard} from './ExpoDemoCard';
import {
  availableUpdateTitle,
  availableUpdateDescription,
  errorDescription,
  isAvailableUpdateCritical,
  useAppState,
  useInterval,
} from '../updates';

// Wrap async expo-updates functions (with useUpdates(), no need to wait for results or errors)
const checkForUpdate = () => checkForUpdateAsync().catch(_error => {});
const downloadUpdate = () => fetchUpdateAsync().catch(_error => {});
const runUpdate = () => reloadAsync().catch(_error => {});

const defaultUpdateCheckInterval = 3600000; // 1 hour
const defaultCheckOnForeground = false;
const defaultAutoLaunchCritical = false;
const defaultAlwaysVisible = false;
const defaultButtonsAlwaysVisible = false;

export interface UpdateMonitorProps {
  /**
   * An optional style override useful for padding & margin.
   */
  style?: StyleProp<ViewStyle>;
  updateCheckInterval?: number;
  checkOnForeground?: boolean;
  autoLaunchCritical?: boolean;
  alwaysVisible?: boolean;
  buttonsAlwaysVisible?: boolean;
}

export const UpdateMonitor: (props: UpdateMonitorProps) => JSX.Element = ({
  style,
  updateCheckInterval = defaultUpdateCheckInterval,
  checkOnForeground = defaultCheckOnForeground,
  autoLaunchCritical = defaultAutoLaunchCritical,
  alwaysVisible = defaultAlwaysVisible,
  buttonsAlwaysVisible = defaultButtonsAlwaysVisible,
}) => {
  const updatesSystem = useUpdates();

  const {isUpdateAvailable, isUpdatePending} = updatesSystem;

  const isUpdateCritical = isAvailableUpdateCritical(updatesSystem);

  const monitorInterval = updateCheckInterval;

  const needsUpdateCheck = () => monitorInterval;

  // Check if needed when app becomes active
  const appStateHandler = (activating: boolean) => {
    if (activating) {
      checkForUpdate();
    }
  };
  const appState = useAppState(checkOnForeground ? appStateHandler : undefined);

  // This effect runs periodically to see if an update check is needed
  // The effect interval should be smaller than monitorInterval
  useInterval(() => {
    if (appState === 'active' && needsUpdateCheck()) {
      checkForUpdate();
    }
  }, monitorInterval / 4);

  // If update is critical, download it
  useEffect(() => {
    if (isUpdateCritical && !isUpdatePending && autoLaunchCritical) {
      downloadUpdate();
    }
  }, [isUpdateCritical, isUpdatePending, autoLaunchCritical]);

  // Run the downloaded update (after delay) if download completes successfully and it is critical
  useEffect(() => {
    if (isUpdatePending && isUpdateCritical && autoLaunchCritical) {
      setTimeout(() => runUpdate(), 2000);
    }
  }, [isUpdateCritical, isUpdatePending, autoLaunchCritical]);

  // Button press handlers
  const handleDownloadButtonPress = () => downloadUpdate();
  const handleRunButtonPress = () => setTimeout(() => runUpdate(), 2000);

  // Text content
  const title = `${availableUpdateTitle(updatesSystem)}`;

  const description = `${availableUpdateDescription(
    updatesSystem,
  )} ${errorDescription(updatesSystem)}`;

  // Actions: only show actions that make sense based on the current state
  const actions: {label: string; onPress: () => void}[] = [];
  if (isUpdateAvailable || buttonsAlwaysVisible) {
    actions.push({
      label: 'Download',
      onPress: () => {
        handleDownloadButtonPress();
      },
    });
  }
  if (isUpdatePending || buttonsAlwaysVisible) {
    actions.push({
      label: 'Launch',
      onPress: () => {
        handleRunButtonPress();
      },
    });
  }

  // Expo colors: green = no update needed, blue = update available, red = critical update available

  const variant = isUpdateCritical
    ? 'danger'
    : isUpdateAvailable
    ? 'info'
    : 'success';

  const styles = style ? [style, $container] : $container;
  return (
    <View style={styles}>
      {isUpdateAvailable || alwaysVisible ? (
        <ExpoDemoCard
          variant={variant}
          title={title}
          description={description}
          actions={actions}
        />
      ) : null}
    </View>
  );
};

const $container: ViewStyle = {
  justifyContent: 'center',
  alignItems: 'center',
};
