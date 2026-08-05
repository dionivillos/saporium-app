module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    // Drizzle's migration bundle imports .sql files; this inlines them as
    // strings instead of letting Metro parse them as JavaScript.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
