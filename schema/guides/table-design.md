# 高质量表设计示例

本节提供完整的、高质量的 Schema 表定义示例，展示 SQL-Zen Schema 的最佳实践。

---

## 示例 1: 用户表 (Users)

### 完整定义

```yaml
table:
  name: users
  description: |
    用户表，存储所有注册用户的基本信息和账户状态。
    
    涵盖用户注册、身份验证、账户配置等信息。
    不包含用户的订单、支付等交易数据，这些数据在相关表中。
    
    数据范围：2020年1月至今，包含所有市场的用户。
    
    常见场景：
    - 分析用户注册趋势和活跃度
    - 用户分层和画像分析
    - 用户生命周期管理
    
  database: main_db
  schema: public

columns:
  - name: id
    type: BIGINT
    description: "用户唯一标识符"
    primary_key: true

  - name: email
    type: VARCHAR(255)
    description: |
      用户邮箱地址，用于登录和通知。
      
      格式：标准邮箱格式
      约束：全局唯一，注册时验证
      典型值：user@example.com

  - name: username
    type: VARCHAR(50)
    description: |
      用户名，用于显示和登录。
      
      格式：3-20个字符，字母数字和下划线
      约束：全局唯一
      典型值：john_doe_2024

  - name: password_hash
    type: VARCHAR(255)
    description: |
      用户密码的哈希值，使用 bcrypt 加密。
      
      注意：从不存储明文密码
      加密方式：bcrypt (cost factor 10)

  - name: full_name
    type: VARCHAR(100)
    description: |
      用户全名，用于显示和称呼。
      
      格式：名 + 姓（或本地化格式）
      典型值：张三, John Smith

  - name: date_of_birth
    type: DATE
    description: |
      用户出生日期，用于年龄验证和个性化推荐。
      
      格式：YYYY-MM-DD
      约束：必须是过去日期
      典型值：1990-05-15

  - name: gender
    type: VARCHAR(20)
    description: "用户性别，用于个性化推荐和统计分析"
    enum:
      - value: male
        description: "男性"
      - value: female
        description: "女性"
      - value: other
        description: "其他"
      - value: prefer_not_to_say
        description: "不愿透露"

  - name: country
    type: VARCHAR(2)
    description: |
      用户所在国家，使用 ISO 3166-1 alpha-2 代码。
      
      典型值：US, CN, JP, GB, DE

  - name: timezone
    type: VARCHAR(50)
    description: |
      用户时区，用于本地化时间显示。
      
      格式：IANA 时区标识符
      典型值：America/New_York, Asia/Shanghai

  - name: language
    type: VARCHAR(10)
    description: |
      用户首选语言，用于界面本地化。
      
      格式：ISO 639-1 语言代码
      典型值：en, zh, ja, es

  - name: status
    type: VARCHAR(20)
    description: "用户账户状态，反映用户的可用性"
    enum:
      - value: active
        description: "活跃用户，可以正常使用系统"
      - value: inactive
        description: "非活跃用户，超过6个月未登录"
      - value: suspended
        description: "暂停用户，违反了平台规则"
      - value: deleted
        description: "已删除用户，保留数据用于合规"

  - name: subscription_tier
    type: VARCHAR(20)
    description: "用户订阅等级，决定可用的功能和权益"
    enum:
      - value: free
        description: "免费用户，基础功能"
      - value: basic
        description: "基础订阅，标准功能"
      - value: premium
        description: "高级订阅，完整功能"

  - name: is_verified
    type: BOOLEAN
    description: |
      用户是否已验证邮箱或手机。
      
      true = 已通过验证，可以使用全部功能
      false = 未验证，功能受限

  - name: last_login_at
    type: TIMESTAMP
    description: |
      用户最后一次成功登录的时间。
      
      时区：UTC
      用于：判断用户活跃度

  - name: created_at
    type: TIMESTAMP
    description: |
      用户账户创建时间。
      
      时区：UTC
      用于：用户增长分析、用户生命周期分析

  - name: updated_at
    type: TIMESTAMP
    description: |
      用户信息最后一次更新时间。
      
      时区：UTC
      用于：追踪用户信息变更

common_filters:
  - name: active_users
    sql: "status = 'active' AND is_verified = true"
    description: "筛选活跃且已验证的用户"

  - name: new_users_last_30_days
    sql: "created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)"
    description: "最近30天注册的新用户"

  - name: inactive_users
    sql: "last_login_at < DATE_SUB(CURRENT_DATE, INTERVAL 180 DAY)"
    description: "超过180天未登录的非活跃用户"

measures:
  - name: total_users
    sql: "COUNT(*)"
    description: "总用户数，包含所有状态的用户"
    filters: []

  - name: active_users_count
    sql: "COUNT(*)"
    description: "活跃用户数，当前活跃且已验证的用户"
    filters: ["status = 'active'", "is_verified = true"]

  - name: new_users_this_month
    sql: "COUNT(*)"
    description: "本月新增用户数"
    filters: ["created_at >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')"]

  - name: verified_rate
    sql: "AVG(CASE WHEN is_verified = true THEN 1 ELSE 0 END)"
    description: "用户验证率，已验证用户占比"
    filters: []
```

