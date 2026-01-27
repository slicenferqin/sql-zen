# SQL-Zen 配置指南

## 环境变量配置

SQL-Zen 支持通过 `.env` 文件或环境变量进行配置。

### 1. 使用 .env 文件（推荐）

在项目根目录创建 `.env` 文件：

```bash
# 复制示例文件
cp .env.example .env

# 编辑 .env 文件
vim .env
```

### 2. 配置项说明

#### Anthropic API 配置

```bash
# 必需：API Key
ANTHROPIC_API_KEY=sk-ant-your-api-key-here

# 可选：自定义 API 端点
# 默认值：https://api.anthropic.com
# 使用场景：
# - 使用代理服务
# - 私有部署的 API
# - 第三方兼容服务
ANTHROPIC_BASE_URL=https://your-proxy.com/v1

# 可选：自定义模型
# 默认值：claude-3-5-sonnet-20241022
# 可选模型：
# - claude-3-5-sonnet-20241022 (推荐，平衡性能和成本)
# - claude-3-opus-20240229 (最强性能)
# - claude-3-haiku-20240307 (最快速度，最低成本)
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

#### 数据库配置

```bash
# PostgreSQL
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mydb
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=false

# MySQL
# DB_TYPE=mysql
# DB_HOST=localhost
# DB_PORT=3306
# DB_NAME=mydb
# DB_USER=root
# DB_PASSWORD=your_password

# SQLite
# DB_TYPE=sqlite
# DB_PATH=/path/to/database.db
```

#### 缓存配置

```bash
# 启用/禁用缓存（默认: true）
ENABLE_CACHE=true

# 缓存 TTL，单位毫秒（默认: 300000，即 5 分钟）
CACHE_TTL=300000

# 最大缓存条目数（默认: 100）
CACHE_MAX_SIZE=100

# 缓存数据库路径（默认: ~/.sql-zen/cache.db）
CACHE_DB_PATH=~/.sql-zen/cache.db
```

更多缓存配置详情请参考 [缓存系统文档](./caching.md)。

## 命令行选项

除了环境变量，还可以通过命令行选项临时覆盖配置：

### ask 命令选项

```bash
sql-zen ask <question> [options]

Options:
  --cube              优先使用 Cube 层的业务指标
  --model <model>     指定使用的 Claude 模型
  --base-url <url>    指定自定义的 API 端点
  --no-cache          禁用查询结果缓存
```

### cache 命令

```bash
# 查看缓存统计信息
sql-zen cache stats

# 清空所有缓存
sql-zen cache clear
```

### 使用示例

```bash
# 使用默认配置
sql-zen ask "上个月收入是多少？"

# 使用自定义模型
sql-zen ask "用户转化率" --model claude-3-opus-20240229

# 使用自定义 API 端点
sql-zen ask "最近30天订单数" --base-url https://your-proxy.com/v1

# 组合使用多个选项
sql-zen ask "客户生命周期价值" \
  --cube \
  --model claude-3-haiku-20240307 \
  --base-url https://api.example.com
```

## 配置优先级

当同一配置项有多个来源时，优先级从高到低：

1. **命令行选项** - 最高优先级
   ```bash
   sql-zen ask "query" --model claude-3-opus-20240229
   ```

2. **环境变量** - 中等优先级
   ```bash
   export ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
   ```

3. **默认值** - 最低优先级
   - Model: `claude-3-5-sonnet-20241022`
   - Base URL: `https://api.anthropic.com`

## 常见配置场景

### 场景 1：使用代理服务

如果你在中国大陆或需要通过代理访问 Anthropic API：

```bash
# .env 文件
ANTHROPIC_API_KEY=sk-ant-your-key
ANTHROPIC_BASE_URL=https://your-proxy.com/v1
```

### 场景 2：成本优化

使用更便宜的模型降低成本：

```bash
# .env 文件
ANTHROPIC_API_KEY=sk-ant-your-key
ANTHROPIC_MODEL=claude-3-haiku-20240307
```

或临时使用：

```bash
sql-zen ask "简单查询" --model claude-3-haiku-20240307
```

### 场景 3：性能优先

使用最强模型处理复杂查询：

```bash
sql-zen ask "复杂的多表关联查询" --model claude-3-opus-20240229
```

### 场景 4：本地开发

本地开发时使用 SQLite：

```bash
# .env 文件
ANTHROPIC_API_KEY=sk-ant-your-key
DB_TYPE=sqlite
DB_PATH=./dev.db
```

### 场景 5：生产环境

生产环境使用 PostgreSQL 并启用 SSL：

```bash
# .env 文件
ANTHROPIC_API_KEY=sk-ant-your-key
DB_TYPE=postgresql
DB_HOST=prod-db.example.com
DB_PORT=5432
DB_NAME=production
DB_USER=app_user
DB_PASSWORD=secure_password
DB_SSL=true
```

## 安全建议

1. **���要提交 .env 文件到版本控制**
   - `.env` 已在 `.gitignore` 中
   - 使用 `.env.example` 作为模板

2. **使用环境变量管理工具**
   - 开发环境：使用 `.env` 文件
   - 生产环境：使用 Docker secrets、Kubernetes secrets 等

3. **定期轮换 API Key**
   - 定期更新 `ANTHROPIC_API_KEY`
   - 使用不同的 key 用于开发和生产

4. **限制数据库权限**
   - 使用只读用户进行查询
   - 避免使用 root 或 admin 账户

## 故障排查

### 问题 1：API Key 无效

```bash
Error: ANTHROPIC_API_KEY environment variable is required
```

**解决方案**：
1. 检查 `.env` 文件是否存在
2. 确认 API Key 格式正确（以 `sk-ant-` 开头）
3. 尝试直接 export：`export ANTHROPIC_API_KEY=sk-ant-...`

### 问题 2：无法连接 API

```bash
Error: connect ETIMEDOUT
```

**解决方案**：
1. 检查网络连接
2. 如果在中国大陆，配置 `ANTHROPIC_BASE_URL` 使用代理
3. 检查防火墙设置

### 问题 3：数据库连接失败

```bash
Error: Database connection failed
```

**解决方案**：
1. 检查数据库配置是否正确
2. 确认数据库服务正在运行
3. 验证用户名和密码
4. 检查网络连接和防火墙

## 更多信息

- [README.md](../README.md) - 项目概览
- [TESTING.md](../TESTING.md) - 测试指南
- [API 文档](https://docs.anthropic.com/) - Anthropic API 官方文档
