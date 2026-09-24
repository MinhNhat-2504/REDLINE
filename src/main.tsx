
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClientProvider } from "@solana/react";
import App from "./app/App";
import { Toaster } from "./app/components/ui/sonner";
import { solanaClient } from "./app/solana/client";
import { LanguageProvider } from "./app/i18n/LanguageContext";
import "./styles/frontend.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LanguageProvider>
      <ClientProvider client={solanaClient}>
        <App />
        {/* Was already a dependency and a wrapper component, both unused —
            wired up now so wallet/grant/copy actions get real feedback
            instead of only an inline line of text nobody's eyes are on. */}
        <Toaster theme="dark" position="top-right" richColors closeButton />
      </ClientProvider>
    </LanguageProvider>
  </StrictMode>,
);
