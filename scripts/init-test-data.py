#!/usr/bin/env python3
"""
SQL-Zen 测试数据初始化脚本

功能：
1. 创建测试数据库表（users, products, orders, order_items）
2. 插入模拟数据
3. 生成对应的 Schema 层文件
4. 生成对应的 Cube 层文件

使用方式：
    python scripts/init-test-data.py

环境变量：
    DB_TYPE     - 数据库类型（postgresql/mysql，默认：postgresql）
    DB_HOST     - 数据库主机（默认：localhost）
    DB_PORT     - 数据库端口（默认：5432 for PostgreSQL, 3306 for MySQL）
    DB_NAME     - 数据库名称（默认：test）
    DB_USER     - 数据库用户（默认：postgres/root）
    DB_PASSWORD - 数据库密码
"""

import os
import sys
import random
from datetime import datetime, timedelta
from pathlib import Path

# 加载 .env 文件
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("⚠️  dotenv 未安装，将只使用系统环境变量")

# 检测数据库类型
DB_TYPE = os.getenv('DB_TYPE', 'postgresql').lower()

# 根据数据库类型导入对应的库
if DB_TYPE == 'mysql':
    try:
        import mysql.connector
        from mysql.connector import Error
    except ImportError:
        print("❌ 请先安装 MySQL 驱动: pip install mysql-connector-python")
        sys.exit(1)
elif DB_TYPE == 'postgresql':
    try:
        import psycopg2
        from psycopg2.extras import execute_values
    except ImportError:
        print("❌ 请先安装 PostgreSQL 驱动: pip install psycopg2-binary")
        sys.exit(1)
else:
    print(f"❌ 不支持的数据库类型: {DB_TYPE}")
    print("支持的类型: postgresql, mysql")
    sys.exit(1)

# 数据库配置
if DB_TYPE == 'mysql':
    DEFAULT_PORT = 3306
    DEFAULT_USER = 'root'
else:
    DEFAULT_PORT = 5432
    DEFAULT_USER = 'postgres'

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', str(DEFAULT_PORT))),
    'database': os.getenv('DB_NAME', 'test'),
    'user': os.getenv('DB_USER', DEFAULT_USER),
    'password': os.getenv('DB_PASSWORD', ''),
}

# Schema 目录
SCHEMA_DIR = Path(__file__).parent.parent / 'schema'

# ============================================
# 1. 数据库表定义
# ============================================

# PostgreSQL 表定义
CREATE_TABLES_SQL_POSTGRESQL = """
-- 用户表
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    city VARCHAR(50),
    country VARCHAR(50) DEFAULT 'China',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 商品表
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    cost DECIMAL(10, 2) NOT NULL,
    stock INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 订单表
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    total_amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(50),
    shipping_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP,
    shipped_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- 订单明细表
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
"""

# MySQL 表定义
CREATE_TABLES_SQL_MYSQL = """
-- 用户表
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    city VARCHAR(50),
    country VARCHAR(50) DEFAULT 'China',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 商品表
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    cost DECIMAL(10, 2) NOT NULL,
    stock INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 订单表
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    total_amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(50),
    shipping_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP NULL,
    shipped_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 订单明细表
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    product_id INT,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 创建索引
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
"""

# 根据数据库类型选择 SQL
CREATE_TABLES_SQL = CREATE_TABLES_SQL_MYSQL if DB_TYPE == 'mysql' else CREATE_TABLES_SQL_POSTGRESQL

# ============================================
# 2. 模拟数据
# ============================================

CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安', '南京', '重庆']
CATEGORIES = ['电子产品', '服装', '食品', '家居', '图书']
PAYMENT_METHODS = ['alipay', 'wechat', 'credit_card', 'bank_transfer']
ORDER_STATUSES = ['pending', 'paid', 'shipped', 'completed', 'cancelled']

