# 下载

### 登录

因为从私人仓库中下载YunBin-ui，所以要先登录到那个私人仓库。

使用如下命令登录。

```bash
npm login --registry=http://192.168.0.75:8081/repository/npm-group/
```

执行上述命令之后就会提示输入用户名，密码和邮箱。

```bash
Username：admin

Password：admin123

Email：xxx@xxx
```

### 安装

登录成功之后，就可以进行安装yunbin-ui包。注意对应好版本。

```
npm install yunbin-ui@1.0.0
```

### 快速开始

```javascript
import Vue from 'vue'
import Yunbin from 'yunbin-ui'

Vue.use(Yunbin)

// or
import {
  YbLoading,
  YbParkScene
  // ...
} from 'yunbin-ui'

Vue.component(YbLoading.name, YbLoading)
Vue.component(YbParkScene.name, YbParkScene)
```

# 上传

### 登录

同样要先登录，不同的是下载的时候登录的是仓库组，而上传不能上传到仓库组中，要上传到指定仓库中。

```bash
npm login --registry=http://192.168.0.75:8081/repository/npm-hosted/
```

执行上述命令之后就会提示输入用户名，密码和邮箱。

```bash
Username：admin

Password：admin123

Email：xxx@xxx
```

### 配置package.json

```bash
"name": "yunbin-ui",

 "version": "1.0.0",

"main": "index.js",
```

name控制包名。

version控制版本。

main控制入口文件。

### 上传

然后执行如下代码即可将对应的包上传到npm-hosted库中。

```bash
npm publish --registry=http://192.168.0.75:8081/repository/npm-hosted/
```

