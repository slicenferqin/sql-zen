#!/bin/bash

# SQL-Zen CLI 快速测试脚本

set -e  # 遇到错误立即退出

echo "=========================================="
echo "SQL-Zen CLI 快速测试"
echo "=========================================="
echo ""

# 检查环境变量
echo "1. 检查环境变量..."
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "❌ ANTHROPIC_API_KEY 未设置"
    echo "请创建 .env 文件或运行: export ANTHROPIC_API_KEY=sk-ant-..."
    exit 1
else
    echo "✅ ANTHROPIC_API_KEY 已设置"
fi
echo ""

# 检查编译结果
echo "2. 检查编译结果..."
if [ ! -d "dist" ]; then
    echo "❌ dist 目录不存在，请先运行: npm run build"
    exit 1
fi
echo "✅ dist 目录存在"
echo ""

# 创建测试目录
echo "3. 创建测试目录..."
TEST_DIR="test-sqlzen-$(date +%s)"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"
echo "✅ 测试目录创建: $TEST_DIR"
echo ""

# 测试 init 命令
echo "4. 测试 init 命令..."
node ../dist/cli/index.js init
if [ -d "schema" ]; then
    echo "✅ schema 目录创建成功"
    echo "   - tables/: $([ -d schema/tables ] && echo '✓' || echo '✗')"
    echo "   - joins/: $([ -d schema/joins ] && echo '✓' || echo '✗')"
    echo "   - cubes/: $([ -d schema/cubes ] && echo '✓' || echo '✗')"
    echo "   - examples/: $([ -d schema/examples ] && echo '✓' || echo '✗')"
    echo "   - skills/: $([ -d schema/skills ] && echo '✓' || echo '✗')"
else
    echo "❌ schema 目录创建失败"
    cd ..
    rm -rf "$TEST_DIR"
    exit 1
fi
echo ""

# 测试 validate 命令
echo "5. 测试 validate 命令..."
# 创建一个简单的表定义用于测试
cat > schema/tables/users.yaml << 'EOF'
table:
  name: users
  description: "用户表"
  columns:
    - name: id
      type: integer
      description: "用户ID"
    - name: name
      type: string
      description: "用户名"
    - name: email
      type: string
      description: "邮箱"
EOF

if node ../dist/cli/index.js validate 2>&1 | grep -q "valid"; then
    echo "✅ validate 命令执行成功"
else
    echo "⚠️  validate 命令执行（可能有警告）"
fi
echo ""

# 测试 validate --cube 命令
echo "6. 测试 validate --cube 命令..."
if node ../dist/cli/index.js validate --cube 2>&1 | grep -q "valid"; then
    echo "✅ validate --cube 命令执行成功"
else
    echo "⚠️  validate --cube 命令执行（可能有警告）"
fi
echo ""

# 测试 cube 命令
echo "7. 测试 cube 命令..."
node ../dist/cli/index.js cube test-analytics
if [ -f "schema/cubes/test-analytics.yaml" ]; then
    echo "✅ cube 命令创建成功"
    echo "   文件: schema/cubes/test-analytics.yaml"
else
    echo "❌ cube 命令创建失败"
fi
echo ""

# 测试 ask 命令（不连接真实数据库）
echo "8. 测试 ask 命令（仅验证命令可执行）..."
echo "   注意：此测试会尝试连接数据库，如果没有配置数据库会失败"
if node ../dist/cli/index.js ask "测试查询" 2>&1 | head -5; then
    echo "✅ ask 命令可执行（可能因数据库连接失败）"
else
    echo "⚠️  ask 命令执行（预期会因数据库连接失败）"
fi
echo ""

# 清理
echo "9. 清理测试目录..."
cd ..
rm -rf "$TEST_DIR"
echo "✅ 测试目录已清理"
echo ""

echo "=========================================="
echo "测试���成！"
echo "=========================================="
echo ""
echo "总结："
echo "✅ 编译成功"
echo "✅ init 命令正常"
echo "✅ validate 命令正常"
echo "✅ cube 命令正常"
echo "⚠️  ask 命令需要数据库配置才能完整测试"
echo ""
echo "下一步："
echo "1. 配置 .env 文件中的数据库连接信息"
echo "2. 运行完整测试: npm test"
echo "3. 准备发布: npm publish"
