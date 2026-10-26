# DSH 工作区

这个目录专门放自己写的 DSH 插件。目前只有一个：`plugins/companion`。

## 为什么用 git

插件是**软链接**安装的：`install_bundle` 把 `plugins/companion` 这个目录链进 profile，
所以"当前运行的代码"就是这里的文件。没有另一份已安装的副本可以回退。

这意味着两件事：

- 改文件 = 改运行中的插件（下次重载生效），所以必须能回滚。
- 数据（对话、角色、画像）**不在这个仓库里**，它在 `~/.dsh/companion/`，
  回滚代码不会回滚数据。

git 在这里的作用就是：给每个"能用"的状态打一个 tag，随时退得回去。

## 日常流程

```bash
# 改代码 → 重载插件验证 → 觉得可以了
git add -A
git commit -m "说人话，写清楚改了什么"
git tag v0.1.1
```

版本号写在 `plugins/companion/package.json` 的 `version` 里，插件管理器会显示它。
改了行为就顺手改版本号，tag 和它保持一致。

## 回滚到某个版本

```bash
git log --oneline            # 找到要回去的版本
git checkout v0.1.0 -- .     # 把文件恢复到那个 tag
```

然后在插件的「管理」里关一次、开一次（或者重启 DSH），让宿主重新加载代码。

**回滚前先备份数据**：

```bash
cp ~/.dsh/companion/state.json ~/.dsh/companion/state.before-rollback.json
```

因为新版本可能已经按新结构写过存档，旧代码不一定读得懂。插件自己每天也会存一份到
`~/.dsh/companion/backups/`，留最近 7 天。

## 升级时的检查清单

1. 看 `plugins/companion/package.json` 的 `version` 有没有变。
2. 看 `plugins/companion/CHANGELOG.md` 有没有写"数据结构变更"。
3. 有的话，先备份 `state.json`。
4. 重载插件，看日志里有没有 `companion` 相关的报错。
