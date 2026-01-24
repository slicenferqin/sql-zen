# SQL-Zen 本地测试手册

## 环境准备

### 1. 安装依赖

```bash
# 确保 TypeScript 已安装
npm install --save-dev typescript
```

### 2. 配置环境变量

```bash
# 设置 Anthropic API Key（必需）
export ANTHROPIC_API_KEY="sk-ant-your-api-key-here"

# 可选：设置数据库连接（用于实际查询测试）
# PostgreSQL
# export DATABASE_TYPE="postgresql"
# export DATABASE_URL="postgresql://user:pass@localhost:5432/mydb"

# MySQL
# export DATABASE_TYPE="mysql"
# export DATABASE_URL="mysql://user:pass@localhost:3306/mydb"

# SQLite
# export DATABASE_TYPE="sqlite"
# export DATABASE_URL="/path/to/database.db"
```

### 3. 验证依赖安装

```bash
# 检查 node_modules 是否存在
ls node_modules | head -5

# 检查 TypeScript 版本
npx tsc --version
```

---

## 编译测试

### 1. 基础编译

```bash
# 编译 TypeScript 代码
npm run build

# 检查编译结果
ls -la dist/

# 应该看到：
# - dist/agent/
# - dist/cli.js
# - dist/schema/
# - dist/tools/
# - dist/types/
# - dist/index.js
```

### 2. 检查编译错误

如果编译失败，检查错误信息：

```bash
# 查看完整错误
npm run build 2>&1 | head -50

# 查找特定错误模式
npm run build 2>&1 | grep -i "error TS"
```

### 3. 修复编译错误（如有）

**当前已知问题**：

如果看到类型错误，检查：
1. `node_modules/@anthropic-ai/sdk` 是否已安装
2. TypeScript 版本是否兼容
3. 类型定义是否完整

---

## CLI 功能测试

### 1. 测试 init 命令

```bash
# 在空目录测试
mkdir test-sqlzen && cd test-sqlzen
sql-zen init

# 验证目录结构
ls -la schema/

# 应该创建：
# - schema/tables/
# - schema/joins/
# - schema/cubes/
# - schema/skills/
# - schema/examples/
# - schema/.gitignore

# 清理
cd ..
rm -rf test-sqlzen
```

### 2. 测试 validate 命令

```bash
# 验证 Schema 层
sql-zen validate

# 验证 Cube 层
sql-zen validate --cube

# 检查输出
# 应该显示 "Schema is valid!"
```

### 3. 测试 cube 命令（创建新 Cube）

```bash
# 创建一个新的 Cube
sql-zen cube user-analytics

# 验证创建的文件
ls -la schema/cubes/

# 编辑创建的 Cube
vim schema/cubes/user-analytics.yaml
# 或
# cat schema/cubes/user-analytics.yaml
```

---

## Agent 功能测试（需要数据库）

### 1. 测试 ask 命令（模拟）

```bash
# 测试基础查询
sql-zen ask "测试查询"

# 测试 Cube 层优先查询
sql-zen ask --cube "最近30天收入是多少？"

# 测试简单查询
sql-zen ask "列出所有用户"
```

### 2. 测试错误处理

```bash
# 测试无效命令
sql-zen invalid-command

# 测试缺少环境变量
unset ANTHROPIC_API_KEY
sql-zen ask "测试"
```

---

## Cube 层功能测试

### 1. Cube 解析器测试

```bash
# 测试 Cube 文件解析
node -e "const { CubeParseError } = require('./dist/schema/cube-parser.js');
const fs = require('fs');
const content = fs.readFileSync('schema/cubes/business-analytics.yaml', 'utf8');
const parser = new require('./dist/schema/parser.js')();
parser.parseCubesDirectory('schema/cubes').then(cubes => {
  console.log('Cubes:', cubes);
  if (cubes.length > 0) {
    console.log('First cube:', cubes[0].name);
  }
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});"
```

### 2. Cube 查找功能测试

```bash
# 测试查找度量
node -e "const { SchemaParser } = require('./dist/schema/parser.js');
const parser = new SchemaParser('schema/');
parser.findMetric('revenue').then(result => {
  if (result) {
    console.log('Found:', result.metric.name);
    console.log('SQL:', result.metric.sql);
  }
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});"
```

### 3. Cube 验证功能测试

```bash
# 测试 Cube 验证
node -e "const { validateCube } = require('./dist/schema/cube-parser.js');
const businessAnalytics = {
  name: 'business_analytics',
  description: '测试 Cube',
  dimensions: [{ name: 'time', description: '时间维度' }],
  metrics: [{ name: 'revenue', sql: 'SUM(amount)', description: '总收入' }]
};
validateCube(businessAnalytics).then(validation => {
  if (!validation.valid) {
    console.error('Validation errors:', validation.errors);
  }
  process.exit(0);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});"
```

