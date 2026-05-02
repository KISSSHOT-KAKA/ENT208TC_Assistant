import { ReminderEvent, SystemSnapshot } from './pet_desktop_types';
import { PetSettings } from './pet_settings';

const CPU_WARN_PERCENT = 86;
const MEMORY_WARN_PERCENT = 88;
const BATTERY_LOW_PERCENT = 20;
const SEDENTARY_REMINDER_MS = 55 * 60 * 1000;
const NETWORK_REMINDER_COOLDOWN_MS = 18 * 1000;
const RESOURCE_REMINDER_COOLDOWN_MS = 2 * 60 * 1000;
const SEDENTARY_REMINDER_COOLDOWN_MS = 15 * 60 * 1000;

export class PetReminderController {
  private settings: PetSettings;
  private lastActivityAt = Date.now();
  private lastNetworkState: boolean | null = null;
  private lastCpuWarnAt = 0;
  private lastMemoryWarnAt = 0;
  private lastBatteryWarnAt = 0;
  private lastSedentaryWarnAt = 0;
  private lastNetworkWarnAt = 0;

  public constructor(settings: PetSettings) {
    this.settings = settings;
  }

  public setSettings(settings: PetSettings): void {
    this.settings = settings;
  }

  public markActivity(timestamp = Date.now()): void {
    this.lastActivityAt = timestamp;
  }

  public ingestSnapshot(snapshot: SystemSnapshot): ReminderEvent[] {
    const reminders: ReminderEvent[] = [];
    const now = snapshot.timestamp;

    if (
      this.settings.enableNetworkReminder &&
      this.lastNetworkState != null &&
      snapshot.networkOnline !== this.lastNetworkState &&
      now - this.lastNetworkWarnAt >= NETWORK_REMINDER_COOLDOWN_MS
    ) {
      this.lastNetworkWarnAt = now;
      reminders.push(
        this.createReminder(
          snapshot.networkOnline ? 'network_online' : 'network_offline',
          snapshot.networkOnline
            ? this.settings.notificationStyle === 'productivity'
              ? this.ui(
                  'Network restored. You can continue the current task.'
                )
              : this.ui(
                  'The network is back. I will keep watch while you stay online.'
                )
            : this.settings.notificationStyle === 'productivity'
              ? this.ui(
                  'Network connection lost. Check the connection before you continue.'
                )
              : this.ui(
                  'The network dropped for a moment. Let us stabilize this side first.'
                )
        )
      );
    }
    this.lastNetworkState = snapshot.networkOnline;

    if (
      snapshot.cpuPercent >= CPU_WARN_PERCENT &&
      now - this.lastCpuWarnAt >= RESOURCE_REMINDER_COOLDOWN_MS
    ) {
      this.lastCpuWarnAt = now;
      reminders.push(
        this.createReminder(
          'cpu_high',
          this.settings.notificationStyle === 'productivity'
            ? this.ui(
                `CPU is up to ${Math.round(
                  snapshot.cpuPercent
                )}%. Consider pausing high-load actions.`
              )
            : this.ui(
                `CPU is a little busy right now, already at ${Math.round(
                  snapshot.cpuPercent
                )}%.`
              ),
          'warning'
        )
      );
    }

    if (
      snapshot.memoryPercent >= MEMORY_WARN_PERCENT &&
      now - this.lastMemoryWarnAt >= RESOURCE_REMINDER_COOLDOWN_MS
    ) {
      this.lastMemoryWarnAt = now;
      reminders.push(
        this.createReminder(
          'memory_high',
          this.settings.notificationStyle === 'productivity'
            ? this.ui(
                `Memory usage has reached ${Math.round(
                  snapshot.memoryPercent
                )}%. Consider closing heavy processes.`
              )
            : this.ui(
                `Memory is getting tight. It is already at ${Math.round(
                  snapshot.memoryPercent
                )}%.`
              ),
          'warning'
        )
      );
    }

    if (
      typeof snapshot.batteryPercent === 'number' &&
      !snapshot.batteryCharging &&
      snapshot.batteryPercent <= BATTERY_LOW_PERCENT &&
      now - this.lastBatteryWarnAt >= RESOURCE_REMINDER_COOLDOWN_MS
    ) {
      this.lastBatteryWarnAt = now;
      reminders.push(
        this.createReminder(
          'battery_low',
          this.settings.notificationStyle === 'productivity'
            ? this.ui(
                `Battery is down to ${Math.round(
                  snapshot.batteryPercent
                )}%. Plug in the device soon.`
              )
            : this.ui(
                `Battery is getting low, only ${Math.round(
                  snapshot.batteryPercent
                )}% left.`
              ),
          'warning'
        )
      );
    }

    if (
      this.settings.enableSedentaryReminder &&
      now - this.lastActivityAt >= SEDENTARY_REMINDER_MS &&
      now - this.lastSedentaryWarnAt >= SEDENTARY_REMINDER_COOLDOWN_MS
    ) {
      this.lastSedentaryWarnAt = now;
      this.lastActivityAt = now;
      reminders.push(
        this.createReminder(
          'sedentary',
          this.settings.notificationStyle === 'productivity'
            ? this.ui(
                'You have been sitting for a while. Stand up and reset for two minutes.'
              )
            : this.ui(
                'You have been still for quite a while. Stretch a little and breathe.'
              )
        )
      );
    }

    return reminders;
  }

