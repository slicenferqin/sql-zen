# Schema 设计方法论

本指南提供 SQL-Zen Schema 的设计原则、最佳实践和实施方法，帮助你创建高质量的语义层定义。

## 目录

1. [设计原则](#设计原则)
2. [表命名规范](#表命名规范)
3. [列设计指南](#列设计指南)
4. [关系建模](#关系建模)
5. [度量定义](#度量定义)
6. [示例数据](#示例数据)
7. [文档质量](#文档质量)
8. [验证清单](#验证清单)

---

## 设计原则

### 1. 语言精确性
- **描述必须精确**：避免模糊表述（如"数据表"），使用具体描述（如"存储客户订单信息，包含订单创建、支付、配送等完整生命周期"）
- **说明用途而非结构**：描述应该解释"为什么存在这个表"而不是"有哪些列"
- **业务视角**：使用业务语言而非技术语言

### 2. 上下文完整性
- **自解释**：每个表应该能够被独立理解，无需查看其他表
- **业务场景**：描述应该包含常见使用场景
- **数据范围**：明确说明数据的时间范围、地理范围或其他约束

### 3. 可查询性
- **常用过滤器**：为高频查询场景定义 `common_filters`
- **预定义度量**：为常见分析需求定义 `measures`
- **示例查询**：在 `examples/` 目录提供实际查询示例

### 4. 一致性
- **命名统一**：全项目范围内使用一致的命名风格
- **类型规范**：相同类型的数据在不同表中应该使用相同的类型命名
- **描述风格**：所有表和列的描述应该遵循相同的风格

---

## 表命名规范

### 文件命名
```
# 表名文件
schema/tables/
├── users.yaml
├── orders.yaml
├── order_items.yaml
└── products.yaml
```

### 表名称规则
- **单数形式**：`user` 而非 `users`
- **下划线分隔**：`order_item` 而非 `orderitem` 或 `order-item`
- **简洁明确**：避免过长名称，必要时使用缩写但保持一致性
- **前缀一致性**：相同业务模块使用相同前缀（如 `payment_`, `shipment_`）

### 表描述模板
```yaml
table:
  name: orders
  description: |
    存储所有订单信息，包含从创建到完成的全生命周期数据。
    
    涵盖订单创建、支付、发货、配送、退款等关键环节。
    不包含订单明细数据，明细请参考 order_items 表。
    
    数据范围：2020年1月至今，涵盖全球所有市场。
    
    常见场景：
    - 按时间维度分析订单量和金额趋势
    - 分析不同地区、渠道的订单表现
    - 订单生命周期状态转化分析
```

---

## 列设计指南

### 列命名规则
- **蛇形命名**：`created_at`, `user_id`, `total_amount`
- **主键**：`id` (如果表有唯一主键) 或 `{table_name}_id`
- **外键**：`{referenced_table}_id` (如 `user_id`, `product_id`)
- **时间戳**：`created_at`, `updated_at`, `{event}_at` (如 `shipped_at`)
- **布尔值**：`is_` 或 `has_` 前缀 (如 `is_active`, `has_discount`)
- **金额**：`_amount`, `_price` 后缀 (如 `total_amount`, `unit_price`)
- **计数**：`_count` 后缀 (如 `item_count`, `view_count`)

### 列类型选择
```yaml
# 推荐类型映射
columns:
  - name: id
    type: BIGINT
    description: "订单唯一标识符"

  - name: user_id
    type: BIGINT
    description: "关联用户的外键"

  - name: created_at
    type: TIMESTAMP
    description: "订单创建时间"

  - name: status
    type: VARCHAR(50)
    description: "订单状态"
    enum:
      - value: pending
        description: "待支付"
      - value: paid
        description: "已支付"

  - name: total_amount
    type: DECIMAL(10,2)
    description: "订单总金额（货币单位）"

  - name: is_active
    type: BOOLEAN
    description: "订单是否有效"
```

### 列描述模板
每个列描述应该包含：
1. **基本含义**：这个列代表什么
2. **取值范围**：可能的值范围或约束
3. **业务规则**：任何重要的业务规则或计算逻辑
4. **与其他列的关系**：依赖或关联关系

```yaml
- name: total_amount
  type: DECIMAL(10,2)
  description: |
    订单总金额，包含商品金额、运费、税费等所有费用。
    
    计算方式：商品金额 + 运费 - 优惠券金额 + 税费
    单位：USD
    最小值：0.01（最小订单金额）
    典型范围：10 - 50000
    取决于订单明细（order_items）中所有 item_amount 的总和
    
    注意：退款后此值不会改变，请参考 refunded_amount 列
```

### 枚举值定义
对于状态码、类型等有限取值集，必须定义枚举：

```yaml
- name: status
  type: VARCHAR(50)
  description: "订单当前状态，反映订单生命周期的各个阶段"
  enum:
    - value: pending
      description: "订单已创建，等待用户支付"
    - value: paid
      description: "用户已支付，等待仓库发货"
    - value: shipped
      description: "订单已发货，在配送途中"
    - value: delivered
      description: "订单已送达客户"
    - value: cancelled
      description: "订单已取消，未支付或支付后退回"
    - value: refunded
      description: "订单已退款，全部或部分退款"
```

---

## 关系建模

### 外键定义
明确声明外键关系，帮助 LLM 理解表间关联：

```yaml
- name: user_id
  type: BIGINT
  description: "关联用户的唯一标识"
  foreign_key:
    table: users
    column: id
```

### 关联关系表（joins/目录）
定义复杂的 JOIN 关系：

```yaml
# schema/joins/order-user.yaml
relationship:
  name: order_to_user
  from_table: orders
  to_table: users
  type: many_to_one
  join_sql: |
    INNER JOIN users ON orders.user_id = users.id
  description: |
    每个订单属于一个用户，一个用户可以有多个订单。
    
    关联字段：orders.user_id → users.id
    
    常见使用场景：
    - 获取订单的用户信息（姓名、邮箱等）
    - 按用户维度分析订单行为
    - 计算用户的订单相关指标（总金额、订单数）
```

### 关系类型选择
- **one_to_one**：一对一（如用户资料与用户账户）
- **one_to_many**：一对多（如用户与订单）
- **many_to_one**：多对一（如订单与用户）
- **many_to_many**：多对多（如订单与产品，通过 order_items）

---

## 度量定义

### 常见度量（measures/目录）
为高频分析需求预定义度量：

```yaml
# schema/measures/order-metrics.yaml
measures:
  - name: total_orders
    sql: "COUNT(*)"
    description: "订单总数，包含所有状态的订单"
    filters:
      - "created_at >= :start_date"
      - "created_at <= :end_date"

  - name: total_revenue
    sql: "SUM(total_amount)"
    description: "总订单金额，包含已支付订单的金额总和"
    filters:
      - "status IN ('paid', 'shipped', 'delivered')"
      - "created_at >= :start_date"
      - "created_at <= :end_date"

  - name: average_order_value
    sql: "AVG(total_amount)"
    description: "平均订单金额（AOV）"
    filters:
      - "status IN ('paid', 'shipped', 'delivered')"
```

### 在表中定义度量
特定表的度量可以直接在表定义中：

```yaml
table:
  name: orders
  # ...其他字段

  measures:
    - name: daily_revenue
      sql: "SUM(total_amount)"
      description: "每日订单收入"
      filters: ["DATE(created_at) = CURRENT_DATE"]

    - name: pending_orders_count
      sql: "COUNT(*)"
      description: "待支付订单数量"
      filters: ["status = 'pending'"]
```

---

## 示例数据

### 列级示例（examples字段）
为复杂列提供示例值：

```yaml
- name: shipping_address
  type: TEXT
  description: "配送地址信息"
  examples:
    - "123 Main Street, New York, NY 10001, USA"
    - "456 Park Avenue, Los Angeles, CA 90001, USA"
```

### 查询级示例（examples/目录）
提供完整的 SQL 查询示例：

```sql
-- schema/examples/daily-orders.sql
-- 获取每日订单数量和金额趋势

SELECT
  DATE(created_at) as order_date,
  COUNT(*) as order_count,
  SUM(total_amount) as total_revenue,
  AVG(total_amount) as avg_order_value
FROM orders
WHERE created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
GROUP BY DATE(created_at)
ORDER BY order_date DESC;
```

### 示例查询注释
每个示例查询应该包含：
- 查询目的说明
- 关键业务逻辑解释
- 参数使用说明
- 性能优化提示

---

## 文档质量

### 描述质量检查清单
- [ ] 描述是否准确反映业务含义？
- [ ] 是否避免了技术术语，使用业务语言？
- [ ] 是否包含了常见的使用场景？
- [ ] 是否说明了数据的约束和范围？
- [ ] 枚举值是否有明确的含义说明？
- [ ] 外键关系是否清晰说明？
- [ ] 度量定义是否包含过滤条件？

### 文档风格指南
- **简洁性**：每段描述不超过 3 句话
- **完整性**：包含关键信息，不遗漏重要细节
- **可读性**：使用项目符号、列表、换行增强可读性
- **一致性**：整个项目中使用相同的术语和表达方式

---

## 验证清单

### 表定义验证
- [ ] 表名符合命名规范
- [ ] 描述包含业务用途和数据范围
- [ ] 主键明确标识
- [ ] 所有外键都有定义和目标表
- [ ] 列类型准确反映数据类型
- [ ] 所有状态/类型列都有枚举定义
- [ ] 常用过滤器已定义
- [ ] 高频度量已定义

### 关系验证
- [ ] 关系类型正确（one_to_one, one_to_many 等）
- [ ] JOIN SQL 语法正确
- [ ] 关系描述说明了使用场景

### 示例验证
- [ ] 每个示例查询都有清晰的注释
- [ ] 示例涵盖了常见查询模式
- [ ] 复杂业务逻辑有解释说明

### 整体验证
```bash
# 使用 SQL-Zen 验证命令
sql-zen validate
```

---

## 参考资源

- [Schema 完整示例](./table-design.md)
- [列命名规范](./column-naming.md)
- [关系设计模式](./relationship-design.md)
- [SQL 最佳实践](./sql-best-practices.md)
- [官方设计文档](../docs/design.md)

---

## 常见问题

### Q: 如何决定是否定义外键？
A: 如果列引用了另一个表的主键，应该定义外键。这能帮助 LLM 理解表间关系，生成正确的 JOIN 语句。

### Q: 什么时候使用枚举？
A: 当列的取值是有限的、预定义的集合时（如状态码、类型、分类），应该定义枚举。这能显著提升查询准确性。

### Q: 度量应该在表定义中还是单独文件？
A: 如果度量仅用于单个表，放在表定义中。如果度量跨多个表或被多个场景复用，放在单独的 measures 文件中。

### Q: 描述应该多长？
A: 平衡详细性和简洁性。一般 2-3 句话，必要时使用项目符号列出关键信息。避免过于简短（如"用户ID"）或过于冗长。

### Q: 如何处理复杂计算字段？
A: 在描述中解释计算逻辑，或者创建一个视图并在 Schema 中引用视图。对于常用的计算字段，可以定义为度量。

---

## 进阶主题

### 多语言支持
如果系统需要支持多语言查询，可以在描述中包含同义词：

```yaml
table:
  name: orders
  description: |
    订单表 | Orders table
    存储所有订单信息，包含从创建到完成的全生命周期数据。
    Stores all order information, covering the complete lifecycle from creation to completion.
```

### 时区处理
明确说明时间字段的时区：

```yaml
- name: created_at
  type: TIMESTAMP
  description: |
    订单创建时间
    时区：UTC（统一存储，查询时需转换）
```

### 数据版本控制
如果数据有版本演进，在描述中说明：

```yaml
table:
  name: orders
  description: |
    订单表
    版本：v2.0（2023年1月后）
    v1.0 版本字段差异：移除了 discount_amount，新增了 coupon_code
```

---

通过遵循这些方法论，你可以创建高质量、易于理解的 SQL-Zen Schema，显著提升 Text-to-SQL 的准确性。
