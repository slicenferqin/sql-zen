# 列命名规范

统一的列命名规范能让 Schema 更易读、更易维护，并提升 LLM 生成 SQL 的准确性。

## 目录

1. [通用原则](#通用原则)
2. [命名风格](#命名风格)
3. [字段类型规范](#字段类型规范)
4. [特殊命名模式](#特殊命名模式)
5. [命名检查清单](#命名检查清单)

---

## 通用原则

### 1. 一致性优先
- 全项目范围内使用相同的命名风格
- 相同概念在不同表中使用相同命名
- 遵循语言惯例（英语 vs. 本地化）

### 2. 可读性
- 名称应能自解释，无需查看文档就能理解含义
- 避免过于简短或过于冗长的名称
- 使用完整的单词而非缩写（除非是行业标准缩写）

### 3. 可维护性
- 命名应考虑未来的扩展性
- 避免使用版本号（v1, v2），考虑使用更描述性的名称
- 保留足够的扩展空间（如 user_type 而非 is_admin）

---

## 命名风格

### 基本规则
- **风格**：蛇形命名（snake_case）
- **分隔符**：下划线 `_`
- **大小写**：全小写
- **字符**：字母、数字、下划线（不包含其他特殊字符）

### 正确示例
```yaml
✅ user_id
✅ created_at
✅ total_amount
✅ order_status
```

### 错误示例
```yaml
❌ userId           # 驼峰命名
❌ created-at       # 使用连字符
❌ TotalAmount      # 大写开头
❌ user@id          # 特殊字符
❌ user-id          # 使用连字符
```

---

## 字段类型规范

### 主键
```yaml
# 单表主键
- name: id
  type: BIGINT
  description: "记录唯一标识符"
  primary_key: true

# 复合主键中的字段
- name: order_id
  type: BIGINT
  description: "订单ID，复合主键的一部分"
```

### 外键
```yaml
# 格式：{referenced_table}_id
- name: user_id
  type: BIGINT
  description: "关联用户的外键"
  foreign_key:
    table: users
    column: id

- name: product_id
  type: BIGINT
  description: "关联商品的外键"
  foreign_key:
    table: products
    column: id
```

### 时间戳
```yaml
# 创建时间
- name: created_at
  type: TIMESTAMP
  description: "记录创建时间"

# 更新时间
- name: updated_at
  type: TIMESTAMP
  description: "记录最后更新时间"

# 特定事件时间（使用 {event}_at 格式）
- name: paid_at
  type: TIMESTAMP
  description: "支付时间"

- name: shipped_at
  type: TIMESTAMP
  description: "发货时间"

- name: delivered_at
  type: TIMESTAMP
  description: "送达时间"

- name: cancelled_at
  type: TIMESTAMP
  description: "取消时间"

- name: deleted_at
  type: TIMESTAMP
  description: "删除时间（软删除）"
```

### 布尔值
```yaml
# 格式：is_{condition} 或 has_{feature}
- name: is_active
  type: BOOLEAN
  description: "是否激活"

- name: is_verified
  type: BOOLEAN
  description: "是否已验证"

- name: is_published
  type: BOOLEAN
  description: "是否已发布"

- name: has_discount
  type: BOOLEAN
  description: "是否有折扣"

- name: has_coupon
  type: BOOLEAN
  description: "是否使用了优惠券"

# 避免使用
❌ active        # 不明确
❌ verified      # 不明确
```

### 状态码
```yaml
# 使用 _status 或 _state 后缀
- name: status
  type: VARCHAR(50)
  description: "记录状态"

- name: order_status
  type: VARCHAR(50)
  description: "订单状态"

- name: payment_status
  type: VARCHAR(30)
  description: "支付状态"

- name: fulfillment_status
  type: VARCHAR(30)
  description: "履约状态"
```

### 金额和价格
```yaml
# 使用 _amount 或 _price 后缀
- name: amount
  type: DECIMAL(12,2)
  description: "金额"

- name: total_amount
  type: DECIMAL(12,2)
  description: "总金额"

- name: price
  type: DECIMAL(10,2)
  description: "价格"

- name: unit_price
  type: DECIMAL(10,2)
  description: "单价"

- name: subtotal_amount
  type: DECIMAL(12,2)
  description: "小计金额"

- name: shipping_amount
  type: DECIMAL(10,2)
  description: "运费金额"

- name: tax_amount
  type: DECIMAL(10,2)
  description: "税费金额"

- name: discount_amount
  type: DECIMAL(10,2)
  description: "优惠金额"

- name: refunded_amount
  type: DECIMAL(12,2)
  description: "退款金额"

# 成本相关
- name: cost_price
  type: DECIMAL(10,2)
  description: "成本价"

- name: gross_profit
  type: DECIMAL(10,2)
  description: "毛利"
```

### 数量和计数
```yaml
# 使用 _count 或 _quantity 后缀
- name: count
  type: INT
  description: "数量"

- name: quantity
  type: INT
  description: "数量"

- name: total_count
  type: INT
  description: "总数"

- name: item_count
  type: INT
  description: "项目数量"

- name: view_count
  type: INT
  description: "浏览次数"

- name: download_count
  type: INT
  description: "下载次数"

- name: click_count
  type: INT
  description: "点击次数"

- name: like_count
  type: INT
  description: "点赞次数"

- name: share_count
  type: INT
  description: "分享次数"
```

### 百分比和比率
```yaml
# 使用 _rate 或 _ratio 或 _percentage 后缀
- name: rate
  type: DECIMAL(5,2)
  description: "比率"

- name: tax_rate
  type: DECIMAL(5,2)
  description: "税率"

- name: discount_rate
  type: DECIMAL(5,2)
  description: "折扣率"

- name: conversion_rate
  type: DECIMAL(5,2)
  description: "转化率"

- name: percentage
  type: DECIMAL(5,2)
  description: "百分比"
```

### 日期
```yaml
# 使用 _date 或 _day 后缀
- name: date
  type: DATE
  description: "日期"

- name: birth_date
  type: DATE
  description: "出生日期"

- name: start_date
  type: DATE
  description: "开始日期"

- name: end_date
  type: DATE
  description: "结束日期"

- name: due_date
  type: DATE
  description: "到期日期"

- name: hire_date
  type: DATE
  description: "入职日期"

- name: event_date
  type: DATE
  description: "事件日期"
```

### 用户信息
```yaml
- name: username
  type: VARCHAR(50)
  description: "用户名"

- name: email
  type: VARCHAR(255)
  description: "邮箱地址"

- name: password_hash
  type: VARCHAR(255)
  description: "密码哈希值"

- name: first_name
  type: VARCHAR(50)
  description: "名字"

- name: last_name
  type: VARCHAR(50)
  description: "姓氏"

- name: full_name
  type: VARCHAR(100)
  description: "全名"

- name: phone
  type: VARCHAR(20)
  description: "电话号码"

- name: mobile
  type: VARCHAR(20)
  description: "手机号码"
```

### 地址信息
```yaml
- name: address
  type: TEXT
  description: "地址"

- name: street_address
  type: VARCHAR(255)
  description: "街道地址"

- name: city
  type: VARCHAR(100)
  description: "城市"

- name: state
  type: VARCHAR(100)
  description: "州/省"

- name: province
  type: VARCHAR(100)
  description: "省份"

- name: country
  type: VARCHAR(2)
  description: "国家代码（ISO 3166-1 alpha-2）"

- name: postal_code
  type: VARCHAR(20)
  description: "邮政编码"

- name: zip_code
  type: VARCHAR(10)
  description: "邮编（美式）"

- name: latitude
  type: DECIMAL(10,6)
  description: "纬度"

- name: longitude
  type: DECIMAL(10,6)
  description: "经度"
```

### 位置和坐标
```yaml
- name: latitude
  type: DECIMAL(10,6)
  description: "纬度"

- name: longitude
  type: DECIMAL(10,6)
  description: "经度"

- name: location
  type: VARCHAR(100)
  description: "位置描述"

- name: region
  type: VARCHAR(100)
  description: "区域"

- name: district
  type: VARCHAR(100)
  description: "地区"

- name: zone
  type: VARCHAR(100)
  description: "区域"
```

### URL 和链接
```yaml
- name: url
  type: VARCHAR(500)
  description: "URL 地址"

- name: link
  type: VARCHAR(500)
  description: "链接"

- name: website
  type: VARCHAR(500)
  description: "网站地址"

- name: image_url
  type: VARCHAR(500)
  description: "图片 URL"

- name: video_url
  type: VARCHAR(500)
  description: "视频 URL"

- name: avatar_url
  type: VARCHAR(500)
  description: "头像 URL"

- name: thumbnail_url
  type: VARCHAR(500)
  description: "缩略图 URL"
```

### 描述和内容
```yaml
- name: description
  type: TEXT
  description: "描述"

- name: content
  type: TEXT
  description: "内容"

- name: body
  type: TEXT
  description: "正文"

- name: summary
  type: VARCHAR(500)
  description: "摘要"

- name: notes
  type: TEXT
  description: "备注"

- name: message
  type: TEXT
  description: "消息"

- name: comment
  type: TEXT
  description: "评论"

- name: feedback
  type: TEXT
  description: "反馈"
```

### 类型和分类
```yaml
- name: type
  type: VARCHAR(50)
  description: "类型"

- name: category
  type: VARCHAR(100)
  description: "类别"

- name: subcategory
  type: VARCHAR(100)
  description: "子类别"

- name: classification
  type: VARCHAR(100)
  description: "分类"

- name: group
  type: VARCHAR(100)
  description: "分组"

- name: tag
  type: VARCHAR(100)
  description: "标签"
```

### 代码和标识符
```yaml
- name: code
  type: VARCHAR(50)
  description: "代码"

- name: sku
  type: VARCHAR(50)
  description: "SKU（库存单位）"

- name: barcode
  type: VARCHAR(50)
  description: "条形码"

- name: upc
  type: VARCHAR(20)
  description: "UPC 代码"

- name: isbn
  type: VARCHAR(20)
  description: "ISBN 书号"

- name: serial_number
  type: VARCHAR(50)
  description: "序列号"

- name: tracking_number
  type: VARCHAR(100)
  description: "追踪号码"

- name: order_number
  type: VARCHAR(50)
  description: "订单编号"

- name: invoice_number
  type: VARCHAR(50)
  description: "发票编号"

- name: reference_number
  type: VARCHAR(50)
  description: "参考编号"
```

---

## 特殊命名模式

### 软删除
```yaml
# 软删除模式（标记删除而非物理删除）
- name: deleted_at
  type: TIMESTAMP
  description: "删除时间（NULL 表示未删除）"

- name: is_deleted
  type: BOOLEAN
  description: "是否已删除"

# 查询时使用 WHERE deleted_at IS NULL 过滤未删除记录
```

### 版本控制
```yaml
# 乐观锁版本号
- name: version
  type: INT
  description: "版本号，用于乐观锁控制"

# 数据版本
- name: data_version
  type: VARCHAR(20)
  description: "数据版本"

# 格式化版本号
- name: version_number
  type: VARCHAR(20)
  description: "版本号（如 1.0.0, 2.1.3）"
```

### 排序和排序
```yaml
- name: sort_order
  type: INT
  description: "排序顺序"

- name: display_order
  type: INT
  description: "显示顺序"

- name: priority
  type: INT
  description: "优先级"

- name: weight
  type: INT
  description: "权重"

- name: position
  type: INT
  description: "位置"
```

### 配置和设置
```yaml
- name: settings
  type: JSON
  description: "配置设置"

- name: config
  type: JSON
  description: "配置"

- name: options
  type: JSON
  description: "选项"

- name: parameters
  type: JSON
  description: "参数"

- name: metadata
  type: JSON
  description: "元数据"
```

### 外部引用
```yaml
- name: external_id
  type: VARCHAR(100)
  description: "外部系统 ID"

- name: external_key
  type: VARCHAR(100)
  description: "外部系统键"

- name: third_party_id
  type: VARCHAR(100)
  description: "第三方系统 ID"

- name: provider_id
  type: VARCHAR(100)
  description: "服务提供商 ID"

- name: source_id
  type: VARCHAR(100)
  description: "来源 ID"
```

### 审计字段
```yaml
- name: created_by
  type: BIGINT
  description: "创建人 ID"

- name: updated_by
  type: BIGINT
  description: "更新人 ID"

- name: created_at
  type: TIMESTAMP
  description: "创建时间"

- name: updated_at
  type: TIMESTAMP
  description: "更新时间"

- name: created_ip
  type: VARCHAR(45)
  description: "创建时 IP 地址"

- name: updated_ip
  type: VARCHAR(45)
  description: "更新时 IP 地址"
```

### 多语言
```yaml
- name: title_en
  type: VARCHAR(255)
  description: "英文标题"

- name: title_zh
  type: VARCHAR(255)
  description: "中文标题"

- name: description_en
  type: TEXT
  description: "英文描述"

- name: description_zh
  type: TEXT
  description: "中文描述"

- name: language
  type: VARCHAR(10)
  description: "语言代码（如 en, zh, ja）"

- name: locale
  type: VARCHAR(20)
  description: "区域设置（如 en-US, zh-CN）"
```

---

## 命名检查清单

在定义新列时，检查以下事项：

### ✅ 必要检查
- [ ] 使用蛇形命名（snake_case）
- [ ] 名称全小写
- [ ] 只包含字母、数字、下划线
- [ ] 名称自解释，能理解含义
- [ ] 遵循字段类型规范（如时间戳用 _at 后缀）
- [ ] 避免使用保留字（如 `order`, `group`, `user`）

### ✅ 可选检查
- [ ] 名称长度合理（不超过 50 字符）
- [ ] 避免不必要的缩写
- [ ] 与项目中类似字段命名一致
- [ ] 考虑国际化需求（如是否需要语言后缀）
- [ ] 预留扩展空间（如 user_type 而非 is_admin）

### ❌ 避免
- [ ] 避免驼峰命名（userId, firstName）
- [ ] 避免连字符（user-name, created-at）
- [ ] 避免空格（user id, created at）
- [ ] 避免特殊字符（user@id, user.id）
- [ ] 避免单字符名（x, y, z）
- [ ] 避免数字前缀（1_name, 2_value）
- [ ] 避免保留字（order, group, user, table, column）
- [ ] 避免过于简短（usr, pwd, addr）

---

## 常见命名反例

### 反例 1: 过于简短
```yaml
❌ usr         # 应为：user
❌ pwd         # 应为：password_hash
❌ addr        # 应为：address
❌ nm          # 应为：name
❌ qty         # 应为：quantity
```

### 反例 2: 使用错误风格
```yaml
❌ userId      # 应为：user_id
❌ firstName   # 应为：first_name
❌ orderStatus # 应为：order_status
❌ createdAt   # 应为：created_at
```

### 反例 3: 使用错误后缀
```yaml
❌ active_time # 应为：activated_at
❌ price_val   # 应为：price
❌ cnt         # 应为：count
❌ status_code # 应为：status（如果值是描述性的）
```

### 反例 4: 使用保留字
```yaml
❌ order       # 应为：order_id 或 order_number
❌ group       # 应为：group_id 或 group_name
❌ user        # 应为：user_id 或 user_name
❌ column      # 应为：column_id 或 column_name
```

---

通过遵循这些命名规范，你的 Schema 将更加清晰、一致和易于维护，从而提升 LLM 生成 SQL 的准确性和开发团队的协作效率。
