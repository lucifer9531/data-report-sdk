# 数据上报 javascript sdk

数据上报 JS SDK 用于收集上报埋点数据信息

# 如何使用

yarn add data-report-sdk

import DA from data-report-sdk

```
const da = DA.init({
  source:'test'
})
```

VUE 插件支持

```
Vue.use(DA,{
  router:{
    event:'pageView'
  }
})

...

new Vue({
  router:router,
  sa:da,
  ...
})

```

## api 及参数详情见 https://doc.weixin.qq.com/txdoc/word?scode=ACUArAcBAAk1Lr13dpAKQAewYKAD4&docid=w2_AKQAewYKAD4Y2QBVUl0T8u8D7jeUR&type=0
