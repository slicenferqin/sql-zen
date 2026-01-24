# Schema 目录

此目录包含数据库的语义层定义文件。

## 目录结构

```
schema/
├── tables/         # 表定义 (YAML)
├── joins/          # 关联关系定义
├── measures/       # 常用度量定义
└── examples/       # 示例 SQL 查询
```

## 快速开始

1. 在 `tables/` 目录下为每个表创建 YAML 文件
2. 在 `joins/` 目录下定义表之间的关联关系
3. 在 `examples/` 目录下添加常用查询示例

详细的 Schema 规范请参考 [设计文档](../docs/design.md)。
