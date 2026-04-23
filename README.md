# ENT208TC_Assistant# xiaozhi-esp32-avatar 项目技术交接文档（AtomS3R + Ubuntu VM + Windows 桌宠）

## 1. 文档目的与适用范围

本文档用于把当前语音助手项目的环境、架构、进度、问题、下一步开发方向完整沉淀，便于后续成员快速接手并继续迭代。

适用对象：
- 新加入开发成员
- 负责桌宠前端开发的同学
- 负责固件/嵌入式联调的同学
- 负责后端与成本评估的同学

---

## 2. 项目目标（当前阶段）

当前目标是实现并稳定演示：
- 基于 **M5Stack AtomS3R** 的语音终端固件（唤醒、采集、播放）
- 与云端对话链路联通（OTA + MQTT + 对话回复）
- 后续与桌面端“虚拟桌宠”进行实时联动（状态/文本/表情）

当前状态：
- 固件已完成编译、烧录、运行、联网、唤醒词识别、语音对话
- 已验证设备可进入配网模式并通过手机热点联网

---

## 3. 使用中的 GitHub 仓库（已明确）

### 3.1 核心仓库（已使用）

1) 固件仓库：
- `Gitshaoxiang/xiaozhi-esp32-avatar`
- README 入口：
  - <https://github.com/Gitshaoxiang/xiaozhi-esp32-avatar/blob/main/README.md>

2) ESP-IDF 官方仓库（工具链）：
- `espressif/esp-idf`
- 使用版本：`v5.4.2`

### 3.2 固件内已使用的关键组件来源（按构建日志）

- `M5GFX`（m5stack）
- `M5Unified`（m5stack）
- `espressif/esp-sr`（语音前端/唤醒相关）
- `espressif/esp_lvgl_port`（图形相关）
- 以及多个 `managed_components` 依赖（在首次构建时自动解析）

---

## 4. 后续可能需要用到的仓库（建议）

> 说明：以下为下一阶段“桌宠联动 + 自定义后端”常见技术选型候选，不代表必须全部采用。

### 4.1 桌宠前端（建议先选其一）

1) Tauri（推荐轻量路线）
- 官方：<https://github.com/tauri-apps/tauri>

2) Electron（推荐快速原型路线）
- 官方：<https://github.com/electron/electron>

3) Godot（推荐高表现动画路线）
- 官方：<https://github.com/godotengine/godot>

### 4.2 桥接与后端

1) FastAPI（事件桥/本地网关）
- 官方：<https://github.com/fastapi/fastapi>

2) Eclipse Mosquitto（自建 MQTT，若不走默认云）
- 官方：<https://github.com/eclipse/mosquitto>

3) Node.js ws（轻量 WebSocket 网关）
- 官方：<https://github.com/websockets/ws>

---

## 5. 环境与部署现状

## 5.1 开发环境

- 宿主：Windows
- 虚拟机：VMware + Ubuntu
- 设备：M5Stack AtomS3R（ESP32-S3-PICO-1，8MB Flash + 8MB PSRAM）

## 5.2 工具链

- ESP-IDF：`v5.4.2`
- Python 环境：`~/.espressif/python_env/idf5.4_py3.10_env`
- 典型激活命令：
```bash
source ~/esp/esp-idf-5.4.2/export.sh
```

## 5.3 工程构建状态

- 目标芯片：`esp32s3`
- 板型：`AtomS3R + Echo Base Custom`
- 关键修复：`Flash size` 从 `16MB` 改为 `8MB`，与硬件一致
- 当前可成功生成并烧录：
  - `bootloader.bin`
  - `partition-table.bin`
  - `ota_data_initial.bin`
  - `srmodels.bin`
  - `xiaozhi.bin`

---

## 6. 核心架构理解（接手必须知道）

## 6.1 端云协同架构

设备端（AtomS3R）负责：
- 唤醒词检测（WakeNet）
- 语音采集/编码
- 音频播放
- 本地状态机

云端负责：
- OTA 检查
- MQTT 会话
- 对话能力（语义/回复流）

## 6.2 日志证据（关键判定）

已出现并验证：
- `Got IP`：设备联网成功
- `Opening HTTP connection ... /ota/`：OTA链路可用
- `MQTT: Connected to endpoint`：对话消息总线可用
- `Application: STATE: idle/listening/speaking`：状态机正常
- `Application: >> / <<`：上行识别与下行回复正常

结论：
- 当前不是纯端侧离线对话
- 是“端侧唤醒 + 云端对话”的混合模式

---

## 7. 当前完成功能清单（Done）

1) ✅ Ubuntu 环境与 ESP-IDF 工具链完成
2) ✅ 工程完整拉取（含子模块）
3) ✅ menuconfig 设定目标板与参数
4) ✅ 成功编译并产出可烧录镜像
5) ✅ 成功烧录到 AtomS3R
6) ✅ 修复 Flash 容量不匹配（16MB -> 8MB）导致的启动崩溃
7) ✅ 串口日志确认系统正常启动
8) ✅ 手机热点联网成功
9) ✅ 云端 MQTT 链接成功
10) ✅ 唤醒词与多轮对话成功

---

## 8. 已知问题与经验库