PRODUCTS_DATA = [
    ('iPhone 15 Pro', '电子产品', 8999.00, 6500.00),
    ('MacBook Pro 14', '电子产品', 16999.00, 12000.00),
    ('AirPods Pro 2', '电子产品', 1899.00, 1200.00),
    ('iPad Air', '电子产品', 4799.00, 3200.00),
    ('Apple Watch', '电子产品', 2999.00, 2000.00),
    ('运动T恤', '服装', 199.00, 80.00),
    ('牛仔裤', '服装', 399.00, 150.00),
    ('羽绒服', '服装', 1299.00, 500.00),
    ('运动鞋', '服装', 699.00, 280.00),
    ('休闲外套', '服装', 599.00, 220.00),
    ('有机牛奶', '食品', 68.00, 40.00),
    ('进口坚果', '食品', 128.00, 70.00),
    ('咖啡豆', '食品', 98.00, 45.00),
    ('智能台灯', '家居', 299.00, 120.00),
    ('床上四件套', '家居', 499.00, 180.00),
    ('Python编程', '图书', 89.00, 35.00),
    ('数据结构', '图书', 79.00, 30.00),
]

def generate_users(n=100):
    """生成用户数据"""
    users = []
    for i in range(1, n + 1):
        name = f"用户{i:04d}"
        email = f"user{i:04d}@example.com"
        phone = f"138{random.randint(10000000, 99999999)}"
        city = random.choice(CITIES)
        status = random.choices(['active', 'inactive'], weights=[0.9, 0.1])[0]
        created_at = datetime.now() - timedelta(days=random.randint(1, 365))
        users.append((name, email, phone, city, 'China', status, created_at, created_at))
    return users

def generate_orders(user_ids, product_data, n=500):
    """生成订单数据"""
    orders = []
    order_items = []
    
    for i in range(1, n + 1):
        user_id = random.choice(user_ids)
        created_at = datetime.now() - timedelta(days=random.randint(0, 90))
        
        # 随机选择 1-5 个商品
        num_items = random.randint(1, 5)
        selected_products = random.sample(product_data, min(num_items, len(product_data)))
        
        total_amount = 0
        items = []
        for prod_id, _, _, price, _ in selected_products:
            quantity = random.randint(1, 3)
            subtotal = price * quantity
            total_amount += subtotal
            items.append((i, prod_id, quantity, price, subtotal, created_at))
        
        # 订单状态和时间
        status = random.choices(
            ORDER_STATUSES, 
            weights=[0.05, 0.15, 0.10, 0.60, 0.10]
        )[0]
        
        payment_method = random.choice(PAYMENT_METHODS) if status != 'pending' else None
        paid_at = created_at + timedelta(hours=random.randint(1, 24)) if status in ['paid', 'shipped', 'completed'] else None
        shipped_at = (paid_at + timedelta(days=random.randint(1, 3))) if (status in ['shipped', 'completed'] and paid_at) else None
        completed_at = (shipped_at + timedelta(days=random.randint(1, 7))) if (status == 'completed' and shipped_at) else None
        
        orders.append((
            user_id, total_amount, status, payment_method,
            f"{random.choice(CITIES)}市某某区某某路{random.randint(1, 999)}号",
            created_at, paid_at, shipped_at, completed_at
        ))
        order_items.extend(items)
    
    return orders, order_items

# ============================================
# 3. Schema 层文件生成
# ============================================

