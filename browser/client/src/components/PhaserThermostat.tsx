// Design: Тихая технография — canvas является наблюдаемым полем дома, а controls остаются HTML-доступными.
import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { ThermostatScene } from "@/game/ThermostatScene";
import { ThermostatSimulation } from "@/game/ThermostatSimulation";
import type { GameState } from "@/game/types";

type Props = { simulation: ThermostatSimulation; onState: (state: GameState) => void; reducedMotion: boolean; onBoot: () => void; onReady: () => void };

export function PhaserThermostat({ simulation, onState, reducedMotion, onBoot, onReady }: Props) {
  const host = useRef<HTMLDivElement | null>(null);
  const game = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!host.current || game.current) return;
    onBoot();
    game.current = new Phaser.Game({
      type: Phaser.CANVAS,
      parent: host.current,
      transparent: true,
      scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
      scene: [],
      render: { antialias: true, pixelArt: false },
      callbacks: {
        postBoot: (instance) => {
          instance.scene.add("thermostat", ThermostatScene, false);
          instance.scene.start("thermostat", { simulation, onState, reducedMotion, onSceneReady: onReady });
        }
      }
    });
    return () => { game.current?.destroy(true); game.current = null; };
  }, [simulation, onState, reducedMotion, onBoot, onReady]);

  return <div ref={host} className="absolute inset-0" aria-hidden="true" />;
}
