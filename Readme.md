## 准备工作

1. 全局安装 lark-cli (https://github.com/larksuite/cli/blob/main/README.zh.md)
```bash
npx @larksuite/cli@latest install
```
2. 全局安装 meegle-cli (https://github.com/larksuite/meegle-cli/blob/main/README.zh-CN.md)
```bash
npm install -g @lark-project/meegle
```
3. 全局启用飞书项目MCP
- 参照飞书项目官方文档修改 mcp.json

## 使用

将当前文档内的config\skills\mcp.json 复制到你的全局 ～/.agents/ 目录或者项目下的.agents下，即可使用

### 提示词

没有特殊提示词，示例：
```bash
调用 $cem-feishu-project-bug-debugger https://project.feishu.cn/xxxx 排查并修复问题
```