SCHEMA_USERS = """table:
  name: users
  description: "用户表，存储平台所有注册用户信息"

columns:
  - name: id
    type: SERIAL
    description: "用户唯一标识"
    primary_key: true
    
  - name: name
    type: VARCHAR(100)
    description: "用户姓名"
    
  - name: email
    type: VARCHAR(255)
    description: "用户邮箱，唯一"
    unique: true
    
  - name: phone
    type: VARCHAR(20)
    description: "手机号码"
    
  - name: city
    type: VARCHAR(50)
    description: "所在城市"
    
  - name: country
    type: VARCHAR(50)
    description: "所在国家"
    default: "China"
    
  - name: status
    type: VARCHAR(20)
    description: "用户状态"
    enum: [active, inactive]
    default: "active"
    
  - name: created_at
    type: TIMESTAMP
    description: "注册时间"
    
  - name: updated_at
    type: TIMESTAMP
    description: "最后更新时间"

business_context: |
  用户是平台的核心实体。每个用户可以下多个订单。
  status 字段用于标记用户是否活跃，inactive 用户可能已注销或被禁用。
"""

SCHEMA_PRODUCTS = """table:
  name: products
  description: "商品表，存储所有在售商品信息"

columns:
  - name: id
    type: SERIAL
    description: "商品唯一标识"
    primary_key: true
    
  - name: name
    type: VARCHAR(200)
    description: "商品名称"
    
  - name: category
    type: VARCHAR(50)
    description: "商品类别"
    enum: [电子产品, 服装, 食品, 家居, 图书]
    
  - name: price
    type: DECIMAL(10, 2)
    description: "销售价格（单位：元）"
    
  - name: cost
    type: DECIMAL(10, 2)
    description: "成本价格（单位：元）"
    
  - name: stock
    type: INTEGER
    description: "库存数量"
    default: 0
    
  - name: status
    type: VARCHAR(20)
    description: "商品状态"
    enum: [active, inactive, out_of_stock]
    default: "active"
    
  - name: created_at
    type: TIMESTAMP
    description: "创建时间"

business_context: |
  商品是交易的核心对象。price 是面向用户的销售价，cost 是采购成本。
  利润 = price - cost。
  category 用于商品分类统计。
"""

SCHEMA_ORDERS = """table:
  name: orders
  description: "订单表，记录所有用户订单"

columns:
  - name: id
    type: SERIAL
    description: "订单唯一标识"
    primary_key: true
    
  - name: user_id
    type: INTEGER
    description: "下单用户ID"
    foreign_key: users.id
    
  - name: total_amount
    type: DECIMAL(12, 2)
    description: "订单总金额（单位：元）"
    
  - name: status
    type: VARCHAR(20)
    description: "订单状态"
    enum: [pending, paid, shipped, completed, cancelled]
    default: "pending"
    
  - name: payment_method
    type: VARCHAR(50)
    description: "支付方式"
    enum: [alipay, wechat, credit_card, bank_transfer]
    nullable: true
    
  - name: shipping_address
    type: TEXT
    description: "收货地址"
    
  - name: created_at
    type: TIMESTAMP
    description: "下单时间"
    
  - name: paid_at
    type: TIMESTAMP
    description: "支付时间"
    nullable: true
    
  - name: shipped_at
    type: TIMESTAMP
    description: "发货时间"
    nullable: true
    
  - name: completed_at
    type: TIMESTAMP
    description: "完成时间"
    nullable: true

business_context: |
  订单是核心业务实体。订单状态流转：pending -> paid -> shipped -> completed。
  cancelled 表示已取消的订单。
  
  重要业务规则：
  - 只有 status='paid' 或 status='completed' 的订单才计入收入
  - total_amount 是订单总金额，包含所有商品
  - 一个订单可以包含多个商品（通过 order_items 表关联）
"""

SCHEMA_ORDER_ITEMS = """table:
  name: order_items
  description: "订单明细表，记录订单中的商品"

columns:
  - name: id
    type: SERIAL
    description: "明细唯一标识"
    primary_key: true
    
  - name: order_id
    type: INTEGER
    description: "所属订单ID"
    foreign_key: orders.id
    
  - name: product_id
    type: INTEGER
    description: "商品ID"
    foreign_key: products.id
    
  - name: quantity
    type: INTEGER
    description: "购买数量"
    
  - name: unit_price
    type: DECIMAL(10, 2)
    description: "下单时的单价（单位：元）"
    
  - name: subtotal
    type: DECIMAL(12, 2)
    description: "小计金额 = quantity * unit_price"
    
  - name: created_at
    type: TIMESTAMP
    description: "创建时间"

business_context: |
  订单明细是订单和商品之间的关联表。
  unit_price 记录下单时的价格，避免商品调价影响历史订单。
  subtotal = quantity * unit_price。
"""

