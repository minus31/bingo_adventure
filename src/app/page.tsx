"use client";

import { GameScreen } from "@/components/game-screen";
import { LoginScreen } from "@/components/login-screen";
import { useGame } from "@/components/game-provider";

export default function Home() {
  const { ready, currentTeam } = useGame();
  if (!ready) return <div className="min-h-dvh bg-[#f7f5f0]" />;
  return currentTeam ? <GameScreen /> : <LoginScreen />;
}
