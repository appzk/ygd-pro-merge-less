module.exports = path => {
  const ygdProPath = path.match(/src(.*)/)[1].replace('.less', '');
  const arr = ygdProPath
    .split('/')
    .map(a => a.replace(/([A-Z])/g, '-$1'))
    .map(a => a.toLowerCase());
  return `ygd-pro${arr.join('-')}-`.replace(/--/g, '-');
};