# ============================================
# 4. 关系定义
# ============================================

JOINS_YAML = """# 表间关系定义
relationships:
  - name: user_orders
    description: "用户和订单的关系"
    from: users
    to: orders
    type: one_to_many
    join: "users.id = orders.user_id"
    
  - name: order_items_relation
    description: "订单和订单明细的关系"
    from: orders
    to: order_items
    type: one_to_many
    join: "orders.id = order_items.order_id"
    
  - name: product_order_items
    description: "商品和订单明细的关系"
    from: products
    to: order_items
    type: one_to_many
    join: "products.id = order_items.product_id"

common_joins: |
  # 常用 JOIN 模式
  
  ## 查询用户订单
  SELECT u.*, o.*
  FROM users u
  JOIN orders o ON u.id = o.user_id
  
  ## 查询订单商品
  SELECT o.*, oi.*, p.*
  FROM orders o
  JOIN order_items oi ON o.id = oi.order_id
  JOIN products p ON oi.product_id = p.id
  
  ## 查询用户购买的商品
  SELECT u.name, p.name, oi.quantity
  FROM users u
  JOIN orders o ON u.id = o.user_id
  JOIN order_items oi ON o.id = oi.order_id
  JOIN products p ON oi.product_id = p.id
"""

# ============================================
# 5. Cube 层文件生成
# ============================================

CUBE_BUSINESS_METRICS = """cube: business_metrics
description: "核心业务指标 - 收入、订单、用户相关"

dimensions:
  - name: time
    description: "时间维度，基于订单创建时间"
    column: "orders.created_at"
    granularity:
      - day:
          sql: "DATE(orders.created_at)"
          description: "按天"
      - week:
          sql: "DATE_TRUNC('week', orders.created_at)"
          description: "按周"
      - month:
          sql: "DATE_TRUNC('month', orders.created_at)"
          description: "按月"
      - year:
          sql: "DATE_TRUNC('year', orders.created_at)"
          description: "按年"

  - name: city
    description: "城市维度，用户所在城市"
    column: "users.city"
    join: "JOIN users ON orders.user_id = users.id"

  - name: category
    description: "商品类别维度"
    column: "products.category"
    join: |
      JOIN order_items ON orders.id = order_items.order_id
      JOIN products ON order_items.product_id = products.id

  - name: payment_method
    description: "支付方式维度"
    column: "orders.payment_method"

metrics:
  - name: revenue
    description: "总收入 - 已支付和已完成订单的总金额"
    sql: "SUM(CASE WHEN orders.status IN ('paid', 'shipped', 'completed') THEN orders.total_amount ELSE 0 END)"
    type: sum
    unit: "元"

  - name: total_orders
    description: "总订单数"
    sql: "COUNT(DISTINCT orders.id)"
    type: count

  - name: paid_orders
    description: "已支付订单数"
    sql: "COUNT(DISTINCT CASE WHEN orders.status IN ('paid', 'shipped', 'completed') THEN orders.id END)"
    type: count

  - name: avg_order_value
    description: "平均订单金额 (AOV)"
    sql: |
      SUM(CASE WHEN orders.status IN ('paid', 'shipped', 'completed') THEN orders.total_amount ELSE 0 END) /
      NULLIF(COUNT(DISTINCT CASE WHEN orders.status IN ('paid', 'shipped', 'completed') THEN orders.id END), 0)
    type: avg
    unit: "元"

  - name: order_completion_rate
    description: "订单完成率"
    sql: |
      COUNT(DISTINCT CASE WHEN orders.status = 'completed' THEN orders.id END)::DECIMAL /
      NULLIF(COUNT(DISTINCT orders.id), 0) * 100
    type: percentage
    unit: "%"

  - name: cancellation_rate
    description: "订单取消率"
    sql: |
      COUNT(DISTINCT CASE WHEN orders.status = 'cancelled' THEN orders.id END)::DECIMAL /
      NULLIF(COUNT(DISTINCT orders.id), 0) * 100
    type: percentage
    unit: "%"

filters:
  - name: last_7_days
    sql: "orders.created_at >= CURRENT_DATE - INTERVAL '7 days'"
    description: "最近7天"

  - name: last_30_days
    sql: "orders.created_at >= CURRENT_DATE - INTERVAL '30 days'"
    description: "最近30天"

  - name: last_90_days
    sql: "orders.created_at >= CURRENT_DATE - INTERVAL '90 days'"
    description: "最近90天"

  - name: this_month
    sql: "DATE_TRUNC('month', orders.created_at) = DATE_TRUNC('month', CURRENT_DATE)"
    description: "本月"

  - name: last_month
    sql: "DATE_TRUNC('month', orders.created_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')"
    description: "上月"

  - name: paid_only
    sql: "orders.status IN ('paid', 'shipped', 'completed')"
    description: "仅已支付订单"
"""

