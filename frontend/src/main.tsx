import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChildProvider } from "./context/ChildContext";
import { ToastProvider } from "./context/ToastContext";
import { TutorialProvider } from "./context/TutorialContext";
import App from "./App";
import "./i18n";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ChildProvider>
          <ToastProvider>
            <TutorialProvider>
              <App />
            </TutorialProvider>
          </ToastProvider>
        </ChildProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