## 8.1 VMware USB 透传不稳定（高频）

典型现象：
- `/dev/ttyACM0` 突然消失
- `No such device`
- `Input/output error`
- `write timeout`

处理经验：
- 优先关闭占串口软件
- 在 VMware 里重连 USB 设备
- 降低波特率（必要时）
- 必要时手动进下载模式 + `--before no_reset`

## 8.2 串口权限反复丢失

现象：`/dev/ttyACM0 is not readable`
临时处理：
```bash
sudo chmod 666 /dev/ttyACM0
```

## 8.3 手机热点重连波动

现象：
- `bcn_timeout`
- 自动重连若干次后恢复

建议：
- 保持热点稳定、尽量固定 SSID/密码
- 使用 2.4GHz 兼容模式

---

## 9. 为什么“今天没配网也能自动联网”

因为设备已保存可用 Wi-Fi 凭据，重启后会自动尝试连接历史网络。

注意：
- 若更换热点名/密码，需重新配网
- 配网页面入口一般为：连接 `Xiaozhi-xxxx` 后访问 `http://192.168.4.1`

---

## 10. 桌宠联动开发方案（建议先行路线）

## 10.1 现实约束

当前设备串口在 Ubuntu VM 内，桌宠拟运行在 Windows。后端细节尚未完全掌握。

## 10.2 推荐“低风险首版”

采用 **串口日志事件桥**：
- Ubuntu 读取串口日志
- Python 脚本解析关键事件
- 通过 WebSocket 推送到 Windows 桌宠

事件建议最小集：
- `wake_detected`
- `state_changed`（idle/listening/speaking/connecting）
- `user_text`（Application: >>）
- `assistant_text`（Application: <<）
- `network_error`

这样不依赖理解云端私有协议，也能快速做出演示级联动。

## 10.3 事件协议 v1（P0 固化）

目的：
- 统一 Ubuntu 串口日志到 Windows 桌宠的事件格式，避免前后端联调反复改字段。

统一消息结构：
~~~json
{
  "version": "v1",
  "event": "state_changed",
  "ts": "2026-04-22T12:00:00Z",
  "seq": 1,
  "source": "serial_bridge",
  "payload": {},
  "raw": "I (10809) Application: STATE: idle"
}

---

## 11. 前端（桌宠/屏显）优化建议

## 11.1 先做“可感知”优化

1) 状态动画统一：
- Idle、Listening、Thinking、Speaking 四态

2) 人设一致性：
- 唤醒词、角色名、屏显文案一致

3) 弱网提示：
- 网络断连/重连时有清晰反馈

4) 颜色与可读性：
- 亮暗主题、字幕对比度、远距离可读性

## 11.2 后续可扩展

- 情绪映射（回复语义 -> 表情）
- 节奏优化（打断、超时、短答优先）
- 交互脚本（演示模式）

---

## 12. 后端个性化 DIY 路线

## 12.1 轻量 DIY（短期）

- 改角色提示词
- 改欢迎语/收尾语
- 改回复长度与风格

## 12.2 深度 DIY（中期）

- 自建后端（ASR/LLM/TTS）
- 自建 MQTT / 事件分发
- 成本可控、能力可控、数据可控

---

## 13. 下阶段需求建议（可直接开任务）

## 13.1 功能需求

- [ ] 桌宠端接入实时事件流
- [ ] 实现四态动画切换
- [ ] 显示用户/助手文本气泡
- [ ] 网络状态可视化
- [ ] 演示脚本模式（固定问答）

## 13.2 稳定性需求

- [ ] 降低 VM USB 中断率
- [ ] 串口权限持久化
- [ ] 热点切换容错

## 13.3 体验需求

- [ ] 人设与唤醒词统一
- [ ] 默认音量/亮度策略
- [ ] 异常提示友好化

---

## 14. 每次重启后的最小操作清单（Runbook）

```bash
cd ~/xiaozhi-esp32-avatar
source ~/esp/esp-idf-5.4.2/export.sh
ls /dev/ttyACM* 2>/dev/null
sudo chmod 666 /dev/ttyACM0
idf.py -p /dev/ttyACM0 monitor
```

若串口不存在：
- 在 VMware 里重连 USB 设备
- 重新执行 `ls /dev/ttyACM*`

---

## 15. 里程碑复盘（当前做到的程度）

当前已达到：
- **M2：设备端可稳定启动与联网**
- **M3：端云语音闭环可用**

尚未完成：
- **M4：桌宠联动闭环**（下一阶段核心）
- **M5：后端自定义闭环**（中长期）

---

## 16. 下一步建议（按优先级）

P0（本周）
1) 先做串口日志 -> WebSocket 事件桥
2) 桌宠实现四态动画 + 文本气泡
3) 演示脚本固化

P1（下周）
1) 做断网重连体验
2) 配置持久化与配置UI
3) 人设与唤醒词统一

P2（后续）
1) 评估自建后端成本
2) 迁移到可控 API 链路
3) 指标化（延迟、成功率、成本）

---

## 17. 交接备注

本项目目前已经从“环境搭建/烧录验证”进入“产品体验/联动开发”阶段。

建议后续优先把“桌宠联动”做成可演示闭环，再逐步推进后端自定义与成本优化。
