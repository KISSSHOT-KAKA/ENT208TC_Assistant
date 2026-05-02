export interface SystemSnapshot {
  cpuPercent: number;
  memoryPercent: number;
  networkOnline: boolean;
  windowFocused: boolean;
  batteryPercent?: number;
  batteryCharging?: boolean;
  timestamp: number;
}

export type ReminderSeverity = 'info' | 'warning';

export type ReminderKind =
  | 'sedentary'
  | 'pomodoro_complete'
  | 'network_offline'
  | 'network_online'
  | 'cpu_high'
  | 'memory_high'
  | 'battery_low';

export interface ReminderEvent {
  kind: ReminderKind;
  text: string;
  severity: ReminderSeverity;
  style: 'companion' | 'productivity';
  timestamp: number;
}
