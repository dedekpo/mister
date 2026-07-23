import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { world } from "./core/world";
import { setupKickoff } from "./core/actions/setup-match";

setupKickoff(world, "home");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
