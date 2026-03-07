/** Type declaration for .sql files loaded via sql-loader.js Metro transformer. */
declare module '*.sql' {
  const content: string;
  export = content;
}
