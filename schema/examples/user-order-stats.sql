-- 查询目的：获取用户的订单统计
--
-- 包括订单数、总金额、平均客单价、最后订单时间
-- 只统计已支付的订单

SELECT
    u.id AS user_id,
    u.name AS user_name,
    u.email AS user_email,
    COUNT(o.id) AS total_orders,
    SUM(o.total_amount) AS total_spent,
    AVG(o.total_amount) AS avg_order_value,
    MAX(o.created_at) AS last_order_date,
    MIN(o.created_at) AS first_order_date
FROM users AS u
    INNER JOIN orders AS o ON u.id = o.user_id
WHERE u.is_active = true
    AND o.status = 'paid'
    AND o.created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 365 DAY)
GROUP BY u.id, u.name, u.email
HAVING COUNT(o.id) >= 1
ORDER BY total_spent DESC
LIMIT 100;