---

## 集成测试（完整流程）

### 1. 端到端测试

```bash
# 启动 CLI（使用 Node 直接）
node dist/cli.js ask "测试查询"

# 验证输出
# 应该返回 SQL 查询结果
```

### 2. 错误恢复测试

```bash
# 测试各种错误场景
sql-zen ask "不存在的表"
sql-zen ask "错误的 SQL 语法"
sql-zen ask "超出权限的查询"
```

---

## 常见问题排查

### 问题 1: 编译失败

**症状**：
```
npm run build
# 输出大量 TypeScript 错误
```

**解决方案**：

1. 确保 TypeScript 已安装：
```bash
npm install --save-dev typescript
```

2. 清理并重新安装：
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

3. 检查 TypeScript 配置：
```bash
# 查看 tsconfig.json
cat tsconfig.json
```

### 问题 2: npm install 失败

**症状**：
```
npm install
# 输出 JSON 解析错误
```

**解决方案**：

1. 验证 package.json 格式：
```bash
# 使用 JSON 验证工具
node -e "const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log('Valid JSON:', pkg);
console.log('Dependencies:', Object.keys(pkg.dependencies));
"
```

2. 清理 npm 缓存：
```bash
rm -rf ~/.npm/_cacache
npm install
```

### 问题 3: CLI 执行失败

**症状**：
```
sql-zen ask "测试"
# 输出错误：Command failed with exit code 1
```

**排查步骤**：

1. 检查环境变量：
```bash
echo "ANTHROPIC_API_KEY: $ANTHROPIC_API_KEY"
```

2. 检查 dist 目录：
```bash
ls -la dist/
```

3. 测试 Node 执行：
```bash
# 直接执行编译后的文件
node dist/cli.js ask "测试"
```

---

## 发布前检查清单

### 代码质量检查

- [ ] TypeScript 编译无错误
- [ ] dist 目录包含所有必要文件
- [ ] CLI 命令可以执行
- [ ] Schema 验证功能正常
- [ ] 创建 Cube 功能正常
- [ ] 测试手册中的测试用例通过

### 文档完整性检查

- [ ] README.md 更新并包含 Cube 层说明
- [ ] Cube 设计指南完整
- [ ] Cube 用户指南完整
- [ ] 设计文档更新
- [ ] 所有文档链接正确

### 功能完整性检查

- [ ] init 命令创建 cubes/ 目录
- [ ] validate 支持 --cube 参数
- [ ] ask 支持 --cube 选项
- [ ] cube 命令创建新 Cube
- [ ] Agent Skills 支持双层层架构

---

## 发布流程

### 1. 版本标记

```bash
# 创建 v0.2.0 tag
git tag -a v0.2.0 -m "v0.2.0 - Dual-layer semantic architecture"

# 推送 tag
git push origin v0.2.0
```

### 2. 发布到 npm

```bash
# 发布到 npm
npm publish

# 验证发布
npm view sql-zen
```

---

## 快速测试清单

### 最小可用测试（5 分钟）

```bash
# 1. 编译
time npm run build

# 2. 创建测试项目
time mkdir test-quick && cd test-quick
time sql-zen init

# 3. 验证 Schema
time sql-zen validate

# 4. 验证 Cube
time sql-zen validate --cube
```

### 完整功能测试（15 分钟）

```bash
# 1. 完整编译和验证
time npm run build && npm run lint

# 2. 创建测试项目并测试所有功能
time sql-zen init
time sql-zen cube user-analytics
time sql-zen ask --cube "测试查询"

# 3. 清理
rm -rf test-quick
```

---

## 成功标准

### 编译成功
- ✅ 无 TypeScript 错误
- ✅ dist 目录包含完整文件结构
- ✅ 所有类型定义正确

### 功能正常
- ✅ init 命令成功创建目录结构
- ✅ validate 命令可以验证 Schema 和 Cube
- ✅ ask 命令可以执行查询
- ✅ cube 命令可以创建新 Cube

### 文档完整
- ✅ Cube 层概念清晰易懂
- ✅ 设计指南完整
- ✅ 用户指南完整
- ✅ 示例和教程完整

---

## 下一步

如果所有测试通过：

1. 创建并推送 v0.2.0 tag
2. 发布到 npm
3. 更新 GitHub Release Notes

如果有任何问题，记录详细的错误信息：
```bash
# 记录错误日志
npm run build > build-errors.log 2>&1

# 查看日志
cat build-errors.log
```