  public createPomodoroCompleteReminder(): ReminderEvent {
    return this.createReminder(
      'pomodoro_complete',
      this.settings.notificationStyle === 'productivity'
        ? this.ui(
            'Focus session complete. Take a short break, then move into the next sprint.'
          )
        : this.ui(
            'That focus round is done. Rest for a moment and I will stay with you.'
          )
    );
  }

  private createReminder(
    kind: ReminderEvent['kind'],
    text: string,
    severity: ReminderEvent['severity'] = 'info'
  ): ReminderEvent {
    return {
      kind,
      text,
      severity,
      style: this.settings.notificationStyle,
      timestamp: Date.now()
    };
  }

  private ui(english: string): string {
    if (this.settings.language === 'en') {
      return english;
    }

    switch (english) {
      case 'Network restored. You can continue the current task.':
        return '网络已恢复，可以继续推进当前任务。';
      case 'The network is back. I will keep watch while you stay online.':
        return '网络已经恢复啦，我会继续陪你在线守着。';
      case 'Network connection lost. Check the connection before you continue.':
        return '网络连接中断，建议先检查连接状态。';
      case 'The network dropped for a moment. Let us stabilize this side first.':
        return '网络忽然断了一下，我们先把这边稳住。';
      case 'You have been sitting for a while. Stand up and reset for two minutes.':
        return '你已经久坐一段时间了，起身活动两分钟再继续吧。';
      case 'You have been still for quite a while. Stretch a little and breathe.':
        return '你已经安静坐了好久啦，起来伸个懒腰，顺便呼吸一下。';
      case 'Focus session complete. Take a short break, then move into the next sprint.':
        return '番茄钟结束，本轮专注已完成。可以短暂休息后继续下一轮。';
      case 'That focus round is done. Rest for a moment and I will stay with you.':
        return '这一轮已经完成啦，休息一下也没关系，我会继续陪着你。';
      default:
        return english
          .replace(/^CPU is up to (\d+)%\. Consider pausing high-load actions\.$/, 'CPU 已升到 $1%，建议暂时停一下高负载操作。')
          .replace(/^CPU is a little busy right now, already at (\d+)%\.$/, 'CPU 现在有点忙，已经到 $1% 了。')
          .replace(/^Memory usage has reached (\d+)%\. Consider closing heavy processes\.$/, '内存占用已到 $1%，建议关闭占用较高的程序。')
          .replace(/^Memory is getting tight\. It is already at (\d+)%\.$/, '内存已经有点紧张啦，现在到 $1% 了。')
          .replace(/^Battery is down to (\d+)%\. Plug in the device soon\.$/, '电量仅剩 $1%，建议尽快接入电源。')
          .replace(/^Battery is getting low, only (\d+)% left\.$/, '电量有点低了，只剩 $1% 了。');
    }
  }
}
