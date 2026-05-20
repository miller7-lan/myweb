# 提交规范

这份文档用于约束本项目的 Git 提交、推送和发布前检查，避免把临时文件、大体积下载包或未验证改动推到远程仓库。

## 提交前检查

每次提交前先确认工作区和构建状态：

```bash
git status --short
npm run build
```

如果只改文档，可以不跑完整构建，但要确认没有误改源码或配置文件。

## 提交信息格式

使用简洁的 Conventional Commits 风格：

```text
type(scope): summary
```

常用 `type`：

- `feat`: 新功能或新交互
- `fix`: 修复 bug
- `style`: 视觉样式、布局、动效调整
- `refactor`: 不改变行为的代码整理
- `docs`: 文档更新
- `chore`: 构建、配置、依赖、仓库维护

示例：

```text
feat(scene): add meteor impact effect
style(identity): enrich identity dashboard layout
fix(core): trigger completion glow after returning home
docs: add commit guide
chore: ignore large download artifacts
```

## 提交粒度

- 一次提交只表达一个清晰意图。
- 视觉调整和逻辑修复尽量分开提交。
- 大范围 UI 改动提交前必须跑 `npm run build`。
- 不把 `node_modules`、`dist`、`.env`、`.DS_Store` 提交进仓库。

## 下载资源

`public/downloads` 中的安装包和压缩包体积较大，尤其可能超过 GitHub 单文件 `100MB` 限制，因此默认不进 Git。

当前仓库只保留：

```text
public/downloads/README.txt
```

如果需要托管下载包，优先考虑：

- GitHub Releases
- 对象存储/CDN
- Git LFS

不要直接把大型 `.zip`、`.dmg`、`.apk` 提交到普通 Git 历史里。

## 推送流程

推荐流程：

```bash
git status --short
npm run build
git add .
git commit -m "type(scope): summary"
git push
```

推送前如果远程有新提交，先拉取并解决冲突：

```bash
git pull --rebase
```

## 当前远程仓库

```text
origin: https://github.com/miller7-lan/myweb.git
branch: main
```
