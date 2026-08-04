// Metro is configured to treat .sql as a source extension (see metro.config.js);
// drizzle's migration bundle imports the files as strings.
declare module '*.sql' {
  const content: string;
  export default content;
}