---

## 示例 2: 订单表 (Orders)

### 完整定义

```yaml
table:
  name: orders
  description: |
    订单表，存储所有订单的核心信息和状态。
    
    涵盖订单创建、支付、发货、配送、退款等完整生命周期。
    不包含订单明细数据，明细请参考 order_items 表。
    
    数据范围：2020年1月至今，涵盖全球所有市场。
    
    常见场景：
    - 按时间维度分析订单量和金额趋势
    - 分析不同地区、渠道的订单表现
    - 订单生命周期状态转化分析
    - 订单取消率和退款率分析
    
  database: main_db
  schema: public

columns:
  - name: id
    type: BIGINT
    description: "订单唯一标识符"
    primary_key: true

  - name: order_number
    type: VARCHAR(50)
    description: |
      订单编号，面向用户的可读订单标识。
      
      格式：ORD-YYYY-MMDD-XXXXX
      示例：ORD-2024-0115-00001
      约束：全局唯一，不可重复

  - name: user_id
    type: BIGINT
    description: "关联用户的唯一标识"
    foreign_key:
      table: users
      column: id

  - name: store_id
    type: INT
    description: "关联店铺的标识，多店铺场景使用"
    foreign_key:
      table: stores
      column: id

  - name: status
    type: VARCHAR(50)
    description: "订单当前状态，反映订单生命周期的各个阶段"
    enum:
      - value: pending
        description: "订单已创建，等待用户支付，15分钟超时"
      - value: paid
        description: "用户已支付，等待仓库处理"
      - value: processing
        description: "仓库正在拣货和打包"
      - value: shipped
        description: "订单已发货，在配送途中"
      - value: delivered
        description: "订单已送达并确认"
      - value: cancelled
        description: "订单已取消，未支付或支付后退回"
      - value: refunded
        description: "订单已退款，全部或部分退款"

  - name: order_type
    type: VARCHAR(30)
    description: "订单类型，区分不同的订单来源和性质"
    enum:
      - value: standard
        description: "标准订单，常规购买流程"
      - value: pre_order
        description: "预售订单，商品未上市时购买"
      - value: subscription
        description: "订阅订单，周期性自动下单"
      - value: bulk
        description: "批量订单，企业或大客户订单"

  - name: channel
    type: VARCHAR(30)
    description: "订单渠道，标识订单的来源渠道"
    enum:
      - value: web
        description: "网站下单"
      - value: mobile_app
        description: "移动 App 下单"
      - value: wechat
        description: "微信小程序下单"
      - value: api
        description: "API 接口下单"
      - value: admin
        description: "后台代客下单"

  - name: subtotal_amount
    type: DECIMAL(12,2)
    description: |
      商品小计金额，不含运费、税费等。
      
      单位：USD
      计算：SUM(order_items.unit_price * order_items.quantity)
      典型范围：10 - 10000

  - name: shipping_amount
    type: DECIMAL(10,2)
    description: |
      运费金额，根据配送方式和距离计算。
      
      单位：USD
      典型值：0（免运费）, 5.99, 9.99
      计算方式：基于配送方式、重量、距离

  - name: tax_amount
    type: DECIMAL(10,2)
    description: |
      税费金额，根据用户所在地区和商品类别计算。
      
      单位：USD
      计算方式：subtotal_amount × 税率
      典型税率：0-25%（取决于地区）

  - name: discount_amount
    type: DECIMAL(10,2)
    description: |
      优惠金额，包含优惠券、折扣等所有优惠。
      
      单位：USD
      计算方式：优惠前金额 - 优惠后金额
      典型值：0, 5, 10, 20

  - name: total_amount
    type: DECIMAL(12,2)
    description: |
      订单总金额，用户实际支付的金额。
      
      单位：USD
      计算公式：subtotal_amount + shipping_amount + tax_amount - discount_amount
      最小值：0.01（最小订单金额）
      典型范围：10 - 50000
      
      注意：退款后此值不会改变，请参考 refunded_amount 列

  - name: refunded_amount
    type: DECIMAL(12,2)
    description: |
      已退款金额，累计退款总额。
      
      单位：USD
      典型值：0, total_amount（全额退款）
      用于：计算实际收入

  - name: currency
    type: VARCHAR(3)
    description: |
      订单货币，使用 ISO 4217 代码。
      
      典型值：USD, EUR, CNY, JPY, GBP

  - name: payment_method
    type: VARCHAR(30)
    description: "支付方式，用户选择的支付渠道"
    enum:
      - value: credit_card
        description: "信用卡支付"
      - value: debit_card
        description: "借记卡支付"
      - value: paypal
        description: "PayPal 支付"
      - value: apple_pay
        description: "Apple Pay"
      - value: google_pay
        description: "Google Pay"
      - value: wechat_pay
        description: "微信支付"
      - value: alipay
        description: "支付宝"

  - name: payment_status
    type: VARCHAR(30)
    description: "支付状态，反映资金流转状态"
    enum:
      - value: unpaid
        description: "未支付"
      - value: processing
        description: "支付处理中"
      - value: paid
        description: "已支付"
      - value: failed
        description: "支付失败"
      - value: refunded
        description: "已退款"

  - name: billing_name
    type: VARCHAR(100)
    description: "账单姓名，用于支付账单"

  - name: billing_email
    type: VARCHAR(255)
    description: "账单邮箱，用于发送收据和发票"

  - name: shipping_name
    type: VARCHAR(100)
    description: "收货人姓名"

  - name: shipping_address
    type: TEXT
    description: "配送地址，完整地址信息"
    examples:
      - "123 Main Street, New York, NY 10001, USA"
      - "456 Park Avenue, Los Angeles, CA 90001, USA"

  - name: shipping_city
    type: VARCHAR(100)
    description: "配送城市"

  - name: shipping_state
    type: VARCHAR(100)
    description: "配送州/省"

  - name: shipping_country
    type: VARCHAR(2)
    description: "配送国家，使用 ISO 3166-1 alpha-2 代码"

  - name: shipping_postal_code
    type: VARCHAR(20)
    description: "配送邮政编码"

  - name: tracking_number
    type: VARCHAR(100)
    description: "物流追踪号码，用于查询配送状态"
    examples:
      - "1Z999AA10123456784"
      - "SF1234567890"

  - name: carrier
    type: VARCHAR(50)
    description: "物流服务商"
    enum:
      - value: fedex
        description: "联邦快递"
      - value: ups
        description: "联合包裹"
      - value: dhl
        description: "敦豪快递"
      - value: sf_express
        description: "顺丰速运"

  - name: notes
    type: TEXT
    description: |
      用户备注信息，特殊要求或说明。
      
      典型内容：配送时间要求、包装要求等
      长度限制：最多500字

  - name: internal_notes
    type: TEXT
    description: |
      内部备注，客服或运营人员记录的备注。
      
      用途：特殊处理、客户投诉记录等
      权限：仅内部可见

  - name: is_gift
    type: BOOLEAN
    description: "是否为礼品订单，影响包装和发货"

  - name: gift_message
    type: TEXT
    description: "礼品留言，仅在 is_gift = true 时有效"

  - name: coupon_code
    type: VARCHAR(50)
    description: |
      使用的优惠码。
      
      关联表：coupons
      用于：追踪优惠码使用效果

  - name: created_at
    type: TIMESTAMP
    description: |
      订单创建时间。
      
      时区：UTC
      用于：订单趋势分析、订单周期分析

  - name: paid_at
    type: TIMESTAMP
    description: |
      订单支付时间。
      
      时区：UTC
      用于：支付转化率分析

  - name: shipped_at
    type: TIMESTAMP
    description: |
      订单发货时间。
      
      时区：UTC
      用于：发货时效分析

  - name: delivered_at
    type: TIMESTAMP
    description: |
      订单送达时间。
      
      时区：UTC
      用于：配送时效分析

  - name: cancelled_at
    type: TIMESTAMP
    description: |
      订单取消时间。
      
      时区：UTC
      用于：取消率分析

  - name: refunded_at
    type: TIMESTAMP
    description: |
      订单退款时间。
      
      时区：UTC
      用于：退款率分析

common_filters:
  - name: paid_orders
    sql: "payment_status = 'paid' AND status IN ('paid', 'processing', 'shipped', 'delivered')"
    description: "已支付且未取消的订单"

  - name: delivered_orders
    sql: "status = 'delivered'"
    description: "已完成的订单"

  - name: cancelled_orders
    sql: "status = 'cancelled'"
    description: "已取消的订单"

  - name: orders_last_7_days
    sql: "created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)"
    description: "最近7天的订单"

  - name: orders_last_30_days
    sql: "created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)"
    description: "最近30天的订单"

  - name: high_value_orders
    sql: "total_amount >= 1000"
    description: "金额超过1000的高价值订单"

measures:
  - name: total_orders
    sql: "COUNT(*)"
    description: "订单总数，包含所有状态的订单"
    filters: []

  - name: total_revenue
    sql: "SUM(total_amount)"
    description: "总订单金额，包含已支付订单的金额总和"
    filters: ["payment_status = 'paid'", "status != 'cancelled'"]

  - name: net_revenue
    sql: "SUM(total_amount - refunded_amount)"
    description: "净收入，实际到账金额（扣除退款）"
    filters: ["payment_status = 'paid'"]

  - name: average_order_value
    sql: "AVG(total_amount)"
    description: "平均订单金额（AOV）"
    filters: ["payment_status = 'paid'", "status != 'cancelled'"]

  - name: cancellation_rate
    sql: "AVG(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)"
    description: "订单取消率"
    filters: []

  - name: refund_rate
    sql: "AVG(CASE WHEN payment_status = 'refunded' THEN 1 ELSE 0 END)"
    description: "订单退款率"
    filters: []

  - name: daily_orders
    sql: "COUNT(*)"
    description: "每日订单数"
    filters: ["DATE(created_at) = CURRENT_DATE"]

  - name: daily_revenue
    sql: "SUM(total_amount)"
    description: "每日订单金额"
    filters: ["payment_status = 'paid'", "DATE(created_at) = CURRENT_DATE"]
```

