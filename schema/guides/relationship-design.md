# 关系设计模式

本指南提供数据库表间关系的建模方法，帮助你在 SQL-Zen Schema 中正确定义和描述表间关联。

## 目录

1. [关系类型](#关系类型)
2. [外键定义](#外键定义)
3. [JOIN 关系定义](#join-关系定义)
4. [常见关系模式](#常见关系模式)
5. [关系描述规范](#关系描述规范)
6. [性能考虑](#性能考虑)

---

## 关系类型

### 一对一 (One-to-One)
一个表中的记录对应另一个表中的一条记录。

**场景示例**：用户账户和用户详情
```yaml
# schema/tables/users.yaml
table:
  name: users
  description: "用户账户表，存储认证信息"

  columns:
    - name: id
      type: BIGINT
      primary_key: true

# schema/tables/user_profiles.yaml
table:
  name: user_profiles
  description: "用户详情表，存储个人信息"

  columns:
    - name: id
      type: BIGINT
      primary_key: true

    - name: user_id
      type: BIGINT
      foreign_key:
        table: users
        column: id
      description: "关联用户账户，一对一关系"

# schema/joins/user-profile.yaml
relationship:
  name: user_to_profile
  from_table: users
  to_table: user_profiles
  type: one_to_one
  join_sql: "LEFT JOIN user_profiles ON users.id = user_profiles.user_id"
  description: |
    每个用户账户对应一个用户详情。
    
    关联字段：users.id → user_profiles.user_id
    
    使用场景：
    - 查询用户的完整信息（账户 + 详情）
    - 将认证信息和个人信息分离
```

### 一对多 (One-to-Many)
一个表中的记录对应另一个表中的多条记录。

**场景示例**：用户和订单
```yaml
# schema/tables/users.yaml
table:
  name: users
  description: "用户表，存储用户基本信息"

  columns:
    - name: id
      type: BIGINT
      primary_key: true

# schema/tables/orders.yaml
table:
  name: orders
  description: "订单表，存储订单信息"

  columns:
    - name: id
      type: BIGINT
      primary_key: true

    - name: user_id
      type: BIGINT
      foreign_key:
        table: users
        column: id
      description: "关联用户，一个用户可以有多个订单"

# schema/joins/user-orders.yaml
relationship:
  name: user_to_orders
  from_table: users
  to_table: orders
  type: one_to_many
  join_sql: "LEFT JOIN orders ON users.id = orders.user_id"
  description: |
    每个用户可以有多个订单。
    
    关联字段：users.id → orders.user_id
    
    使用场景：
    - 查询用户的所有订单
    - 按用户维度分析订单行为
    - 计算用户相关指标（总订单数、总金额）
```

### 多对一 (Many-to-One)
多个表中的记录对应另一个表中的一条记录（一对多的反向）。

**场景示例**：订单和店铺
```yaml
# schema/tables/stores.yaml
table:
  name: stores
  description: "店铺表，存储店铺信息"

  columns:
    - name: id
      type: INT
      primary_key: true

    - name: store_name
      type: VARCHAR(100)

# schema/tables/orders.yaml
table:
  name: orders
  description: "订单表，存储订单信息"

  columns:
    - name: id
      type: BIGINT
      primary_key: true

    - name: store_id
      type: INT
      foreign_key:
        table: stores
        column: id
      description: "关联店铺，多个订单属于一个店铺"

# schema/joins/order-store.yaml
relationship:
  name: order_to_store
  from_table: orders
  to_table: stores
  type: many_to_one
  join_sql: "INNER JOIN stores ON orders.store_id = stores.id"
  description: |
    多个订单属于一个店铺。
    
    关联字段：orders.store_id → stores.id
    
    使用场景：
    - 查询订单的店铺信息
    - 按店铺维度分析订单
    - 店铺业绩统计
```

### 多对多 (Many-to-Many)
两个表中的记录可以相互对应，需要中间表（关联表）。

**场景示例**：订单和商品（通过订单明细）
```yaml
# schema/tables/orders.yaml
table:
  name: orders
  description: "订单表"

  columns:
    - name: id
      type: BIGINT
      primary_key: true

# schema/tables/products.yaml
table:
  name: products
  description: "商品表"

  columns:
    - name: id
      type: BIGINT
      primary_key: true

# schema/tables/order_items.yaml
table:
  name: order_items
  description: "订单明细表，订单和商品的关联表"

  columns:
    - name: id
      type: BIGINT
      primary_key: true

    - name: order_id
      type: BIGINT
      foreign_key:
        table: orders
        column: id
      description: "关联订单"

    - name: product_id
      type: BIGINT
      foreign_key:
        table: products
        column: id
      description: "关联商品"

# schema/joins/order-products.yaml
relationship:
  name: order_to_products
  from_table: orders
  to_table: products
  type: many_to_many
  join_sql: |
    INNER JOIN order_items ON orders.id = order_items.order_id
    INNER JOIN products ON order_items.product_id = products.id
  description: |
    一个订单可以包含多个商品，一个商品可以出现在多个订单中。
    
    通过 order_items 关联表实现多对多关系。
    
    关联路径：orders → order_items → products
    
    使用场景：
    - 查询订单中的商品详情
    - 查询商品的所有订单
    - 分析商品购买频次
```

---

## 外键定义

### 基本格式
```yaml
columns:
  - name: user_id
    type: BIGINT
    description: "关联用户的外键"
    foreign_key:
      table: users
      column: id
```

### 外键描述规范
外键描述应该包含：
1. **关联对象**：说明关联哪个表
2. **关系类型**：一对一、一对多、多对一
3. **业务含义**：这个外键在业务上代表什么

```yaml
# 好的描述
- name: user_id
  type: BIGINT
  description: "关联用户的外键，订单归属的用户"
  foreign_key:
    table: users
    column: id

# 不好的描述
- name: user_id
  type: BIGINT
  description: "用户ID"
  foreign_key:
    table: users
    column: id
```

### 复合外键
如果外键由多个字段组成，分别定义每个字段：

```yaml
columns:
  - name: school_id
    type: INT
    description: "关联学校的外键（复合外键的一部分）"
    foreign_key:
      table: schools
      column: id

  - name: class_id
    type: INT
    description: "关联班级的外键（复合外键的一部分）"
    foreign_key:
      table: classes
      column: id
```

### 自引用外键
表引用自身的情况（如组织架构树、评论回复）：

```yaml
table:
  name: comments
  description: "评论表，支持回复和嵌套"

columns:
  - name: id
    type: BIGINT
    primary_key: true

  - name: parent_id
    type: BIGINT
    foreign_key:
      table: comments
      column: id
    description: "父评论 ID，NULL 表示顶级评论"

  - name: user_id
    type: BIGINT
    foreign_key:
      table: users
      column: id
    description: "评论用户"

# schema/joins/comment-replies.yaml
relationship:
  name: comment_replies
  from_table: comments
  type: self_reference
  join_sql: "LEFT JOIN comments AS parent_comments ON comments.parent_id = parent_comments.id"
  description: |
    评论的自引用关系，支持回复和嵌套。
    
    通过 parent_id 字段建立层级关系。
    
    使用场景：
    - 查询评论的所有回复
    - 构建评论树结构
    - 统计评论深度和回复数
```

---

## JOIN 关系定义

### JOIN 文件位置
JOIN 关系定义文件放在 `schema/joins/` 目录：

```
schema/
├── tables/
│   ├── users.yaml
│   ├── orders.yaml
│   └── products.yaml
└── joins/
    ├── user-orders.yaml
    ├── order-products.yaml
    └── order-items.yaml
```

### JOIN 文件格式
```yaml
relationship:
  name: {relationship_name}
  from_table: {table_a}
  to_table: {table_b}
  type: {one_to_one | one_to_many | many_to_one | many_to_many}
  join_sql: |
    {JOIN SQL statement}
  description: |
    {Detailed description}
```

### JOIN 类型选择
根据业务需求选择合适的 JOIN 类型：

```yaml
# INNER JOIN - 只匹配两边都有的记录
relationship:
  name: order_to_user
  from_table: orders
  to_table: users
  type: many_to_one
  join_sql: "INNER JOIN users ON orders.user_id = users.id"
  description: "订单必须属于有效用户"

# LEFT JOIN - 保留左表所有记录，右表无匹配则为 NULL
relationship:
  name: user_to_profile
  from_table: users
  to_table: user_profiles
  type: one_to_one
  join_sql: "LEFT JOIN user_profiles ON users.id = user_profiles.user_id"
  description: "用户可能没有完善资料"

# RIGHT JOIN - 保留右表所有记录（较少使用）
# FULL OUTER JOIN - 保留两边所有记录（PostgreSQL 支持）
```

---

## 常见关系模式

### 模式 1: 主从表（Master-Detail）
一个主记录有多个从记录。

```yaml
# 主表：订单
# 从表：订单明细

# schema/joins/order-detail.yaml
relationship:
  name: order_details
  from_table: orders
  to_table: order_items
  type: one_to_many
  join_sql: "INNER JOIN order_items ON orders.id = order_items.order_id"
  description: |
    订单主从关系。
    
    每个订单可以有多个明细项。
    
    使用场景：
    - 查询订单的商品明细
    - 计算订单总金额
    - 统计订单商品数量
```

### 模式 2: 分类层级（Category Hierarchy）
表自引用，形成树形结构。

```yaml
table:
  name: categories
  description: "商品分类表，支持多级分类"

columns:
  - name: id
    type: INT
    primary_key: true

  - name: parent_id
    type: INT
    foreign_key:
      table: categories
      column: id
    description: "父分类 ID，NULL 表示顶级分类"

  - name: name
    type: VARCHAR(100)

  - name: level
    type: INT
    description: "分类层级，1 表示顶级"

# schema/joins/category-children.yaml
relationship:
  name: category_children
  from_table: categories
  to_table: categories
  type: self_reference
  join_sql: "LEFT JOIN categories AS child_categories ON categories.id = child_categories.parent_id"
  description: |
    分类层级关系。
    
    通过 parent_id 建立父子关系。
    
    使用场景：
    - 查询分类的子分类
    - 构建分类树
    - 统计分类层级深度
```

### 模式 3: 时间序列（Time Series）
一个实体有多个时间点的数据。

```yaml
# schema/tables/sensors.yaml
table:
  name: sensors
  description: "传感器表"

columns:
  - name: id
    type: INT
    primary_key: true

# schema/tables/sensor_readings.yaml
table:
  name: sensor_readings
  description: "传感器读数表，时间序列数据"

columns:
  - name: id
    type: BIGINT
    primary_key: true

  - name: sensor_id
    type: INT
    foreign_key:
      table: sensors
      column: id
    description: "关联传感器"

  - name: reading_time
    type: TIMESTAMP
    description: "读数时间"

  - name: value
    type: DECIMAL(10,2)
    description: "读数值"

# schema/joins/sensor-readings.yaml
relationship:
  name: sensor_to_readings
  from_table: sensors
  to_table: sensor_readings
  type: one_to_many
  join_sql: "INNER JOIN sensor_readings ON sensors.id = sensor_readings.sensor_id"
  description: |
    传感器时间序列关系。
    
    每个传感器有多个时间点的读数。
    
    使用场景：
    - 查询传感器的历史读数
    - 分析传感器数据趋势
    - 统计传感器指标（平均值、最大值）
```

### 模式 4: 标签系统（Tagging）
一个实体可以有多个标签，一个标签可以用于多个实体。

```yaml
# schema/tables/articles.yaml
table:
  name: articles
  description: "文章表"

columns:
  - name: id
    type: BIGINT
    primary_key: true

# schema/tables/tags.yaml
table:
  name: tags
  description: "标签表"

columns:
  - name: id
    type: INT
    primary_key: true

  - name: name
    type: VARCHAR(50)

# schema/tables/article_tags.yaml
table:
  name: article_tags
  description: "文章标签关联表"

columns:
  - name: article_id
    type: BIGINT
    foreign_key:
      table: articles
      column: id

  - name: tag_id
    type: INT
    foreign_key:
      table: tags
      column: id

# schema/joins/article-tags.yaml
relationship:
  name: article_to_tags
  from_table: articles
  to_table: tags
  type: many_to_many
  join_sql: |
    INNER JOIN article_tags ON articles.id = article_tags.article_id
    INNER JOIN tags ON article_tags.tag_id = tags.id
  description: |
    文章标签多对多关系。
    
    通过 article_tags 关联表实现。
    
    使用场景：
    - 查询文章的所有标签
    - 查询标签下的所有文章
    - 标签统计和分析
```

### 模式 5: 审计日志（Audit Log）
主表有多个审计日志记录。

```yaml
# schema/tables/invoices.yaml
table:
  name: invoices
  description: "发票表"

columns:
  - name: id
    type: BIGINT
    primary_key: true

# schema/tables/invoice_logs.yaml
table:
  name: invoice_logs
  description: "发票操作日志表"

columns:
  - name: id
    type: BIGINT
    primary_key: true

  - name: invoice_id
    type: BIGINT
    foreign_key:
      table: invoices
      column: id
    description: "关联发票"

  - name: action
    type: VARCHAR(20)
    description: "操作类型：created, updated, deleted"

  - name: changed_at
    type: TIMESTAMP
    description: "变更时间"

  - name: changed_by
    type: BIGINT
    foreign_key:
      table: users
      column: id
    description: "操作人"

# schema/joins/invoice-logs.yaml
relationship:
  name: invoice_to_logs
  from_table: invoices
  to_table: invoice_logs
  type: one_to_many
  join_sql: "INNER JOIN invoice_logs ON invoices.id = invoice_logs.invoice_id"
  description: |
    发票审计日志关系。
    
    记录发票的所有操作历史。
    
    使用场景：
    - 查询发票的操作历史
    - 追踪数据变更
    - 审计和合规检查
```

---

## 关系描述规范

### 描述内容
每个关系描述应该包含：

1. **关系类型**：说明是一对一、一对多、多对多等
2. **关联字段**：明确说明关联的字段路径
3. **业务含义**：这个关系在业务上代表什么
4. **使用场景**：列举常见使用场景

### 描述模板
```yaml
description: |
  {关系类型}关系。
  
  通过 {关联路径} 实现。
  关联字段：{表A.字段} → {表B.字段}
  
  使用场景：
  - {场景 1}
  - {场景 2}
  - {场景 3}
```

### 示例
```yaml
description: |
  用户和订单的一对多关系。
  
  通过 orders.user_id 字段关联到 users.id。
  一个用户可以有多个订单，每个订单属于一个用户。
  
  使用场景：
  - 查询用户的所有订单
  - 分析用户购买行为
  - 计算用户相关指标（订单数、总金额）
```

---

## 性能考虑

### 索引建议
为外键字段创建索引，提升 JOIN 性能：

```sql
-- 在数据库中创建索引（建议在数据库层面执行）
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
```

### JOIN 顺序
在 `join_sql` 中，从小表到大表的顺序 JOIN：

```yaml
# 好的做法：小表 → 大表
join_sql: |
  INNER JOIN small_table ON big_table.small_id = small_table.id
  INNER JOIN medium_table ON big_table.medium_id = medium_table.id

# 避免：大表 → 小表
join_sql: |
  INNER JOIN big_table ON small_table.big_id = big_table.id
```

### 避免过度 JOIN
对于复杂查询，考虑使用视图或预计算表：

```yaml
# 复杂关系可能需要多次 JOIN
relationship:
  name: order_complete_info
  from_table: orders
  to_table: products
  type: many_to_many
  join_sql: |
    INNER JOIN order_items ON orders.id = order_items.order_id
    INNER JOIN products ON order_items.product_id = products.id
    INNER JOIN categories ON products.category_id = categories.id
    INNER JOIN users ON orders.user_id = users.id
  description: |
    订单完整信息，包含订单、商品、分类、用户。
    
    注意：涉及多表 JOIN，考虑使用视图优化性能。
```

### 冗余字段
对于高频查询场景，可以考虑冗余字段减少 JOIN：

```yaml
# 订单表中冗余用户姓名（减少 JOIN）
columns:
  - name: user_id
    type: BIGINT
    foreign_key:
      table: users
      column: id
    description: "关联用户"

  - name: user_name
    type: VARCHAR(100)
    description: "冗余存储用户姓名，用于展示，减少 JOIN"
```

---

## 关系验证清单

在定义关系时，检查以下事项：

### ✅ 外键定义
- [ ] 外键字段命名规范（{table}_id）
- [ ] foreign_key.table 和 foreign_key.column 正确
- [ ] 外键描述清晰说明关系
- [ ] 外键类型与主键类型匹配

### ✅ JOIN 定义
- [ ] JOIN 类型选择合理（INNER / LEFT）
- [ ] JOIN SQL 语法正确
- [ ] join_sql 中的表名和字段名正确
- [ ] 关系类型声明正确（one_to_one, one_to_many 等）

### ✅ 描述质量
- [ ] 描述说明了关系类型
- [ ] 描述说明了关联字段
- [ ] 描述包含了使用场景
- [ ] 描述使用了业务语言

### ✅ 性能考虑
- [ ] 外键字段有数据库索引
- [ ] JOIN 顺序合理
- [ ] 避免过度 JOIN
- [ ] 必要时考虑冗余字段

---

通过遵循这些关系设计模式，你可以创建清晰、高效、易于理解的表间关系定义，显著提升 LLM 生成 JOIN 查询的准确性和性能。
