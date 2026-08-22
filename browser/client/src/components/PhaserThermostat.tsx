// Design: Тихая технография — canvas является наблюдаемым полем дома, а controls остаются HTML-доступными.
import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { ThermostatScene } from "@/game/ThermostatScene";
import { ThermostatSimulation } from "@/game/ThermostatSimulation";
import type { GameState } from "@/game/types";

type Props = { simulation: ThermostatSimulation; onState: (state: GameState) => void; reducedMotion: boolean };

export function PhaserThermostat({ simulation, onState, reducedMotion }: Props) {
  const host = useRef<HTMLDivElement | null>(null);
  const game = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!host.current || game.current) return;
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
          instance.scene.start("thermostat", { simulation, onState, reducedMotion });
        }
      }
    });
    return () => { game.current?.destroy(true); game.current = null; };
  }, [simulation, onState, reducedMotion]);

  return <div ref={host} className="absolute inset-0" aria-hidden="true" />;
}