CUBE_USER_ANALYTICS = """cube: user_analytics
description: "用户分析指标 - 用户数量、活跃度、LTV"

dimensions:
  - name: registration_time
    description: "用户注册时间"
    column: "users.created_at"
    granularity:
      - day:
          sql: "DATE(users.created_at)"
          description: "按天"
      - month:
          sql: "DATE_TRUNC('month', users.created_at)"
          description: "按月"

  - name: city
    description: "用户所在城市"
    column: "users.city"

  - name: user_status
    description: "用户状态"
    column: "users.status"

metrics:
  - name: total_users
    description: "总用户数"
    sql: "COUNT(DISTINCT users.id)"
    type: count

  - name: active_users
    description: "活跃用户数（状态为active）"
    sql: "COUNT(DISTINCT CASE WHEN users.status = 'active' THEN users.id END)"
    type: count

  - name: new_users
    description: "新注册用户数"
    sql: "COUNT(DISTINCT CASE WHEN users.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN users.id END)"
    type: count

  - name: paying_users
    description: "付费用户数（有已支付订单的用户）"
    sql: |
      COUNT(DISTINCT CASE 
        WHEN EXISTS (
          SELECT 1 FROM orders o 
          WHERE o.user_id = users.id 
          AND o.status IN ('paid', 'shipped', 'completed')
        ) THEN users.id 
      END)
    type: count

  - name: customer_lifetime_value
    description: "客户生命周期价值 (CLV) - 平均每个用户的总消费"
    sql: |
      COALESCE(
        SUM(CASE WHEN orders.status IN ('paid', 'shipped', 'completed') THEN orders.total_amount ELSE 0 END) /
        NULLIF(COUNT(DISTINCT CASE WHEN orders.status IN ('paid', 'shipped', 'completed') THEN orders.user_id END), 0),
        0
      )
    type: avg
    unit: "元"
    join: "LEFT JOIN orders ON users.id = orders.user_id"

  - name: avg_orders_per_user
    description: "人均订单数"
    sql: |
      COUNT(DISTINCT CASE WHEN orders.status IN ('paid', 'shipped', 'completed') THEN orders.id END)::DECIMAL /
      NULLIF(COUNT(DISTINCT CASE WHEN orders.status IN ('paid', 'shipped', 'completed') THEN orders.user_id END), 0)
    type: avg
    join: "LEFT JOIN orders ON users.id = orders.user_id"

  - name: conversion_rate
    description: "用户转化率 - 注册用户中有购买行为的比例"
    sql: |
      COUNT(DISTINCT CASE 
        WHEN EXISTS (
          SELECT 1 FROM orders o 
          WHERE o.user_id = users.id 
          AND o.status IN ('paid', 'shipped', 'completed')
        ) THEN users.id 
      END)::DECIMAL /
      NULLIF(COUNT(DISTINCT users.id), 0) * 100
    type: percentage
    unit: "%"

filters:
  - name: active_only
    sql: "users.status = 'active'"
    description: "仅活跃用户"

  - name: registered_last_30_days
    sql: "users.created_at >= CURRENT_DATE - INTERVAL '30 days'"
    description: "最近30天注册"
"""

