/**
 * Metro transformer for .sql files.
 * Wraps raw SQL text as a CommonJS string export so Metro can bundle it.
 * Registered in metro.config.js via transformer.babelTransformerPath.
 */
// @expo/metro-config is nested inside the expo package — resolve from there.
const upstreamTransformer = require(require.resolve('@expo/metro-config/babel-transformer', {
  paths: [require.resolve('expo/package.json'), __dirname],
}));

module.exports.transform = async function (props) {
  if (props.filename.endsWith('.sql')) {
    return upstreamTransformer.transform({
      ...props,
      src: `module.exports = ${JSON.stringify(props.src)};`,
    });
  }
  return upstreamTransformer.transform(props);
};
