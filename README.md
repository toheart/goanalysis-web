# GoAnalysis Web

一个基于Vue.js的Go程序运行时分析工具，提供Goroutine追踪、函数分析等功能。

## 功能特性

### 运行时分析
- **Goroutine追踪**: 实时追踪和分析Goroutine的执行情况
- **函数分析**: 分析函数在Goroutine中的分布和调用关系
- **调用链路分析**: 显示从初始函数到目标函数的完整调用路径
- **性能统计**: 提供函数调用次数、平均时间、最大时间等性能指标

### 静态分析
- **调用图分析**: 分析函数间的静态调用关系
- **数据库分析**: 支持多种数据库格式的分析

## 新增功能：调用链路分析

在函数分析页面中，新增了**调用链路**功能，可以显示函数在Goroutine中的完整调用路径。

### 功能特点
- **完整链路展示**: 显示从初始函数到当前查询函数的完整调用路径（如 A->B->C->D）
- **实时加载**: 自动获取并显示调用链路信息
- **交互式查看**: 点击"查看详情"可跳转到对应的Goroutine调用链并自动定位到函数位置
- **性能优化**: 智能缓存父函数信息，避免重复请求

### 使用方法
1. 进入函数分析页面 (`/function-analysis`)
2. 在搜索框中输入要分析的函数名
3. 选择函数后，系统会自动显示该函数在Goroutine中的分布情况
4. 在"调用链路"列中查看完整的函数调用路径
5. 点击"查看详情"按钮可跳转到详细的调用链分析页面

### 技术实现
- 使用 `/api/runtime/function/info` 接口获取函数在指定Goroutine中的信息（包含完整的父函数信息）
- 通过深度排序构建完整的调用链路
- 支持异步加载和错误处理
- 优化的API调用，减少网络请求次数

## 开发环境

### 环境要求
- Node.js >= 14
- npm >= 6

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run serve
```

### 构建生产版本
```bash
npm run build
```

### 代码检查
```bash
npm run lint
```

## 项目结构

```
src/
├── components/
│   ├── runtime/
│   │   ├── components/
│   │   │   ├── FunctionAnalysis.vue    # 函数分析组件（包含调用链路功能）
│   │   │   ├── TraceDetailsNew.vue     # 调用链详情组件
│   │   │   └── ...
│   │   └── composables/
│   │       ├── useFunctionSearch.js    # 函数搜索逻辑
│   │       └── ...
│   └── ...
├── router/
│   └── index.js                        # 路由配置
└── ...
```

## API接口

### 函数分析相关接口
- `POST /api/runtime/functions/search` - 搜索函数
- `POST /api/runtime/gids/function` - 获取函数在Goroutine中的分布
- `POST /api/runtime/function/info` - 获取函数在指定Goroutine中的信息（包含父函数信息）
- `POST /api/runtime/function/stats` - 获取函数调用统计

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

