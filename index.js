/** @format */

const fs = require('fs');
const path = require('path');
const less = require('less');
const hash = require('hash.js');
const rimraf = require('rimraf');
const uglifycss = require('uglifycss');

const { winPath } = require('umi-utils');
const darkTheme = require('@ant-design/dark-theme');
const loopAllLess = require('./loopAllLess');
const genModuleLess = require('./genModuleLess');
const getVariable = require('./getVariable');

const genHashCode = content =>
  hash
    .sha256()
    .update(content)
    .digest('hex');

const tempPath = winPath(path.join(__dirname, './.temp/'));

const loadYgd = async ignoreYgd => {
  try {
    if (!ignoreYgd) {
      const antdPath = require.resolve('ygd');
      if (fs.existsSync(antdPath)) {
        await loopAllLess(path.resolve(path.join(antdPath, '../../es/')), []).then(content => {
          fs.writeFileSync(
            path.join(tempPath, './ygd.less'),
            `@import '../color/bezierEasing';
      @import '../color/colorPalette';
      @import "../color/tinyColor";
      ${content}
            `,
          );
        });
        return true;
      }
    }
    // eslint-disable-next-line no-empty
  } catch (error) {}

  fs.writeFileSync(
    path.join(tempPath, './ygd.less'),
    `@import '../color/bezierEasing';
@import '../color/colorPalette';
@import "../color/tinyColor";
    `,
  );
  return false;
};

const loadYgdProLayout = async ignoreProLayout => {
  try {
    if (!ignoreProLayout) {
      const LayoutPath = require.resolve('@ant-design/pro-layout');
      if (fs.existsSync(LayoutPath)) {
        await loopAllLess(path.resolve(path.join(LayoutPath, '../../es/')), []).then(content => {
          fs.writeFileSync(
            path.join(tempPath, '/layout.less'),
            `@import './ygd';
    ${content}
        `,
          );
        });
        return true;
      }
    }
    // eslint-disable-next-line no-empty
  } catch (error) {}

  fs.writeFileSync(path.join(tempPath, '/layout.less'), "@import './ygd';");
  return false;
};

const getModifyVars = (theme = 'light', modifyVars, disableExtendsDark) => {
  try {
    // console.log(theme);
    if (theme === 'dark') {
      return {
        ...(disableExtendsDark ? {} : darkTheme.default),
        ...modifyVars,
      };
    }
    // console.log({ ...modifyVars });
    return { ...modifyVars };
  } catch (error) {
    throw error;
  }
};

const getOldFile = filePath => {
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath);
  }
  return false;
};

let isEqual = false;

const genProjectLess = (filePath, { isModule, loadAny, cache, ignoreYgd, ignoreProLayout }) =>
  genModuleLess(filePath, isModule).then(async content => {
    if (cache === false) {
      rimraf.sync(tempPath);
    }
    if (!fs.existsSync(tempPath)) {
      fs.mkdirSync(tempPath);
    }

    const tempFilePath = winPath(path.join(tempPath, 'temp.less'));
    console.log('tempFilePath=', tempFilePath);
    // 获取新旧文件的 hash
    const newFileHash = genHashCode(content);

    const oldFileHash = genHashCode(getOldFile(tempFilePath));
    if (newFileHash === oldFileHash) {
      isEqual = true;
      // 无需重复生成
      return true;
    }

    fs.writeFileSync(tempFilePath, content);

    try {
      if (loadAny) {
        fs.writeFileSync(
          winPath(path.join(tempPath, 'pro.less')),
          `@import './layout';
           ${content}`,
        );
      } else {
        const lessContent = await getVariable(
          tempFilePath,
          fs.readFileSync(tempFilePath),
          loadAny,
        ).then(result => result.content.toString());

        fs.writeFileSync(
          winPath(path.join(tempPath, 'pro.less')),
          `@import './layout';
           ${lessContent}`,
        );
      }
    } catch (error) {
      console.log(error.name, error.file, `line: ${error.line}`);
    }

    await loadYgd(ignoreYgd);
    await loadYgdProLayout(ignoreProLayout);
    return true;
  });

const modifyVarsArrayPath = path.join(tempPath, 'modifyVarsArray.json');

const modifyVarsIsEqual = (modifyVarsArray = '') => {
  const modifyVarsArrayString = JSON.stringify(modifyVarsArray);

  const old = getOldFile(modifyVarsArrayPath);
  if (old && genHashCode(old) === genHashCode(modifyVarsArrayString) && isEqual) {
    console.log('📸  less and modifyVarsArray is equal!');
    return true;
  }

  return false;
};

const renderLess = (theme, modifyVars, { min = true, disableExtendsDark = false }) => {
  const proLess = winPath(path.join(tempPath, './pro.less'));
  if (!fs.existsSync(proLess)) {
    return '';
  }
  return (
    less
      .render(fs.readFileSync(proLess, 'utf-8'), {
        modifyVars: getModifyVars(theme, modifyVars, disableExtendsDark),
        javascriptEnabled: true,
        filename: path.resolve(proLess),
      })
      // 如果需要压缩，再打开压缩功能默认打开
      .then(out => (min ? uglifycss.processString(out.css) : out.css))
      .catch(e => {
        console.log(e);
      })
  );
};

const build = async (
  cwd,
  modifyVarsArray,
  propsOption = { isModule: true, loadAny: false, cache: true },
) => {
  console.log('🔩 less render start!');
  console.log('🔩 less modifyVars!', modifyVarsArray);
  isEqual = false;
  const defaultOption = { isModule: true, cache: true };
  const option = {
    ...defaultOption,
    ...propsOption,
  };
  try {
    await genProjectLess(cwd, option);
    if (modifyVarsIsEqual(modifyVarsArray) && isEqual) {
      return;
    }
    const loop = async index => {
      if (!modifyVarsArray[index]) {
        return false;
      }
      const { theme, modifyVars, fileName, disableExtendsDark } = modifyVarsArray[index];
      try {
        const css = await renderLess(theme, modifyVars, {
          ...option,
          disableExtendsDark,
        });
        fs.writeFileSync(fileName, css);
        // 写入缓存的变量值设置
        fs.writeFileSync(modifyVarsArrayPath, JSON.stringify(modifyVars));
      } catch (error) {
        console.log(error);
      }
      if (index < modifyVarsArray.length) {
        await loop(index + 1);
        return true;
      }
      return true;
    };
    // 写入缓存的变量值设置
    fs.writeFileSync(modifyVarsArrayPath, JSON.stringify(modifyVarsArray));
    await loop(0);
    console.log('🎩 less render end!');
  } catch (error) {
    console.log(error);
  }
};

module.exports = build;
