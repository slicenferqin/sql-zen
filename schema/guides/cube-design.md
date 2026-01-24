# Cube 设计指南

本指南提供 SQL-Zen Cube 层的设计方法，帮助你创建高质量的业务语义层定义。

## 目录

1. [什么是 Cube 层](#什么是-cube-层)
2. [设计原则](#设计原则)
3. [Cube 定义格式](#cube-定义格式)
4. [维度设计](#维度设计)
5. [度量设计](#度量设计)
6. [过滤器设计](#过滤器设计)
7. [关系定义](#关系定义)
8. [常见模式](#常见模式)
9. [验证清单](#验证清单)

---

## 什么是 Cube 层

### 定义

**Cube 层**是 SQL-Zen 的业务语义层，定义：
- **Metrics（度量）**：业务指标（KPI）
- **Dimensions（维度）**：分析视角（时间、地理、用户等）
- **Filters（过滤器）**：常用查询条件
- **Relationships（关系）**：跨表连接逻辑

### 与 Schema 层的关系

```
┌─────────────────────────────────────────┐
│          Cube 层                      │
│  - 业务语义指标                     │
│  - 维度                             │
│  - 跨表逻辑                         │
└─────────────┬─────────────────────┘
              │ 引用
              ▼
┌─────────────────────────────────────────┐
│          Schema 层                     │
│  - 表结构                          │
│  - 列定义                           │
│  - 表间关系                         │
└─────────────────────────────────────────┘
```

**关键区别**：

| 维度 | Schema 层 | Cube 层 |
|------|----------|----------|
| 目标 | 描述表结构 | 定义业务语义 |
| 用户 | 数据工程师 | 业务分析师 |
| 内容 | columns, types, joins | metrics, dimensions, filters |
| 示例 | `orders.total_amount: DECIMAL(12,2)` | `revenue: SUM(paid orders)` |

---

## 设计原则

### 1. 业务语义优先

Cube 层应该使用业务语言，而非技术语言：

```yaml
# ❌ 技术语言
metrics:
  - name: sum_amount
    description: "SUM(total_amount)"

# ✅ 业务语言
metrics:
  - name: revenue
    description: "总收入，包含所有已支付订单的金额"
```

### 2. 可复用性

Cube 定义应该跨多个场景复用：

```yaml
# 好的复用定义
metrics:
  - name: revenue
    description: "总收入"
    sql: "SUM(CASE WHEN orders.status = 'paid' THEN orders.total_amount END)"
    # 可用于：
    # - 每日收入
    # - 每月收入
    # - 用户收入
    # - 产品收入
```

### 3. 独立性

Cube 定义应该独立于具体的查询场景：

```yaml
# 好的独立定义
filters:
  - name: last_30_days
    sql: "orders.created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)"
    description: "最近30天"
    # 可以用于任何时间相关的查询
```

### 4. 可读性

Cube 的 SQL 表达式应该清晰易懂：

```yaml
# 好的清晰定义
metrics:
  - name: conversion_rate
    description: "转化率，从注册到首次购买的比例"
    sql: |
      COUNT(DISTINCT CASE WHEN o.status = 'paid' THEN o.user_id END)::DECIMAL / 
      COUNT(DISTINCT u.id) * 100
    type: percentage

# 避免：过于复杂的一行 SQL
```

---

## Cube 定义格式

### 基本结构

```yaml
cube: {cube_name}
description: "Cube 的业务描述"

dimensions:
  - name: {dimension_name}
    description: "维度描述"
    column: "{table}.{column}"
    # 或更复杂的维度定义
    
metrics:
  - name: {metric_name}
    description: "指标的业务含义"
    sql: "{SQL expression}"
    type: sum | count | avg | percentage | ratio
    # 可能引用多个表
    
filters:
  - name: {filter_name}
    sql: "{WHERE condition}"
    description: "过滤器描述"
    
joins:
  - from: {table_a}
    to: {table_b}
    type: {join_type}
    condition: "{join_condition}"
```

### 完整示例

```yaml
# schema/cubes/business-metrics.yaml
cube: business_analytics
description: |
  核心业务指标 Cube，包含收入、订单、用户分析等关键指标。
  
  适用于：
  - 财务分析
  - 运营监控
  - 用户增长分析
  - 产品表现分析

dimensions:
  - name: time
    description: "时间维度，支持不同粒度的时间聚合"
    column: "DATE(orders.created_at)"
    granularity:
      - year:
          sql: "YEAR(orders.created_at)"
          description: "年"
      - month:
          sql: "DATE_FORMAT(orders.created_at, '%Y-%m')"
          description: "月"
      - week:
          sql: "YEARWEEK(orders.created_at)"
          description: "周"
      - day:
          sql: "DATE(orders.created_at)"
          description: "日"
          
  - name: user_tier
    description: "用户分层维度，根据订阅等级区分"
    column: "users.subscription_tier"
    enum: [free, basic, premium]
    
  - name: geography
    description: "地理维度，支持国家和地区分析"
    columns:
      - "orders.shipping_country"
      - "users.country"
      - "orders.shipping_state"

metrics:
  - name: revenue
    description: "总收入，包含所有已支付订单的金额"
    sql: "SUM(CASE WHEN orders.status = 'paid' THEN orders.total_amount END)"
    type: sum
    category: financial
    unit: "USD"
    
  - name: net_revenue
    description: "净收入，扣除退款后的实际收入"
    sql: "SUM(orders.total_amount - COALESCE(orders.refunded_amount, 0))"
    type: sum
    category: financial
    unit: "USD"
    
  - name: total_orders
    description: "总订单数"
    sql: "COUNT(orders.id)"
    type: count
    category: operational
    
  - name: average_order_value
    description: "平均客单价（AOV），每个订单的平均金额"
    sql: "AVG(orders.total_amount)"
    type: avg
    category: financial
    unit: "USD"
    
  - name: customer_lifetime_value
    description: "客户生命周期价值（CLV），单个客户的平均消费金额"
    sql: "SUM(orders.total_amount) / COUNT(DISTINCT orders.user_id)"
    type: avg
    category: customer
    unit: "USD"
    
  - name: conversion_rate
    description: "转化率，从注册到首次购买的比例"
    sql: |
      COUNT(DISTINCT CASE WHEN o.status = 'paid' THEN o.user_id END)::DECIMAL / 
      COUNT(DISTINCT u.id) * 100
    type: percentage
    category: growth
    unit: "%"
    
  - name: repeat_purchase_rate
    description: "复购率，有多次购买的用户比例"
    sql: |
      SUM(CASE WHEN order_count > 1 THEN 1 ELSE 0 END)::DECIMAL / 
      COUNT(DISTINCT orders.user_id) * 100
    type: percentage
    category: customer
    unit: "%"
    
  - name: return_rate
    description: "退货率，退款金额占总收入的比例"
    sql: |
      COALESCE(SUM(orders.refunded_amount), 0) * 100 / 
      SUM(CASE WHEN orders.status = 'paid' THEN orders.total_amount END)
    type: percentage
    category: operational
    unit: "%"

joins:
  - from: orders
    to: users
    type: left
    condition: "orders.user_id = users.id"
    description: "订单关联用户，用于用户相关的指标"
    
  - from: orders
    to: order_items
    type: inner
    condition: "orders.id = order_items.order_id"
    description: "订单关联明细，用于产品相关的指标"

filters:
  - name: last_30_days
    sql: "orders.created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)"
    description: "最近30天"
    dimension: time
    
  - name: last_7_days
    sql: "orders.created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)"
    description: "最近7天"
    dimension: time
    
  - name: last_month
    sql: "orders.created_at >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')"
    description: "本月"
    dimension: time
    
  - name: this_year
    sql: "YEAR(orders.created_at) = YEAR(CURRENT_DATE)"
    description: "本年"
    dimension: time
    
  - name: paid_orders_only
    sql: "orders.status IN ('paid', 'delivered')"
    description: "已支付订单"
    
  - name: active_users
    sql: "users.status = 'active' AND users.is_verified = true"
    description: "活跃用户"
    dimension: user
    
  - name: high_value_orders
    sql: "orders.total_amount >= 1000"
    description: "高价值订单（>= $1000）"
    
  - name: domestic_orders
    sql: "orders.shipping_country = 'US'"
    description: "国内订单"
    dimension: geography
```

---

## 维度设计

### 1. 时间维度

时间维度是最常用的维度：

```yaml
dimensions:
  - name: time
    description: "时间维度"
    column: "DATE(orders.created_at)"
    granularity:
      - year:
          sql: "YEAR(orders.created_at)"
          description: "年"
      - quarter:
          sql: "QUARTER(orders.created_at)"
          description: "季度"
      - month:
          sql: "DATE_FORMAT(orders.created_at, '%Y-%m')"
          description: "月"
      - week:
          sql: "YEARWEEK(orders.created_at)"
          description: "周"
      - day:
          sql: "DATE(orders.created_at)"
          description: "日"
      - hour:
          sql: "HOUR(orders.created_at)"
          description: "小时"
```

### 2. 地理维度

```yaml
dimensions:
  - name: geography
    description: "地理维度"
    columns:
      - "orders.shipping_country"
      - "orders.shipping_state"
      - "orders.shipping_city"
      - "users.country"
      
  - name: country
    description: "国家维度"
    column: "orders.shipping_country"
    hierarchy:
      - region: "orders.shipping_region"
      - country: "orders.shipping_country"
```

### 3. 用户维度

```yaml
dimensions:
  - name: user_tier
    description: "用户分层维度"
    column: "users.subscription_tier"
    enum: [free, basic, premium]
    
  - name: user_status
    description: "用户状态维度"
    column: "users.status"
    enum: [active, inactive, suspended]
    
  - name: user_cohort
    description: "用户队列维度"
    column: "DATE(users.created_at)"
    description: "按注册月分组用户"
```

### 4. 产品维度

```yaml
dimensions:
  - name: product_category
    description: "产品分类维度"
    column: "products.category_id"
    # 可以关联到分类表
    
  - name: product_brand
    description: "品牌维度"
    column: "products.brand_id"
    
  - name: product_tier
    description: "产品层级维度"
    column: "products.price_tier"
    enum: [budget, standard, premium]
```

---

## 度量设计

### 1. 基础度量类型

#### 求和 (Sum)

```yaml
metrics:
  - name: revenue
    description: "总收入"
    sql: "SUM(orders.total_amount)"
    type: sum
```

#### 计数 (Count)

```yaml
metrics:
  - name: total_orders
    description: "总订单数"
    sql: "COUNT(orders.id)"
    type: count
```

#### 平均值 (Average)

```yaml
metrics:
  - name: average_order_value
    description: "平均客单价"
    sql: "AVG(orders.total_amount)"
    type: avg
```

#### 比率 (Percentage)

```yaml
metrics:
  - name: conversion_rate
    description: "转化率"
    sql: |
      COUNT(DISTINCT CASE WHEN o.status = 'paid' THEN o.user_id END)::DECIMAL / 
      COUNT(DISTINCT u.id) * 100
    type: percentage
```

### 2. 复杂业务逻辑

#### 条件聚合

```yaml
metrics:
  - name: revenue
    description: "总收入（只统计已支付订单）"
    sql: "SUM(CASE WHEN orders.status = 'paid' THEN orders.total_amount END)"
    type: sum
```

#### 多表关联

```yaml
metrics:
  - name: customer_lifetime_value
    description: "客户生命周期价值"
    sql: "SUM(orders.total_amount) / COUNT(DISTINCT orders.user_id)"
    type: avg
    # 使用 orders 和 users 表
```

#### 时间窗口

```yaml
metrics:
  - name: revenue_last_30_days
    description: "最近30天收入"
    sql: |
      SUM(CASE 
        WHEN orders.created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY) 
        AND orders.status = 'paid' 
        THEN orders.total_amount 
      END)
    type: sum
```

### 3. 度量分类

```yaml
metrics:
  - name: revenue
    description: "总收入"
    sql: "SUM(orders.total_amount)"
    type: sum
    category: financial
    unit: "USD"
    
  - name: conversion_rate
    description: "转化率"
    sql: "COUNT(DISTINCT u.id) / COUNT(DISTINCT pv.user_id) * 100"
    type: percentage
    category: growth
    unit: "%"
    
  - name: repeat_purchase_rate
    description: "复购率"
    sql: "SUM(CASE WHEN order_count > 1 THEN 1 ELSE 0 END) / COUNT(DISTINCT orders.user_id) * 100"
    type: percentage
    category: customer
    unit: "%"
```

**分类类型**：
- **financial**: 财务指标（收入、成本、利润）
- **operational**: 运营指标（订单数、发货数）
- **growth**: 增长指标（转化率、留存率）
- **customer**: 客户指标（CLV、满意度）
- **product**: 产品指标（销量、退货率）

---

## 过滤器设计

### 1. 时间过滤器

```yaml
filters:
  - name: last_30_days
    sql: "orders.created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)"
    description: "最近30天"
    dimension: time
    
  - name: last_7_days
    sql: "orders.created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)"
    description: "最近7天"
    dimension: time
    
  - name: this_month
    sql: "orders.created_at >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')"
    description: "本月"
    dimension: time
    
  - name: this_quarter
    sql: "QUARTER(orders.created_at) = QUARTER(CURRENT_DATE) AND YEAR(orders.created_at) = YEAR(CURRENT_DATE)"
    description: "本季度"
    dimension: time
```

### 2. 状态过滤器

```yaml
filters:
  - name: paid_orders_only
    sql: "orders.status IN ('paid', 'delivered')"
    description: "已支付订单"
    
  - name: active_users
    sql: "users.status = 'active' AND users.is_verified = true"
    description: "活跃用户"
    dimension: user
    
  - name: in_stock_products
    sql: "products.stock_status = 'in_stock' AND products.stock_quantity > 0"
    description: "有库存商品"
    dimension: product
```

### 3. 数值过滤器

```yaml
filters:
  - name: high_value_orders
    sql: "orders.total_amount >= 1000"
    description: "高价值订单（>= $1000）"
    
  - name: bulk_orders
    sql: "order_items.quantity >= 10"
    description: "批量订单（>= 10 件）"
```

### 4. 地理过滤器

```yaml
filters:
  - name: domestic_orders
    sql: "orders.shipping_country = 'US'"
    description: "国内订单"
    dimension: geography
    
  - name: international_orders
    sql: "orders.shipping_country != 'US'"
    description: "国际订单"
    dimension: geography
```

---

## 关系定义

### 基本格式

```yaml
joins:
  - from: orders
    to: users
    type: left
    condition: "orders.user_id = users.id"
    description: "订单关联用户"
    
  - from: orders
    to: order_items
    type: inner
    condition: "orders.id = order_items.order_id"
    description: "订单关联明细"
```

### 多表关系

```yaml
joins:
  - from: orders
    to: users
    type: left
    condition: "orders.user_id = users.id"
    
  - from: orders
    to: order_items
    type: inner
    condition: "orders.id = order_items.order_id"
    
  - from: order_items
    to: products
    type: inner
    condition: "order_items.product_id = products.id"
```

### 关系类型

- **left**: 保留左表所有记录，右表无匹配则为 NULL
- **inner**: 只保留两边都匹配的记录
- **right**: 保留右表所有记录（较少使用）
- **full**: 保留两边所有记录（PostgreSQL 支持）

---

## 常见模式

### 1. 收入分析

```yaml
cube: revenue_analytics
description: "收入分析 Cube"

dimensions:
  - name: time
    column: "DATE(orders.created_at)"
    granularity: [month, week, day]
    
  - name: geography
    columns: ["orders.shipping_country", "orders.shipping_state"]

metrics:
  - name: revenue
    description: "总收入"
    sql: "SUM(CASE WHEN orders.status = 'paid' THEN orders.total_amount END)"
    type: sum
    
  - name: net_revenue
    description: "净收入"
    sql: "SUM(orders.total_amount - COALESCE(orders.refunded_amount, 0))"
    type: sum
    
  - name: refund_rate
    description: "退款率"
    sql: "COALESCE(SUM(refunded_amount), 0) * 100 / SUM(total_amount)"
    type: percentage
```

### 2. 用户增长分析

```yaml
cube: user_growth_analytics
description: "用户增长分析 Cube"

dimensions:
  - name: time
    column: "DATE(users.created_at)"
    granularity: [month, week]
    
  - name: user_tier
    column: "users.subscription_tier"

metrics:
  - name: new_users
    description: "新增用户数"
    sql: "COUNT(users.id)"
    type: count
    
  - name: active_users
    description: "活跃用户数"
    sql: "COUNT(DISTINCT CASE WHEN last_login_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY) THEN id END)"
    type: count
    
  - name: verification_rate
    description: "用户验证率"
    sql: "AVG(CASE WHEN is_verified = true THEN 1 ELSE 0 END) * 100"
    type: percentage
```

### 3. 产品分析

```yaml
cube: product_analytics
description: "产品分析 Cube"

dimensions:
  - name: time
    column: "DATE(order_items.created_at)"
    granularity: [month, day]
    
  - name: product_category
    column: "products.category_id"

metrics:
  - name: products_sold
    description: "产品销量"
    sql: "SUM(order_items.quantity)"
    type: sum
    
  - name: product_revenue
    description: "产品收入"
    sql: "SUM(order_items.total_amount)"
    type: sum
    
  - name: return_rate
    description: "产品退货率"
    sql: "AVG(CASE WHEN is_returned = true THEN 1 ELSE 0 END) * 100"
    type: percentage
```

---

## 验证清单

### Cube 定义

- [ ] Cube 名称使用蛇形命名
- [ ] 描述说明了业务用途和适用场景
- [ ] 维度定义清晰，包含 granularities
- [ ] 度量使用业务语言描述
- [ ] 度量的 SQL 表达式正确
- [ ] 度量有类型声明（sum, count, avg, percentage）
- [ ] 度量有分类和单位
- [ ] 过滤器使用参数化（不硬编码具体值）
- [ ] 关系定义完整
- [ ] 跨表查询有必要的 JOIN 定义

### 语义质量

- [ ] 度量名称易于理解（如 revenue 而非 sum_amount）
- [ ] 描述使用业务语言（如"总收入"而非"金额求和"）
- [ ] 维度覆盖常用分析视角
- [ ] 过滤器覆盖常用查询条件
- [ ] 复杂逻辑有详细说明

### 可维护性

- [ ] SQL 表达式清晰易懂
- [ ] 避免过度复杂的嵌套
- [ ] 使用别名提高可读性
- [ ] 常用计算逻辑复用（通过多个度量共享逻辑）

---

通过遵循这些设计指南，你可以创建高质量的 Cube 定义，显著提升业务分析的准确性和效率。
