# 测试数据初始化指南

本指南帮助你快速初始化测试数据库和 Schema 文件，以便测试 SQL-Zen 的 `ask` 命令。

## 前置要求

1. **PostgreSQL 数据库**
   ```bash
   # macOS
   brew install postgresql
   brew services start postgresql
   
   # 创建测试数据库
   createdb test
   ```

2. **Python 环境**
   ```bash
   # 安装 psycopg2
   pip install psycopg2-binary
   ```

3. **环境变量配置**
   ```bash
   # 在 .env 文件中配置
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=test
   DB_USER=postgres
   DB_PASSWORD=your_password
   ```

## 快速开始

### 1. 运行初始化脚本

```bash
# 方式 1: 使用环境变量
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=test
export DB_USER=postgres
export DB_PASSWORD=your_password

python scripts/init-test-data.py

# 方式 2: 使用 .env 文件（推荐）
# 确保 .env 文件已配置好数据库信息
python scripts/init-test-data.py
```

### 2. 脚本会自动完成

✅ **创建数据库表**
- `users` - 用户表（100条记录）
- `products` - 商品表（17个商品）
- `orders` - 订单表（500条记录）
- `order_items` - 订单明细表（约1000+条记录）

✅ **生成 Schema 层文件**
- `schema/tables/users.yaml`
- `schema/tables/products.yaml`
- `schema/tables/orders.yaml`
- `schema/tables/order_items.yaml`
- `schema/joins/relationships.yaml`

✅ **生成 Cube 层文件**
- `schema/cubes/business-metrics.yaml` - 核心业务指标
- `schema/cubes/user-analytics.yaml` - 用户分析指标
- `schema/cubes/product-analytics.yaml` - 商品分析指标

## 数据概览

### 用户数据 (100人)
- 分布在10个城市：北京、上海、广州、深圳、杭州、成都、武汉、西安、南京、重庆
- 90% 活跃用户，10% 非活跃用户
- 注册时间：过去1年内随机分布

### 商品数据 (17个)
- **电子产品**: iPhone 15 Pro, MacBook Pro, AirPods Pro, iPad Air, Apple Watch
- **服装**: 运动T恤, 牛仔裤, 羽绒服, 运动鞋, 休闲外套
- **食品**: 有机牛奶, 进口坚果, 咖啡豆
- **家居**: 智能台灯, 床上四件套
- **图书**: Python编程, 数据结构

### 订单数据 (500个)
- 订单状态分布：
  - 5% pending（待支付）
  - 15% paid（已支付）
  - 10% shipped（已发货）
  - 60% completed（已完成）
  - 10% cancelled（已取消）
- 订单时间：最近90天内随机分布
- 每个订单包含 1-5 个商品

## 测试查询示例

初始化完成后，可以测试以下查询：

### 基础查询

```bash
# 收入查询
sql-zen ask "最近30天的总收入是多少？"
sql-zen ask "上个月的收入是多少？"

# 订单统计
sql-zen ask "今天有多少订单？"
sql-zen ask "最近7天的订单完成率是多少？"
sql-zen ask "订单取消率是多少？"

# 用户统计
sql-zen ask "有多少活跃用户？"
sql-zen ask "最近30天新注册了多少用户？"
sql-zen ask "付费用户有多少？"
```

### 业务指标查询（使用 Cube 层）

```bash
# 使用 --cube 选项优先使用 Cube 层定义的指标
sql-zen ask --cube "最近30天的总收入是多少？"
sql-zen ask --cube "平均订单金额（AOV）是多少？"
sql-zen ask --cube "客户生命周期价值（CLV）是多少？"
sql-zen ask --cube "用户转化率是多少？"
```

### 维度分析

```bash
# 城市维度
sql-zen ask "哪个城市的用户消费最多？"
sql-zen ask "按城市统计订单数量"

# 时间维度
sql-zen ask "按月统计最近3个月的收入趋势"
sql-zen ask "按周统计订单数量"

# 商品类别维度
sql-zen ask "哪��类别的商品销量最好？"
sql-zen ask "各类别商品的利润率是多少？"
```

### 复杂查询

```bash
# Top N 查询
sql-zen ask "列出销量前5的商品及其收入"
sql-zen ask "消费金额最高的10个用户是谁？"

# 多表关联
sql-zen ask "哪些用户购买了iPhone 15 Pro？"
sql-zen ask "电子产品类别的平均订单金额是多少？"

# 聚合分析
sql-zen ask "按支付方式统计订单数量和金额"
sql-zen ask "每个城市的人均订单数是多少？"
```

### 利润分析

```bash
sql-zen ask "哪个商品的利润最高？"
sql-zen ask "各类别商品的总利润是多少？"
sql-zen ask "利润率最高的前3个商品是什么？"
```

## 验证数据

可以直接连接数据库验证数据：

```bash
# 连接数据库
psql -h localhost -U postgres -d test

# 查看表
\dt

# 查看数据
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM order_items;

# 查看订单状态分布
SELECT status, COUNT(*) FROM orders GROUP BY status;

# 查看收入统计
SELECT 
  SUM(total_amount) as total_revenue,
  COUNT(*) as total_orders,
  AVG(total_amount) as avg_order_value
FROM orders 
WHERE status IN ('paid', 'shipped', 'completed');
```

## 重新初始化

如果需要重新初始化数据：

```bash
# 脚本会自动删除旧表并重新创建
python scripts/init-test-data.py
```

## 故障排查

### 问题 1: 数据库连接失败

```
❌ 数据库连接失败: connection refused
```

**解决方案**:
1. 确认 PostgreSQL 服务正在运行
   ```bash
   # macOS
   brew services list
   brew services start postgresql
   
   # Linux
   sudo systemctl status postgresql
   sudo systemctl start postgresql
   ```

2. 检查数据库是否存在
   ```bash
   psql -l | grep test
   # 如果不存在，创建数据库
   createdb test
   ```

3. 验证连接信息
   ```bash
   psql -h localhost -U postgres -d test
   ```

### 问题 2: 权限不足

```
❌ permission denied for database test
```

**解决方案**:
```bash
# 授予用户权限
psql -U postgres
GRANT ALL PRIVILEGES ON DATABASE test TO your_user;
```

### 问题 3: psycopg2 未安装

```
ModuleNotFoundError: No module named 'psycopg2'
```

**解决方案**:
```bash
pip install psycopg2-binary
```

## 数据特点

### 真实性
- 订单状态流转符合业务逻辑（pending -> paid -> shipped -> completed）
- 时间戳合理（支付时间 > 下单时间，发货时间 > 支付时间）
- 价格和成本符合实际（有利润空间）

### 多样性
- 多个城市分布
- 多个商品类别
- 多种支付方式
- 不同订单状态

### 可测试性
- 足够的数据量（500个订单）
- 覆盖各种业务场景
- 支持复杂的聚合查询
- 适合测试 Cube 层的业务指标

## 下一步

1. ✅ 运行初始化脚本
2. ✅ 验证数据已创建
3. ✅ 检查 Schema 文件已生成
4. 🚀 开始测试 `sql-zen ask` 命令
5. 📊 尝试各种业务查询
6. 🎯 验证 Cube 层指标是否正确

祝测试顺利！🎉
