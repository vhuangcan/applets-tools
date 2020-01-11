# 使用教程
![img](/src/assets/1.gif)

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
 npm install 安装完依赖后运行项目会出现需要安装ws的提示
 安装ws后去node_modules找到puppeteer-core里的package.json。
 修改配置里ws的路径为./node_modules/ws/index。
 不然puppeteer无法正常使用。
```

### 注意事项
```
在使用小程序代码上传功能的时候，一定要先打开微信开发工具并在设置里开启安全端口。
```

![img](/src/assets/2.png)

```
windows平台使用代码上传功能需要自己去找到微信开发者工具的cli.bat路径地址。
右键属性打开文件夹地址就可以看到这个cli文件。注意：填写完地址加上双引号！！
```

![img](/src/assets/3.png)

### 项目所用技术的开发文档
[Vue Configuration Reference](https://cli.vuejs.org/config/).

[Puppeteer Configuration Reference](https://pptr.dev/).

[Element Configuration Reference](https://pptr.dev/).
