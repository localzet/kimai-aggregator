/// <reference types="vite/client" />
/// <reference types="vite-plugin-comlink/client" />

declare const __DOMAIN_BACKEND__: string;
declare const __NODE_ENV__: string;

interface Window {
  electron?: {
    isElectron: boolean;
    notionApi?: {
      request: (
        url: string,
        options: RequestInit,
      ) => Promise<{
        ok: boolean;
        status: number;
        statusText: string;
        data: any;
        error?: string;
      }>;
    };
  };
}

interface ImportMetaEnv {
  readonly VITE_KIMAI_URL?: string;
  readonly DEV?: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}
