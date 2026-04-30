import { Outlet } from "react-router-dom";
import AppHeader from "./AppHeader";

export default function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border/60 py-6 mt-12">
        <div className="container text-center text-xs text-muted-foreground font-display tracking-widest">
          RIFT ORACLE · Powered by Data Dragon · Not affiliated with Riot Games
        </div>
      </footer>
    </div>
  );
}
