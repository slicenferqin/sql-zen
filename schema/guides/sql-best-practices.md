# SQL 最佳实践

本指南提供 SQL 查询的最佳实践，帮助你在 SQL-Zen Schema 中编写高质量的示例查询，提升 LLM 生成 SQL 的准确性。

## 目录

1. [查询结构](#查询结构)
2. [SELECT 最佳实践](#select-最佳实践)
3. [WHERE 子句](#where-子句)
4. [JOIN 最佳实践](#join-最佳实践)
5. [GROUP BY 和聚合](#group-by-和聚合)
6. [ORDER BY 和 LIMIT](#order-by-和-limit)
7. [子查询](#子查询)
8. [性能优化](#性能优化)
9. [常见反模式](#常见反模式)

---

## 查询结构

### 标准结构
```sql
-- 注释：查询目的和关键业务逻辑
SELECT
    column1,
    column2,
    aggregated_column
FROM table_name
    INNER JOIN other_table ON table_name.id = other_table.table_id
WHERE condition1 = true
    AND condition2 = true
GROUP BY column1, column2
HAVING aggregated_column > 100
ORDER BY column1 DESC
LIMIT 100;
```

### 命名别名
使用有意义的别名：

```sql
-- 好的做法
SELECT
    u.id AS user_id,
    u.name AS user_name,
    COUNT(o.id) AS total_orders,
    SUM(o.total_amount) AS total_spent
FROM users AS u
    INNER JOIN orders AS o ON u.id = o.user_id
WHERE u.is_active = true
GROUP BY u.id, u.name
ORDER BY total_spent DESC
LIMIT 100;

-- 避免
SELECT
    a.id,
    b.name,
    COUNT(c.id),
    SUM(c.total_amount)
FROM users AS a
    INNER JOIN orders AS c ON a.id = c.user_id
```

---

## SELECT 最佳实践

### 1. 只选择需要的列
```sql
-- 好的做法：只选择需要的列
SELECT
    id,
    name,
    email
FROM users
WHERE created_at >= '2024-01-01';

-- 避免：选择所有列
SELECT * FROM users WHERE created_at >= '2024-01-01';
```

### 2. 使用列别名
```sql
-- 好的做法：使用清晰的别名
SELECT
    DATE(created_at) AS order_date,
    COUNT(*) AS order_count,
    SUM(total_amount) AS total_revenue
FROM orders
WHERE status = 'completed'
GROUP BY DATE(created_at);

-- 避免：没有别名
SELECT
    DATE(created_at),
    COUNT(*),
    SUM(total_amount)
FROM orders
WHERE status = 'completed'
GROUP BY DATE(created_at);
```

### 3. 明确计算列的含义
```sql
-- 好的做法：清晰说明计算逻辑
SELECT
    id,
    subtotal_amount + shipping_amount + tax_amount - discount_amount AS final_amount
FROM orders
WHERE status = 'paid';

-- 或者在注释中说明
SELECT
    id,
    -- 最终金额 = 小计 + 运费 + 税费 - 优惠
    subtotal_amount + shipping_amount + tax_amount - discount_amount AS final_amount
FROM orders
WHERE status = 'paid';
```

---

## WHERE 子句

### 1. 使用索引列
```sql
-- 好的做法：使用索引列作为过滤条件
SELECT * FROM orders
WHERE user_id = 12345
    AND created_at >= '2024-01-01';

-- 确保 user_id 和 created_at 有索引
```

### 2. 避免 WHERE 中的函数
```sql
-- 避免：在 WHERE 中使用函数，无法使用索引
SELECT * FROM orders
WHERE DATE(created_at) = '2024-01-15';

-- 好的做法：使用范围查询
SELECT * FROM orders
WHERE created_at >= '2024-01-15 00:00:00'
    AND created_at <= '2024-01-15 23:59:59';

-- 或者使用函数索引（如果支持）
```

### 3. 使用 IN 而非多个 OR
```sql
-- 避免
SELECT * FROM orders
WHERE status = 'paid'
    OR status = 'processing'
    OR status = 'shipped';

-- 好的做法
SELECT * FROM orders
WHERE status IN ('paid', 'processing', 'shipped');
```

### 4. 使用 BETWEEN 处理范围
```sql
-- 避免
SELECT * FROM orders
WHERE total_amount >= 100
    AND total_amount <= 1000;

-- 好的做法
SELECT * FROM orders
WHERE total_amount BETWEEN 100 AND 1000;
```

### 5. 使用 EXISTS 而非 IN（大表）
```sql
-- 避免对大表使用 IN
SELECT * FROM users
WHERE id IN (SELECT user_id FROM orders WHERE status = 'paid');

-- 好的做法：使用 EXISTS
SELECT * FROM users AS u
WHERE EXISTS (
    SELECT 1 FROM orders AS o
    WHERE o.user_id = u.id
        AND o.status = 'paid'
);
```

---

## JOIN 最佳实践

### 1. 选择合适的 JOIN 类型
```sql
-- INNER JOIN：只匹配两边都有的记录
SELECT
    u.name,
    o.order_number
FROM users AS u
    INNER JOIN orders AS o ON u.id = o.user_id;

-- LEFT JOIN：保留左表所有记录
SELECT
    u.name,
    o.order_number
FROM users AS u
    LEFT JOIN orders AS o ON u.id = o.user_id;

-- 选择原则：
-- - 只需要匹配的记录：INNER JOIN
-- - 需要保留左表记录：LEFT JOIN
```

### 2. 明确 JOIN 条件
```sql
-- 好的做法：明确 JOIN 条件
SELECT
    u.name,
    o.order_number,
    p.product_name
FROM users AS u
    INNER JOIN orders AS o ON u.id = o.user_id
    INNER JOIN order_items AS oi ON o.id = oi.order_id
    INNER JOIN products AS p ON oi.product_id = p.id;

-- 避免：使用 WHERE 作为 JOIN 条件（旧式语法）
SELECT
    u.name,
    o.order_number,
    p.product_name
FROM users AS u,
    orders AS o,
    order_items AS oi,
    products AS p
WHERE u.id = o.user_id
    AND o.id = oi.order_id
    AND oi.product_id = p.id;
```

### 3. 避免笛卡尔积
```sql
-- 避免：没有 JOIN 条件
SELECT
    u.name,
    o.order_number
FROM users AS u,
    orders AS o;

-- 这会生成 users × orders 行数据
```

### 4. 使用别名简化查询
```sql
-- 好的做法：使用表别名
SELECT
    u.name,
    o.order_number,
    oi.quantity,
    p.product_name
FROM users AS u
    INNER JOIN orders AS o ON u.id = o.user_id
    INNER JOIN order_items AS oi ON o.id = oi.order_id
    INNER JOIN products AS p ON oi.product_id = p.id
WHERE u.id = 12345;
```

---

## GROUP BY 和聚合

### 1. GROUP BY 列与 SELECT 非聚合列一致
```sql
-- 好的做法
SELECT
    DATE(created_at) AS order_date,
    status,
    COUNT(*) AS order_count,
    SUM(total_amount) AS total_revenue
FROM orders
GROUP BY DATE(created_at), status
ORDER BY order_date DESC, status;

-- 避免：非聚合列不在 GROUP BY 中
SELECT
    DATE(created_at) AS order_date,
    status,
    COUNT(*) AS order_count
FROM orders
GROUP BY DATE(created_at);
-- status 不在 GROUP BY 中，会导致错误
```

### 2. 使用 HAVING 过滤聚合结果
```sql
-- 好的做法：使用 HAVING 过滤聚合结果
SELECT
    user_id,
    COUNT(*) AS order_count,
    SUM(total_amount) AS total_spent
FROM orders
WHERE status = 'paid'
GROUP BY user_id
HAVING COUNT(*) >= 10
    AND SUM(total_amount) >= 1000
ORDER BY total_spent DESC;

-- 避免：在 WHERE 中使用聚合函数
SELECT
    user_id,
    COUNT(*) AS order_count,
    SUM(total_amount) AS total_spent
FROM orders
WHERE status = 'paid'
    AND COUNT(*) >= 10  -- 错误：不能在 WHERE 中使用聚合函数
GROUP BY user_id;
```

### 3. 使用 CASE 进行条件聚合
```sql
-- 好的做法：使用 CASE 进行条件聚合
SELECT
    DATE(created_at) AS order_date,
    COUNT(*) AS total_orders,
    SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid_orders,
    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_orders,
    SUM(total_amount) AS total_revenue
FROM orders
GROUP BY DATE(created_at);

-- 这比多次查询更高效
```

---

## ORDER BY 和 LIMIT

### 1. 使用 ORDER BY 排序
```sql
-- 好的做法：明确排序
SELECT
    id,
    name,
    total_amount
FROM orders
WHERE status = 'paid'
ORDER BY total_amount DESC, id ASC;

-- 默认是 ASC，但明确写出更清晰
```

### 2. 使用 LIMIT 限制结果
```sql
-- 好的做法：使用 LIMIT 避免返回过多数据
SELECT
    u.name,
    COUNT(o.id) AS order_count,
    SUM(o.total_amount) AS total_spent
FROM users AS u
    INNER JOIN orders AS o ON u.id = o.user_id
WHERE u.is_active = true
GROUP BY u.id, u.name
ORDER BY total_spent DESC
LIMIT 100;

-- 避免不必要的大量数据传输
```

### 3. 使用 OFFSET 分页
```sql
-- 分页查询
SELECT
    id,
    name,
    email
FROM users
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;  -- 第 1 页

-- 或者使用 LIMIT 和 OFFSET 结合
SELECT
    id,
    name,
    email
FROM users
ORDER BY created_at DESC
LIMIT 20 OFFSET 20;  -- 第 2 页
```

---

## 子查询

### 1. 使用标量子查询
```sql
-- 好的做法：标量子查询返回单个值
SELECT
    id,
    name,
    total_amount,
    (SELECT AVG(total_amount) FROM orders) AS avg_order_amount
FROM orders
WHERE status = 'paid';
```

### 2. 使用 IN 子查询
```sql
-- 好的做法：IN 子查询返回多个值
SELECT
    id,
    name,
    email
FROM users
WHERE id IN (
    SELECT DISTINCT user_id
    FROM orders
    WHERE status = 'paid'
        AND created_at >= '2024-01-01'
);
```

### 3. 使用 WITH 子句（CTE）
```sql
-- 好的做法：使用 CTE 提高可读性
WITH monthly_revenue AS (
    SELECT
        DATE_TRUNC('month', created_at) AS month,
        SUM(total_amount) AS revenue
    FROM orders
    WHERE status = 'paid'
        AND created_at >= '2024-01-01'
    GROUP BY DATE_TRUNC('month', created_at)
)
SELECT
    month,
    revenue,
    AVG(revenue) OVER (ORDER BY month) AS avg_revenue
FROM monthly_revenue
ORDER BY month;
```

---

## 性能优化

### 1. 使用索引
```sql
-- 确保 WHERE、JOIN、ORDER BY 中的列有索引
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_status ON orders(status);

-- 复合索引（多列）
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at);
```

### 2. 避免使用 SELECT *
```sql
-- 避免
SELECT * FROM users WHERE id = 12345;

-- 好的做法：只选择需要的列
SELECT
    id,
    name,
    email
FROM users
WHERE id = 12345;
```

### 3. 使用 EXISTS 而非 COUNT
```sql
-- 避免使用 COUNT(*) 检查是否存在
SELECT
    id,
    name
FROM users
WHERE (SELECT COUNT(*) FROM orders WHERE user_id = users.id) > 0;

-- 好的做法：使用 EXISTS
SELECT
    id,
    name
FROM users
WHERE EXISTS (
    SELECT 1 FROM orders WHERE user_id = users.id
);
```

### 4. 使用 UNION ALL 而非 UNION
```sql
-- 避免使用 UNION（会去重）
SELECT user_id FROM orders WHERE status = 'paid'
UNION
SELECT user_id FROM orders WHERE status = 'processing';

-- 好的做法：使用 UNION ALL（不去重，更快）
SELECT user_id FROM orders WHERE status = 'paid'
UNION ALL
SELECT user_id FROM orders WHERE status = 'processing';

-- 除非需要去重，否则使用 UNION ALL
```

### 5. 避免 WHERE 子句中的 OR
```sql
-- 避免：OR 可能导致无法使用索引
SELECT * FROM orders
WHERE user_id = 12345
    OR created_at >= '2024-01-01';

-- 好的做法：使用 UNION ALL
SELECT * FROM orders
WHERE user_id = 12345
UNION ALL
SELECT * FROM orders
WHERE created_at >= '2024-01-01';
```

---

## 常见反模式

### 1. 隐式类型转换
```sql
-- 避免：隐式类型转换
SELECT * FROM orders
WHERE user_id = '12345';  -- user_id 是数字类型

-- 好的做法：明确类型
SELECT * FROM orders
WHERE user_id = 12345;
```

### 2. NULL 处理
```sql
-- 避免：错误的 NULL 比较
SELECT * FROM orders
WHERE cancelled_at = NULL;  -- 永远返回 0 行

-- 好的做法：使用 IS NULL
SELECT * FROM orders
WHERE cancelled_at IS NULL;

-- 或使用 IS NOT NULL
SELECT * FROM orders
WHERE cancelled_at IS NOT NULL;
```

### 3. 字符串拼接
```sql
-- MySQL 风格
SELECT
    CONCAT(first_name, ' ', last_name) AS full_name
FROM users;

-- PostgreSQL 风格
SELECT
    first_name || ' ' || last_name AS full_name
FROM users;

-- 使用函数而非运算符更可移植
```

### 4. 日期函数
```sql
-- MySQL
SELECT
    DATE(created_at) AS order_date
FROM orders;

-- PostgreSQL
SELECT
    created_at::date AS order_date
FROM orders;

-- 或者使用标准函数
SELECT
    CAST(created_at AS DATE) AS order_date
FROM orders;
```

---

## 注释规范

### 1. 查询级别的注释
```sql
/*
 * 查询目的：获取每日订单统计
 * 
 * 统计每日的订单数量和金额，
 * 包含订单状态分布
 */
SELECT
    DATE(created_at) AS order_date,
    COUNT(*) AS total_orders,
    SUM(total_amount) AS total_revenue,
    SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid_orders,
    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_orders
FROM orders
WHERE created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
GROUP BY DATE(created_at)
ORDER BY order_date DESC;
```

### 2. 列级别的注释
```sql
SELECT
    DATE(created_at) AS order_date,  -- 订单日期
    COUNT(*) AS total_orders,        -- 总订单数
    SUM(total_amount) AS total_revenue  -- 总金额
FROM orders
GROUP BY DATE(created_at);
```

### 3. 业务逻辑注释
```sql
SELECT
    u.id AS user_id,
    u.name AS user_name,
    COUNT(o.id) AS order_count,
    SUM(o.total_amount) AS total_spent,
    -- 计算平均客单价（AOV）
    CASE
        WHEN COUNT(o.id) > 0 THEN SUM(o.total_amount) / COUNT(o.id)
        ELSE 0
    END AS avg_order_value
FROM users AS u
    INNER JOIN orders AS o ON u.id = o.user_id
WHERE u.is_active = true
    -- 只统计已支付的订单
    AND o.status = 'paid'
GROUP BY u.id, u.name
ORDER BY total_spent DESC
LIMIT 100;
```

---

## 完整示例

### 示例 1: 用户订单统计
```sql
-- 获取用户的订单统计，包括订单数、总金额、平均客单价
SELECT
    u.id AS user_id,
    u.name AS user_name,
    u.email AS user_email,
    COUNT(o.id) AS total_orders,
    SUM(o.total_amount) AS total_spent,
    AVG(o.total_amount) AS avg_order_value,
    MAX(o.created_at) AS last_order_date
FROM users AS u
    INNER JOIN orders AS o ON u.id = o.user_id
WHERE u.is_active = true
    -- 只统计已支付的订单
    AND o.status = 'paid'
    -- 只统计近 30 天的订单
    AND o.created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
GROUP BY u.id, u.name, u.email
HAVING COUNT(o.id) >= 1  -- 至少有一个订单
ORDER BY total_spent DESC
LIMIT 100;
```

### 示例 2: 商品销售统计
```sql
-- 获取商品销售统计，包括销量、销售额、毛利
SELECT
    p.id AS product_id,
    p.name AS product_name,
    c.name AS category_name,
    SUM(oi.quantity) AS total_quantity,
    SUM(oi.total_amount) AS total_revenue,
    -- 计算总成本
    SUM(oi.cost_price * oi.quantity) AS total_cost,
    -- 计算总毛利
    SUM(oi.gross_profit * oi.quantity) AS total_gross_profit,
    -- 计算毛利率
    CASE
        WHEN SUM(oi.total_amount) > 0 
        THEN SUM(oi.gross_profit * oi.quantity) / SUM(oi.total_amount) * 100
        ELSE 0
    END AS profit_margin_percentage
FROM products AS p
    INNER JOIN categories AS c ON p.category_id = c.id
    INNER JOIN order_items AS oi ON p.id = oi.product_id
    INNER JOIN orders AS o ON oi.order_id = o.id
WHERE o.status = 'paid'
    AND o.created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 90 DAY)
GROUP BY p.id, p.name, c.name
HAVING SUM(oi.quantity) > 0
ORDER BY total_revenue DESC
LIMIT 100;
```

### 示例 3: 订单趋势分析
```sql
-- 获取每日订单趋势，包含不同状态的订单分布
SELECT
    DATE(created_at) AS order_date,
    COUNT(*) AS total_orders,
    SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid_orders,
    SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) AS processing_orders,
    SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) AS shipped_orders,
    SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered_orders,
    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_orders,
    SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) AS paid_revenue,
    AVG(CASE WHEN status = 'paid' THEN total_amount END) AS avg_order_value
FROM orders
WHERE created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
GROUP BY DATE(created_at)
ORDER BY order_date DESC;
```

---

通过遵循这些 SQL 最佳实践，你可以编写高效、可读、可维护的 SQL 查询，显著提升 LLM 生成 SQL 的质量和性能。
