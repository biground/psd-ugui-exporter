# PSD UGUI Exporter Agent Rules

## 打包与发版

- 当用户说“打包”“release 包”“发版”“构建安装包”“生成 macOS .app”“双击可用 app”或类似请求时，先使用项目级 skill：`.codex/skills/package-psdui-release`。
- 打包必须针对真实 Tauri 图形界面编辑器，不要把根目录 CLI 工具或临时文件选择器包装成 app。
- 默认 macOS 打包命令：

```bash
bash .codex/skills/package-psdui-release/scripts/package_macos_app.sh
```

- 如果用户要求验证可双击启动，使用：

```bash
SMOKE_LAUNCH=1 bash .codex/skills/package-psdui-release/scripts/package_macos_app.sh
```

- 完成前必须报告最终 zip 路径、体积、校验和，并说明验证命令结果。