---

## 示例 3: 订单明细表 (Order Items)

### 完整定义

```yaml
table:
  name: order_items
  description: |
    订单明细表，存储每个订单的商品明细信息。
    
    每个订单可以包含多个商品明细，与 orders 表是一对多关系。
    
    数据范围：2020年1月至今，与订单表一致。
    
    常见场景：
    - 分析商品购买频次和金额
    - 订单客单价分析（商品数量分布）
    - 商品组合分析（一起购买的商品）
    - 退换货分析
    
  database: main_db
  schema: public

columns:
  - name: id
    type: BIGINT
    description: "订单明细唯一标识符"
    primary_key: true

  - name: order_id
    type: BIGINT
    description: "关联订单的唯一标识"
    foreign_key:
      table: orders
      column: id

  - name: product_id
    type: BIGINT
    description: "关联商品的唯一标识"
    foreign_key:
      table: products
      column: id

  - name: variant_id
    type: BIGINT
    description: "关联商品变体的标识（如不同颜色、尺寸）"
    foreign_key:
      table: product_variants
      column: id

  - name: sku
    type: VARCHAR(50)
    description: |
      商品 SKU（库存单位），唯一标识商品变体。
      
      格式：{category}-{product}-{variant}
      示例：CLOTH-SHIRT-BLACK-L
      约束：全局唯一

  - name: product_name
    type: VARCHAR(255)
    description: "商品名称，冗余存储以提升查询性能"

  - name: variant_name
    type: VARCHAR(100)
    description: "变体名称，如颜色、尺寸"
    examples:
      - "黑色 / L码"
      - "红色 / M码"

  - name: quantity
    type: INT
    description: |
      购买数量。
      
      最小值：1
      最大值：999
      典型值：1-5
      单位：件

  - name: unit_price
    type: DECIMAL(10,2)
    description: |
      商品单价，下单时的实际价格。
      
      单位：USD
      注意：此价格可能不同于商品当前价格
      用于：计算小计金额

  - name: discount_amount
    type: DECIMAL(10,2)
    description: |
      单件商品的优惠金额。
      
      单位：USD
      计算：原价 - 单价

  - name: total_amount
    type: DECIMAL(12,2)
    description: |
      商品小计金额，数量乘以单价。
      
      单位：USD
      计算公式：quantity × unit_price

  - name: cost_price
    type: DECIMAL(10,2)
    description: |
      商品成本价，用于计算毛利。
      
      单位：USD
      权限：仅内部可见
      用途：计算毛利率

  - name: gross_profit
    type: DECIMAL(10,2)
    description: |
      单件商品毛利。
      
      单位：USD
      计算：unit_price - cost_price

  - name: is_returned
    type: BOOLEAN
    description: "是否已退货"

  - name: returned_quantity
    type: INT
    description: "已退货数量，0 表示未退货"
    default: 0

  - name: returned_at
    type: TIMESTAMP
    description: "退货时间"
    
  - name: notes
    type: TEXT
    description: "备注信息"

common_filters:
  - name: returned_items
    sql: "is_returned = true"
    description: "已退货的商品"

  - name: high_quantity_items
    sql: "quantity >= 10"
    description: "购买数量大于等于10的商品"

measures:
  - name: total_items_sold
    sql: "SUM(quantity)"
    description: "总销售商品数量"
    filters: []

  - name: total_gross_profit
    sql: "SUM(gross_profit * quantity)"
    description: "总毛利金额"
    filters: []

  - name: return_rate
    sql: "AVG(CASE WHEN is_returned = true THEN 1 ELSE 0 END)"
    description: "商品退货率"
    filters: []

  - name: average_quantity_per_order
    sql: "AVG(quantity)"
    description: "平均每单商品数量"
    filters: []
```

---

## 设计要点总结

通过以上示例，高质量 Schema 设计的关键点：

1. **详细的描述**：每个字段都有清晰的业务含义说明
2. **枚举定义**：所有状态、类型字段都有枚举值和含义
3. **外键关系**：明确声明表间关联关系
4. **常用过滤器**：预定义高频查询条件
5. **度量定义**：预定义常见的分析指标
6. **示例数据**：为复杂字段提供示例值
7. **业务规则**：描述中包含重要的业务规则和计算方式

这些实践能显著提升 LLM 生成 SQL 的准确性和实用性。