CUBE_PRODUCT_ANALYTICS = """cube: product_analytics
description: "商品分析指标 - 销量、收入、利润"

dimensions:
  - name: category
    description: "商品类别"
    column: "products.category"

  - name: product_name
    description: "商品名称"
    column: "products.name"

  - name: order_time
    description: "订单时间"
    column: "orders.created_at"
    join: |
      JOIN order_items ON products.id = order_items.product_id
      JOIN orders ON order_items.order_id = orders.id
    granularity:
      - day:
          sql: "DATE(orders.created_at)"
          description: "按天"
      - month:
          sql: "DATE_TRUNC('month', orders.created_at)"
          description: "按月"

metrics:
  - name: total_products
    description: "商品总数"
    sql: "COUNT(DISTINCT products.id)"
    type: count

  - name: products_sold
    description: "已售商品数量"
    sql: |
      SUM(CASE WHEN orders.status IN ('paid', 'shipped', 'completed') THEN order_items.quantity ELSE 0 END)
    type: sum
    join: |
      LEFT JOIN order_items ON products.id = order_items.product_id
      LEFT JOIN orders ON order_items.order_id = orders.id

  - name: product_revenue
    description: "商品销售收入"
    sql: |
      SUM(CASE WHEN orders.status IN ('paid', 'shipped', 'completed') THEN order_items.subtotal ELSE 0 END)
    type: sum
    unit: "元"
    join: |
      LEFT JOIN order_items ON products.id = order_items.product_id
      LEFT JOIN orders ON order_items.order_id = orders.id

  - name: product_profit
    description: "商品利润 = 销售收入 - 成本"
    sql: |
      SUM(CASE WHEN orders.status IN ('paid', 'shipped', 'completed') 
        THEN order_items.subtotal - (products.cost * order_items.quantity) 
        ELSE 0 END)
    type: sum
    unit: "元"
    join: |
      LEFT JOIN order_items ON products.id = order_items.product_id
      LEFT JOIN orders ON order_items.order_id = orders.id

  - name: profit_margin
    description: "利润率"
    sql: |
      CASE 
        WHEN SUM(CASE WHEN orders.status IN ('paid', 'shipped', 'completed') THEN order_items.subtotal ELSE 0 END) > 0
        THEN (
          SUM(CASE WHEN orders.status IN ('paid', 'shipped', 'completed') 
            THEN order_items.subtotal - (products.cost * order_items.quantity) 
            ELSE 0 END)::DECIMAL /
          SUM(CASE WHEN orders.status IN ('paid', 'shipped', 'completed') THEN order_items.subtotal ELSE 0 END)
        ) * 100
        ELSE 0
      END
    type: percentage
    unit: "%"
    join: |
      LEFT JOIN order_items ON products.id = order_items.product_id
      LEFT JOIN orders ON order_items.order_id = orders.id

  - name: avg_unit_price
    description: "平均单价"
    sql: "AVG(products.price)"
    type: avg
    unit: "元"

filters:
  - name: active_products
    sql: "products.status = 'active'"
    description: "仅在售商品"

  - name: electronics
    sql: "products.category = '电子产品'"
    description: "电子产品类别"

  - name: clothing
    sql: "products.category = '服装'"
    description: "服装类别"
"""

