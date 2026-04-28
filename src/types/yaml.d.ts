/**
 * Type declarations for YAML file imports
 */
declare module '*.yaml' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any
  export default content
}

declare module '*.yml' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any
  export default content
}
