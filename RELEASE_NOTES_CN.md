# sql-zen v0.2.0 发布说明

## 🎉 重大更新 - v0.2.0

### ✨ 新功能

- **📦 .env 文件支持** - 通过 .env 文件配置所有设置，无需手动 export 环境变量
- **🔧 自定义 API 配置** - 支持自定义 API 端点和模型选择
  - `ANTHROPIC_BASE_URL` - 自定义 API 端点（支持代理）
  - `ANTHROPIC_MODEL` - 自定义 Claude 模型
  - `--model` 和 `--base-url` 命令行选项
- **🗄️ MySQL 数据库支持** - 完整的 MySQL 支持（使用 mysql2）
- **🤖 智能工具循环** - Agent 现在可以多次调用工具来完成复杂任务
- **📊 测试数据生成器** - Python 脚本自动生成测试数据和 Schema 文件

### 🔧 改进

- **CLI 选项增强** - `ask` 命令支持 `--model` 和 `--base-url` 选项
- **配置文档** - 完整的配置指南（`docs/configuration.md`）
- **Schema 生成器** - 自动生成 Schema 层和 Cube 层 YAML 文件
- **工具结果反馈** - 正确处理多轮对话中的工具调用结果

### 🐛 Bug 修复

- 修复所有 TypeScript 编译错误
- 修复 `package.json` 中的 bin 路径
- 修复 Commander.js 命令语法
- 修复 MySQL 数据库连接问题
- 修复 API 响应处理

### 📦 依赖更新

- 新增：`dotenv` - .env 文件支持
- 新增：`mysql2` - MySQL 支持
- 新增：类型定义 `@types/pg`, `@types/better-sqlite3`, `@types/js-yaml`

### 📝 文档

- 新增 `docs/configuration.md` - 完整的配置指南
- 新增 `scripts/README.md` - 测试数据初始化指南
- 更新 `README.md` - 添加配置示例和使用场景

### 🧪 测试

使用真实 MySQL 数据库测试：
- ✅ 100 个用户、17 个商品、500 个订单
- ✅ 用户查询、收入查询、订单统计
- ✅ 使用 Cube 层指标的复杂多表查询

**测试示例：**
```bash
sql-zen ask "有多少用户？"
# 返回: 100 个用户

sql-zen ask "列出销量前5的商品及其收入"
# 返回: Apple Watch (189件, 56.68万元) 等
```

### 📦 包内容

- 43 个文件
- 26.4 kB 压缩包
- 107.6 kB 解压后

### 🚀 安装

```bash
npm install -g sql-zen
```

### ⚙️ 快速开始

```bash
# 1. 复制配置文件
cp .env.example .env

# 2. 编辑 .env 文件
#    ANTHROPIC_API_KEY=sk-ant-...
#    DB_HOST=...
#    DB_NAME=...

# 3. 初始化测试数据（可选）
python scripts/init-test-data.py

# 4. 开始查询
sql-zen ask "有多少用户？"
sql-zen ask "最近30天的总收入是多少？"
sql-zen ask "哪个城市的用户消费最多？"
```

### 📚 配置选项

```bash
# .env 文件
ANTHROPIC_API_KEY=sk-ant-...          # 必需
ANTHROPIC_BASE_URL=https://api...      # 可选
ANTHROPIC_MODEL=claude-3-5-sonnet...  # 可选
DB_HOST=localhost                      # 数据库配置
DB_PORT=3306
DB_NAME=mydb
DB_USER=root
DB_PASSWORD=...
```

### 🎯 主要特性

1. **极简主义** - 只用 2 个工具（execute_bash, execute_sql）完成所有查询
2. **双层语义架构** - Schema 层（结构）+ Cube 层（业务指标）
3. **智能探索** - Agent 自动探索 Schema 目录理解业务
4. **灵活配置** - 支持环境变量、.env 文件、命令行选项
5. **多数据库支持** - MySQL、PostgreSQL、SQLite

### 🔗 链接

- npm: https://www.npmjs.com/package/sql-zen
- GitHub: https://github.com/slicenferqin/sql-zen
- 文档: https://github.com/slicenferqin/sql-zen/blob/main/README.md

### 🤝 贡献

欢迎贡献！请查看 [Contributing Guide](https://github.com/slicenferqin/sql-zen/blob/main/CONTRIBUTING.md)

### 📄 许可证

MIT

---

感谢使用 SQL-Zen！🎯

如有问题，请在 [GitHub Issues](https://github.com/slicenferqin/sql-zen/issues) 提交。
