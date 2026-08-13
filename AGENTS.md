# Fork 维护规范

## 分支职责

- `main` 是 `upstream/main` 的镜像。不要向其中添加 fork 专属代码、文档、版本变更、标签或 npm 发布记录。
- `fork` 包含 fork 专属功能，是唯一允许用于 npm 发布的分支。
- `origin` 指向本仓库的 GitHub fork；`upstream` 指向 `https://github.com/koishi-shangxue-plugins/koishi-plugin-adapter-qq-crack.git`。

## 手动同步上游

同步前必须确认工作区干净。手动更新 `main`：

```powershell
git switch main
git fetch upstream main
git reset --hard upstream/main
git push origin main --force-with-lease
```

随后更新发布分支并验证：

```powershell
git switch fork
git rebase main
cd G:\GGames\Minecraft\shuyeyun\qq-bot\koishi-dev\koishi-dev-8
yarn build adapter-qq-crack-vincentzyu-fork
git push origin fork --force-with-lease
```

在 `fork` 中解决 rebase 冲突；不要将 fork 的修改合并回 `main`。

## 发布

- 仅可在构建通过后的 `fork` 分支发布。
- 在 `fork` 中更新包版本与变更日志、创建提交、打对应 Git 标签，再发布到 npm。
- 禁止从 `main` 发布。

## 提交信息

- 后续提交必须使用 Conventional Commits 格式：`<type>(<scope>): <description>`。
- `type` 使用英文小写，例如 `feat`、`fix`、`refactor`、`docs`、`test`、`build` 或 `chore`。
- `scope` 使用英文；冒号后的 `description` 必须使用中文，例如 `feat(stream): 支持按会话类型选择自动流式消息`。
- 提交标题应按上述规则中英混用；不要使用全中文或全英文的提交标题。

## Fork 专属配置

- `autoStreamText` 是包含 `私聊官方V2`、`私聊旧版兼容` 和 `群聊旧版兼容` 的位掩码配置，默认只启用 `私聊官方V2`；官方 V2 在默认 `normal` 策略下仍保持普通发送。
- 旧版布尔值 `autoStreamText` 被有意设为不兼容；修改该选项时必须记录手动迁移方式。
- 指令面板只允许修改 `remark=koishi-adapter-qq-crack:managed` 的托管面板；不可覆盖用户手工创建的面板。
- `enableCommandPanel` 默认开启，`commandPanelMode` 默认使用 `manual`；Console 左侧页面始终注册。

## 构建命令

- 本包属于 Koishi Yarn 工作区。请在工作区根目录运行 `yarn build adapter-qq-crack-vincentzyu-fork`。
- 不要在本包目录执行 `npm exec tsc`，因为工作区包含同名的上游检出目录，npm 会因重复工作区而拒绝执行。
