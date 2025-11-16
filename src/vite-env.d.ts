/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KIMAI_URL?: string
  readonly DEV?: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}

