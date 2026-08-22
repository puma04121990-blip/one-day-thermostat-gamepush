// Design: Тихая технография — Phaser рисует материальный дом; React overlay не может менять simulation напрямую.
import Phaser from "phaser";
import { ThermostatSimulation } from "./ThermostatSimulation";
import { isSceneData, type SceneData } from "./SceneData";
import type { GameState } from "./types";

const HERO = "/manus-storage/thermostat-cutaway-hero_e2876f3d.png";

export class ThermostatScene extends Phaser.Scene {
  private simulation!: ThermostatSimulation;
  private onState!: (state: GameState) => void;
  private reducedMotion = false;
  private backdrop?: Phaser.GameObjects.Image;
  private ink?: Phaser.GameObjects.Graphics;
  private labelLayer?: Phaser.GameObjects.Container;
  private lastTick = -1;

  constructor() { super("thermostat"); }

  init(data?: SceneData) {
    if (!isSceneData(data)) {
      this.scene.stop();
      return;
    }
    this.simulation = data.simulation;
    this.onState = data.onState;
    this.reducedMotion = data.reducedMotion;
  }

  preload() { this.load.image("cutaway", HERO); }

  create() {
    if (!this.simulation || !this.onState) return;
    this.cameras.main.setBackgroundColor("#101A29");
    this.backdrop = this.add.image(0, 0, "cutaway").setOrigin(0.5).setAlpha(0.55);
    this.ink = this.add.graphics();
    this.labelLayer = this.add.container();
    this.scale.on("resize", this.layout, this);
    this.layout();
    this.draw(this.simulation.snapshot(), true);
  }

  update(_time: number, delta: number) {
    if (!this.simulation || !this.onState) return;
    this.simulation.advance(delta);
    const state = this.simulation.snapshot();
    if (state.tick !== this.lastTick) this.draw(state, false);
  }

  private layout() {
    const width = this.scale.width;
    const height = this.scale.height;
    this.backdrop?.setPosition(width * 0.56, height * 0.5).setDisplaySize(width * 1.15, height * 1.1);
  }

  private draw(state: GameState, force: boolean) {
    if (!force && state.tick === this.lastTick) return;
    this.lastTick = state.tick;
    this.ink?.clear();
    this.labelLayer?.removeAll(true);
    const g = this.ink;
    if (!g) return;
    const width = this.scale.width;
    const height = this.scale.height;
    const rooms = [
      { x: width * 0.42, y: height * 0.22, w: width * 0.18, h: height * 0.22, label: "ПОРОГ", active: state.chainIndex === 0 },
      { x: width * 0.63, y: height * 0.2, w: width * 0.21, h: height * 0.23, label: "КУХНЯ", active: state.chainIndex === 1 },
      { x: width * 0.54, y: height * 0.52, w: width * 0.25, h: height * 0.22, label: "ЗАПАДНАЯ СТЕНА", active: state.chainIndex === 2 }
    ];
    rooms.forEach((room) => {
      g.lineStyle(1, room.active ? 0xc8834a : 0x9ab0ba, room.active ? 0.86 : 0.26);
      g.fillStyle(room.active ? 0xc8834a : 0x142537, room.active ? 0.08 : 0.18);
      g.fillRoundedRect(room.x, room.y, room.w, room.h, 6);
      g.strokeRoundedRect(room.x, room.y, room.w, room.h, 6);
      const label = this.add.text(room.x + 12, room.y + 12, room.label, { fontFamily: "IBM Plex Mono", fontSize: "11px", color: room.active ? "#F4E6CA" : "#B8C7C7" });
      this.labelLayer?.add(label);
    });
    const routeColor = state.phase === "warning" ? 0xc8834a : 0xe5b76d;
    const routeAlpha = state.phase === "warning" ? 0.92 : 0.42;
    const points = [
      new Phaser.Math.Vector2(width * 0.36, height * 0.78),
      new Phaser.Math.Vector2(width * 0.50, height * 0.64),
      new Phaser.Math.Vector2(width * 0.58, height * 0.46),
      new Phaser.Math.Vector2(width * 0.74, height * 0.34)
    ];
    g.lineStyle(3, routeColor, routeAlpha);
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => g.lineTo(point.x, point.y));
    g.strokePath();
    points.forEach((point, index) => {
      g.fillStyle(index === state.chainIndex + 1 ? 0xf6d18b : routeColor, 0.94);
      g.fillRect(point.x - 4, point.y - 4, 8, 8);
    });
    const meterData = [state.metrics.air, state.metrics.moisture, state.metrics.surface, state.metrics.branch];
    meterData.forEach((value, index) => {
      const x = width * 0.05 + index * 26;
      const y = height * 0.9;
      g.fillStyle(0x0a111b, 0.78).fillRect(x, y, 16, 42);
      g.fillStyle(index === state.chainIndex ? 0xc8834a : 0x8fa9ae, 0.94).fillRect(x + 3, y + 36 - value * 32, 10, value * 32);
    });
    if (!this.reducedMotion && state.phase === "prologue") {
      const pulse = 0.12 + Math.sin(state.tick * 0.55) * 0.04;
      g.fillStyle(0xc8834a, pulse).fillCircle(width * 0.5, height * 0.64, 26);
    }
    this.onState(state);
  }

  shutdown() { this.scale.off("resize", this.layout, this); }
}
