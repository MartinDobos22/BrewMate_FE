const path = require('path');
const dotenv = require('dotenv');

let hasLoadedEnv = false;

const loadEnvironment = () => {
  if (hasLoadedEnv) {
    return;
  }

  const envPath = path.resolve(process.cwd(), '.env');
  dotenv.config({ path: envPath });
  hasLoadedEnv = true;
};

module.exports = function inlineEnvVariables({ types: t }) {
  loadEnvironment();

  return {
    name: 'inline-dotenv-variables',
    visitor: {
      MemberExpression(path) {
        const { node } = path;

        if (
          !t.isMemberExpression(node.object) ||
          !t.isIdentifier(node.object.object, { name: 'process' }) ||
          !t.isIdentifier(node.object.property, { name: 'env' })
        ) {
          return;
        }

        const key =
          t.isIdentifier(node.property) && !node.computed
            ? node.property.name
            : t.isStringLiteral(node.property)
              ? node.property.value
              : undefined;

        if (!key) {
          return;
        }

        const value = process.env[key];

        if (value === undefined) {
          path.replaceWith(t.identifier('undefined'));
        } else {
          path.replaceWith(t.stringLiteral(value));
        }
      },
    },
  };
};
