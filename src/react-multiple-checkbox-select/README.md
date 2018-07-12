
## 安装

```sh
npm install react-multiple-checkbox-select --save
```

### 图片
![](http://image.onfuns.com/blog/images/react-select-demo.png)

## API

### props

| name     | description    | type     | default      |
|----------|----------------|----------|--------------|
|className | 组件css类名 | String | '' |
|dropdownClassName | 下拉菜单css类名 | String | '' |
|labelPlaceholder | 显示框placeholder | String | 请选择选项 |
|inputPlaceholder | 搜索框placeholder | String | 请输入关键字 |
|noContentText | 无匹配内容时提示文字 | String | 暂无匹配项 |
|allText | 全部 | String | 全部 |
|data | 列表数据 | Array<{value,label}> | [] |
|value | 选中值 | Array<value> | [] |
|showFilterAll | 是否显示过滤下的全部选择框 | Boolean | false |
|onSubmit | 点击确定按钮事件 | Function(values) | |
