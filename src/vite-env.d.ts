/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SOLANA_RPC_URL?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_REDLINE_PROGRAM_ID?: string;
  readonly VITE_DEMO_USDC_MINT?: string;
  readonly VITE_DEMO_OPS_DESTINATION?: string;
  readonly VITE_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
