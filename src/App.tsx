import { CameraControls } from "@react-three/drei";
import { WorldProvider } from "koota/react";
import Providers from "./app/providers";
import GameLoop from "./app/game-loop";
import { world } from "./core/world";
import FootballField from "./features/field/football-field";
import Goals from "./features/field/goals";
import PlayersView from "./features/players/players-view";
import BallsView from "./features/ball/ball-view";
import DebugGrid from "./features/debug/debug-grid";
import PlayerTargetsDebug from "./features/debug/player-target-debug";
import DebugPanel from "./features/debug/debug-panel";
import CoachPanel from "./features/debug/coach-panel";
import { GAME_CONFIG } from "./data/game-config";

function App() {
  return (
    <>
      <Providers>
        <CameraControls />
        <ambientLight intensity={GAME_CONFIG.LIGHTING.AMBIENT_INTENSITY} />
        <directionalLight
          position={GAME_CONFIG.LIGHTING.SUN_POSITION}
          intensity={GAME_CONFIG.LIGHTING.SUN_INTENSITY}
        />
        <GameLoop />
        <FootballField />
        <Goals />
        <PlayersView />
        <BallsView />
        <DebugGrid />
        <PlayerTargetsDebug />
      </Providers>
      <WorldProvider world={world}>
        <DebugPanel />
        <CoachPanel />
      </WorldProvider>
    </>
  );
}

export default App;