# ============================================
# 主函数
# ============================================

def main():
    print("=" * 60)
    print("SQL-Zen 测试数据初始化")
    print("=" * 60)
    print()
    
    # 连接数据库
    print(f"📦 连接数据库 ({DB_TYPE.upper()}): {DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}")
    try:
        if DB_TYPE == 'mysql':
            conn = mysql.connector.connect(**DB_CONFIG)
            cursor = conn.cursor()
        else:
            conn = psycopg2.connect(**DB_CONFIG)
            conn.autocommit = True
            cursor = conn.cursor()
        print("✅ 数据库连接成功")
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        print("\n请检查环境变量配置：")
        print("  DB_TYPE, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD")
        return
    
    # 创建表
    print("\n📋 创建数据库表...")
    try:
        if DB_TYPE == 'mysql':
            # MySQL 需要逐条执行
            for statement in CREATE_TABLES_SQL.split(';'):
                statement = statement.strip()
                if statement:
                    cursor.execute(statement)
            conn.commit()
        else:
            cursor.execute(CREATE_TABLES_SQL)
        print("✅ 表创建成功: users, products, orders, order_items")
    except Exception as e:
        print(f"❌ 表创建失败: {e}")
        return
    
    # 插入商品数据
    print("\n📦 插入商品数据...")
    product_data = []
    for name, category, price, cost in PRODUCTS_DATA:
        if DB_TYPE == 'mysql':
            product_insert = """
                INSERT INTO products (name, category, price, cost, stock, status)
                VALUES (%s, %s, %s, %s, %s, 'active')
            """
            cursor.execute(product_insert, (name, category, price, cost, random.randint(10, 100)))
            product_id = cursor.lastrowid
            product_data.append((product_id, name, category, price, cost))
        else:
            product_insert = """
                INSERT INTO products (name, category, price, cost, stock, status)
                VALUES (%s, %s, %s, %s, %s, 'active')
                RETURNING id, name, category, price, cost
            """
            cursor.execute(product_insert, (name, category, price, cost, random.randint(10, 100)))
            row = cursor.fetchone()
            product_data.append(row)
    
    if DB_TYPE == 'mysql':
        conn.commit()
    print(f"✅ 插入 {len(product_data)} 个商品")
    
    # 插入用户数据
    print("\n👥 插入用户数据...")
    users = generate_users(100)
    
    if DB_TYPE == 'mysql':
        user_insert = """
            INSERT INTO users (name, email, phone, city, country, status, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.executemany(user_insert, users)
        conn.commit()
        cursor.execute("SELECT id FROM users")
        user_ids = [row[0] for row in cursor.fetchall()]
    else:
        user_insert = """
            INSERT INTO users (name, email, phone, city, country, status, created_at, updated_at)
            VALUES %s
            RETURNING id
        """
        execute_values(cursor, user_insert, users)
        cursor.execute("SELECT id FROM users")
        user_ids = [row[0] for row in cursor.fetchall()]
    
    print(f"✅ 插入 {len(user_ids)} 个用户")
    
    # 插入订单数据
    print("\n🛒 插入订单数据...")
    orders, order_items = generate_orders(user_ids, product_data, 500)
    
    if DB_TYPE == 'mysql':
        order_insert = """
            INSERT INTO orders (user_id, total_amount, status, payment_method, shipping_address, 
                               created_at, paid_at, shipped_at, completed_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.executemany(order_insert, orders)
        conn.commit()
    else:
        order_insert = """
            INSERT INTO orders (user_id, total_amount, status, payment_method, shipping_address, 
                               created_at, paid_at, shipped_at, completed_at)
            VALUES %s
        """
        execute_values(cursor, order_insert, orders)
    
    print(f"✅ 插入 {len(orders)} 个订单")
    
    # 插入订单明细
    print("\n📝 插入订单明细...")
    
    if DB_TYPE == 'mysql':
        order_item_insert = """
            INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        cursor.executemany(order_item_insert, order_items)
        conn.commit()
    else:
        order_item_insert = """
            INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal, created_at)
            VALUES %s
        """
        execute_values(cursor, order_item_insert, order_items)
    
    print(f"✅ 插入 {len(order_items)} 条订单明细")
    
    # 关闭数据库连接
    cursor.close()
    conn.close()
    print("\n✅ 数据库初始化完成")
    
    # 创建 Schema 目录
    print("\n" + "=" * 60)
    print("生成 Schema 文件")
    print("=" * 60)
    
    # 确保目录存在
    (SCHEMA_DIR / 'tables').mkdir(parents=True, exist_ok=True)
    (SCHEMA_DIR / 'joins').mkdir(parents=True, exist_ok=True)
    (SCHEMA_DIR / 'cubes').mkdir(parents=True, exist_ok=True)
    
    # 写入 Schema 层文件
    print("\n📄 生成 Schema 层文件...")
    (SCHEMA_DIR / 'tables' / 'users.yaml').write_text(SCHEMA_USERS, encoding='utf-8')
    (SCHEMA_DIR / 'tables' / 'products.yaml').write_text(SCHEMA_PRODUCTS, encoding='utf-8')
    (SCHEMA_DIR / 'tables' / 'orders.yaml').write_text(SCHEMA_ORDERS, encoding='utf-8')
    (SCHEMA_DIR / 'tables' / 'order_items.yaml').write_text(SCHEMA_ORDER_ITEMS, encoding='utf-8')
    print("✅ schema/tables/users.yaml")
    print("✅ schema/tables/products.yaml")
    print("✅ schema/tables/orders.yaml")
    print("✅ schema/tables/order_items.yaml")
    
    # 写入关系定义
    print("\n🔗 生成关系定义文件...")
    (SCHEMA_DIR / 'joins' / 'relationships.yaml').write_text(JOINS_YAML, encoding='utf-8')
    print("✅ schema/joins/relationships.yaml")
    
    # 写入 Cube 层文件
    print("\n📊 生成 Cube 层文件...")
    (SCHEMA_DIR / 'cubes' / 'business-metrics.yaml').write_text(CUBE_BUSINESS_METRICS, encoding='utf-8')
    (SCHEMA_DIR / 'cubes' / 'user-analytics.yaml').write_text(CUBE_USER_ANALYTICS, encoding='utf-8')
    (SCHEMA_DIR / 'cubes' / 'product-analytics.yaml').write_text(CUBE_PRODUCT_ANALYTICS, encoding='utf-8')
    print("✅ schema/cubes/business-metrics.yaml")
    print("✅ schema/cubes/user-analytics.yaml")
    print("✅ schema/cubes/product-analytics.yaml")
    
    # 完成
    print("\n" + "=" * 60)
    print("🎉 初始化完成！")
    print("=" * 60)
    print()
    print("数据概览：")
    print(f"  - 用户: 100 人")
    print(f"  - 商品: {len(PRODUCTS_DATA)} 个")
    print(f"  - 订单: 500 个")
    print(f"  - 订单明细: {len(order_items)} 条")
    print()
    print("现在可以测试 ask 命令了：")
    print()
    print("  # 收入查询")
    print('  sql-zen ask "最近30天的总收入是多少？"')
    print()
    print("  # 订单统计")
    print('  sql-zen ask "上个月有多少订单？完成率是多少？"')
    print()
    print("  # 用户分析")
    print('  sql-zen ask "哪个城市的用户消费最多？"')
    print()
    print("  # 商品分析")
    print('  sql-zen ask "哪个类别的商品利润率最高？"')
    print()
    print("  # 复杂查询")
    print('  sql-zen ask "列出销量前5的商品及其收入"')
    print()

if __name__ == '__main__':
    main()
