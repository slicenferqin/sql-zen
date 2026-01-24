-- 查询目的：获取商品销售统计
--
-- 包括销量、销售额、毛利、毛利率
-- 只统计已支付的订单

SELECT
    p.id AS product_id,
    p.name AS product_name,
    c.name AS category_name,
    SUM(oi.quantity) AS total_quantity,
    SUM(oi.total_amount) AS total_revenue,
    SUM(oi.cost_price * oi.quantity) AS total_cost,
    SUM(oi.gross_profit * oi.quantity) AS total_gross_profit,
    CASE
        WHEN SUM(oi.total_amount) > 0 
        THEN SUM(oi.gross_profit * oi.quantity) / SUM(oi.total_amount) * 100
        ELSE 0
    END AS profit_margin_percentage,
    COUNT(DISTINCT o.id) AS order_count,
    COUNT(DISTINCT o.user_id) AS buyer_count
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
