module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "node": true
    },
    "extends": ["react-app", "plugin:react/recommended", "prettier"],
    "parserOptions": {
        "ecmaFeatures": {
            "jsx": true
        },
        "ecmaVersion": 2015,
        "sourceType": "module"
    },
    "plugins": ["jsx-a11y", "react", "prettier"],
    "rules": {
      "prettier/prettier": "error"
    }
};
