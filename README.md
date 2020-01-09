# applets-tools

### 项目安装
```
npm install
```

### 项目开发热重载
```
npm run electron:serve
```

### 项目打包
```
npm run electron:build
```

### 项目功能
```
1、多小程序代码自动上传
2、自动化提交代码审核
3、审核通过代码提交上线
```

### 遇到的问题
```
 安装使用npm install 安装完依赖后运行项目会出现需要安装ws的提示
 安装ws后去node_modules找到puppeteer-core里的package.json。
 修改配置里ws的路径为./node_modules/ws/index。
 不然puppeteer无法正常使用。
```

### 项目所用技术的开发文档
[Vue Configuration Reference](https://cli.vuejs.org/config/).

[Puppeteer Configuration Reference](https://pptr.dev/).

[ElementUI Configuration Reference](https://pptr.dev/).
