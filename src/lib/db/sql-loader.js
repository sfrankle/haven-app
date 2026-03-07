/**
 * Metro transformer for .sql files.
 * Wraps raw SQL text as a CommonJS string export so Metro can bundle it.
 * Registered in metro.config.js via transformer.babelTransformerPath.
 */
const upstreamTransformer = require('@expo/metro-config/babel-transformer');

module.exports.transform = async function (props) {
  if (props.filename.endsWith('.sql')) {
    return upstreamTransformer.transform({
      ...props,
      src: `module.exports = ${JSON.stringify(props.src)};`,
    });
  }
  return upstreamTransformer.transform(props);
};
