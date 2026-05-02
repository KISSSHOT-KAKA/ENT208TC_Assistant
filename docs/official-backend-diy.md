# Official Backend & DIY Guide

## 1. Official backend entry

The upstream firmware is based on the XiaoZhi ecosystem:

- Official upstream repo: [78/xiaozhi-esp32](https://github.com/78/xiaozhi-esp32)
- Documentation center: [xiaozhi.dev](https://xiaozhi.dev/en/docs/)
- Official service / console entry: [xiaozhi.me](https://xiaozhi.me)

According to the upstream README:

- the firmware connects to the official `xiaozhi.me` server by default
- users who already connected a device to the official server can log in to the `xiaozhi.me` console for configuration

Reference:

- [Upstream README](https://github.com/78/xiaozhi-esp32)

## 2. What can be customized without self-hosting

The light-DIY path should stay within the official ecosystem first.

### Frontend / local app

These are fully under our control:

- companion name
- UI language
- interaction copy
- panel layout
- reminder strategy
- mouse / touch behavior
- system-card and focus-timer behavior

### Bridge layer

These are also under our control:

- WebSocket event shape
- richer event derivation
- reconnect behavior
- desktop-side mapping from device events to Live2D behavior

### Firmware / official ecosystem light customization

These are partially customizable in the official path:

- device access / endpoint configuration
- wake word assets
- fonts
- emoji packs
- chat backgrounds

Useful references:

- [Custom Assets Generator repo](https://github.com/78/xiaozhi-assets-generator)
- [WebSocket protocol docs](https://xiaozhi.dev/en/docs/development/websocket/)

The upstream README explicitly mentions online editing for:

- wake words
- fonts
- emojis
- chat backgrounds

## 3. What cannot be fully controlled on the official backend

The following capabilities are not realistically “fully DIY” while still depending on the official backend:

- stable persona / role prompt
- long-term memory
- custom response tone across all conversations
- custom LLM routing
- custom TTS / ASR provider strategy
- persistent user preference modeling

If we want full control over those, we will eventually need:

- a self-hosted gateway, or
- a fully self-hosted backend

Upstream self-host references already listed by the official repo:

- [xinnan-tech/xiaozhi-esp32-server](https://github.com/xinnan-tech/xiaozhi-esp32-server)
- [joey-zhou/xiaozhi-esp32-server-java](https://github.com/joey-zhou/xiaozhi-esp32-server-java)
- [AnimeAIChat/xiaozhi-server-go](https://github.com/AnimeAIChat/xiaozhi-server-go)
- [hackers365/xiaozhi-esp32-server-golang](https://github.com/hackers365/xiaozhi-esp32-server-golang)

## 4. How to find and use the official configuration path

Recommended process:

1. Confirm the current firmware really comes from the XiaoZhi upstream ecosystem.
2. Confirm the device is connected to the official `xiaozhi.me` service.
3. Sign in to [xiaozhi.me](https://xiaozhi.me).
4. Check whether the bound device is visible in the official console.
5. Record which settings are exposed in the current account / device page.
6. Only after that decide whether official customization is enough.

## 5. Suggested DIY matrix for this project

### Safe to keep on the official backend

- current firmware flashing path
- official device registration
- official conversation service during demos

### Best customized locally by our team

- desktop UI
- bilingual presentation
- Live2D interaction
- logs and reminder UX
- demo flow

### Requires a deeper backend path later

- custom persona
- memory
- role-specific response style
- fully customized naming and identity on the cloud side
- replacing the official reply chain

## 6. Important note about wake words

The official assets path is the preferred route for wake-word customization, but wake-word behavior may still depend on whether the matching assets are actually available in the cloud / resource path for the current firmware line.

Useful reference:

- [Issue #1190 on wake-word configuration limitations](https://github.com/78/xiaozhi-esp32/issues/1190)

Practical recommendation:

- for light customization, prefer the official assets path first
- if the chosen wake word does not actually take effect, verify the exact firmware version and assets path before assuming the code is wrong

