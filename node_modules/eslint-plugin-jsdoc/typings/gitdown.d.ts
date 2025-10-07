declare module 'gitdown' {
  interface Gitdown {
    setConfig: (info: {
      gitinfo: {
        defaultBranchName: string,
        gitPath: string
      }
    }) => void
    get: () => string
    registerHelper: (name: string, helper: {
      compile: () => string
      weight?: number
    }) => void
  }
  export function readFile(path: string): Gitdown
}
