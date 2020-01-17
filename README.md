# ygd-pro-merge-less

使用方式：

```js
const genCss = require('ygd-pro-merge-less');

genCss(
  'C:/GitHub/ygyg-design',
  [
    {
      theme: 'dark',
      fileName: './.temp/dark.css',
    },
    {
      fileName: './.temp/mingQing.css',
      modifyVars: {
        '@primary-color': '#13C2C2',
      },
    },
  ],
  {
    // 是否压缩css
    min: false,
    // css module
    isModule: false,
    // 忽略 antd 的依赖
    ignoreAntd: true,
    // 忽略 ygd 的依赖
    ignoreYgd: true,
    // 忽略 pro-layout
    ignoreProLayout: true,
    // 不使用缓存
    cache: false,
  },
);
```
