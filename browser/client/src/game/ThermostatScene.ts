// Design: Тихая технография — Phaser рисует материальный дом; React overlay не может менять simulation напрямую.
import Phaser from "phaser";
import { ThermostatSimulation } from "./ThermostatSimulation";
import { isSceneData, type SceneData } from "./SceneData";
import type { GameState } from "./types";

const HERO = "/manus-storage/thermostat-cutaway-hero-1600_7b2b462c.webp";

export class ThermostatScene extends Phaser.Scene {
  private simulation!: ThermostatSimulation;
  private onState!: (state: GameState) => void;
  private onSceneReady!: () => void;
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
    this.onSceneReady = data.onSceneReady;
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
    this.onSceneReady();
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
    const sensorTint: Record<GameState["sensorLayer"], number> = { heat: 0xc8834a, air: 0x8fbec2, vibration: 0xe1bc7d, moisture: 0xb9d3cf, network: 0xd69a6b, surface: 0xe5b76d, memory: 0xc7bea0 };
    const activeTint = sensorTint[state.sensorLayer];
    const rooms = [
      { x: width * 0.42, y: height * 0.22, w: width * 0.18, h: height * 0.22, label: "ПОРОГ", active: state.chainIndex === 0 },
      { x: width * 0.63, y: height * 0.2, w: width * 0.21, h: height * 0.23, label: "КУХНЯ", active: state.chainIndex === 1 },
      { x: width * 0.54, y: height * 0.52, w: width * 0.25, h: height * 0.22, label: "ЗАПАДНАЯ СТЕНА", active: state.chainIndex === 2 }
    ];
    rooms.forEach((room) => {
      g.lineStyle(1, room.active ? activeTint : 0x9ab0ba, room.active ? 0.86 : 0.26);
      g.fillStyle(room.active ? activeTint : 0x142537, room.active ? 0.08 : 0.18);
      g.fillRoundedRect(room.x, room.y, room.w, room.h, 6);
      g.strokeRoundedRect(room.x, room.y, room.w, room.h, 6);
      const label = this.add.text(room.x + 12, room.y + 12, room.label, { fontFamily: "IBM Plex Mono", fontSize: "11px", color: room.active ? "#F4E6CA" : "#B8C7C7" });
      this.labelLayer?.add(label);
    });
    if (state.started && state.handsOn.step < 3) {
      const handStep = state.handsOn.step;
      const focus = handStep === 0
        ? { x: width * .46, y: height * .26, w: width * .13, h: height * .12, label: "01 · КОСНИСЬ РАМЫ" }
        : handStep === 1
          ? { x: width * .50, y: height * .58, w: width * .22, h: height * .08, label: "02 · УДЕРЖИВАЙ СВЯЗЬ" }
          : { x: width * .57, y: height * .55, w: width * .18, h: height * .16, label: "03 · КОСНИСЬ СТЕНЫ" };
      g.fillStyle(0xc8834a, .13).fillRoundedRect(focus.x, focus.y, focus.w, focus.h, 5);
      g.lineStyle(2, 0xe8bd72, .92).strokeRoundedRect(focus.x, focus.y, focus.w, focus.h, 5);
      const prompt = this.add.text(focus.x + focus.w / 2, focus.y - 12, focus.label, { fontFamily: "IBM Plex Mono", fontSize: "10px", color: "#F2D395", stroke: "#09121D", strokeThickness: 3 });
      prompt.setOrigin(.5);
      this.labelLayer?.add(prompt);
      if (handStep === 1) {
        g.lineStyle(3, 0xc8834a, .86).lineBetween(width * .46, height * .34, width * .62, height * .57);
        g.fillStyle(0xe8bd72, .92).fillCircle(width * .62, height * .57, 6);
      }
    }
    const diagnosticCopy = state.started && state.handsOn.step < 3
      ? `ТИХОЕ ОКНО · ${state.handsOn.step}/3`
      : `SENSOR / ${state.sensorLayer.toUpperCase()}  ·  ${state.diagnostic.status.toUpperCase()}`;
    const diagnosticLabel = this.add.text(width * 0.54, height * 0.12, diagnosticCopy, { fontFamily: "IBM Plex Mono", fontSize: "10px", color: "#E6C27C", stroke: "#09121D", strokeThickness: 3 });
    diagnosticLabel.setOrigin(.5);
    this.labelLayer?.add(diagnosticLabel);
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
    if (state.blackout.phase !== "inactive") {
      g.fillStyle(0x07101a, 0.56).fillRect(width * 0.31, height * 0.14, width * 0.57, height * 0.66);
      g.lineStyle(1, 0x6f7d80, 0.28);
      for (let row = 0; row < 6; row += 1) g.lineBetween(width * 0.33, height * (.2 + row * .1), width * .86, height * (.2 + row * .1));
      for (let column = 0; column < 7; column += 1) g.lineBetween(width * (.34 + column * .075), height * .2, width * (.34 + column * .075), height * .7);
      const coreX = width * .54;
      const coreY = height * .54;
      for (let cell = 0; cell < 5; cell += 1) {
        const angle = -Math.PI / 2 + cell * (Math.PI / 4);
        const x = coreX + Math.cos(angle) * 32;
        const y = coreY + Math.sin(angle) * 32;
        g.fillStyle(cell < state.blackout.reserveCells ? 0xc8834a : 0x4b5960, .96).fillRect(x - 4, y - 8, 8, 16);
      }
      g.fillStyle(0xd7b172, .82).fillCircle(coreX, coreY, 8);
      if (state.blackout.focusedSensor) {
        const focusX = state.blackout.focusedSensor === "surface" ? width * .63 : state.blackout.focusedSensor === "vibration" ? width * .47 : width * .72;
        const focusY = state.blackout.focusedSensor === "surface" ? height * .58 : state.blackout.focusedSensor === "vibration" ? height * .4 : height * .32;
        g.lineStyle(2, 0x8fbec2, .82).lineBetween(coreX, coreY, focusX, focusY);
      }
      const blackoutLabel = this.add.text(width * .58, height * .18, `RESERVE MODE / ${state.blackout.phase.toUpperCase().replace("_", " ")} · B:${state.blackout.reserveCells}`, { fontFamily: "IBM Plex Mono", fontSize: "10px", color: "#E6C27C", stroke: "#07101A", strokeThickness: 3 });
      blackoutLabel.setOrigin(.5);
      this.labelLayer?.add(blackoutLabel);
    }
    if (state.event.state === "foreshadow" || state.event.state === "warning" || state.event.state === "active") {
      const alpha = state.event.state === "foreshadow" ? 0.44 : 0.78;
      g.lineStyle(2, 0xe1a657, alpha);
      g.strokeRoundedRect(width * 0.38, height * 0.18, width * 0.25, height * 0.3, 6);
      for (let line = 0; line < 5; line += 1) g.lineBetween(width * 0.39 + line * 18, height * 0.49, width * 0.43 + line * 18, height * 0.46);
      const eventLabel = this.add.text(width * 0.51, height * 0.17, state.event.state === "warning" ? "ВЕТВЬ 26 / SAFE ISOLATE" : "ВЕТВЬ 26 / ПРЕДВЕСТНИК", { fontFamily: "IBM Plex Mono", fontSize: "10px", color: "#F0C47A", stroke: "#09121D", strokeThickness: 3 });
      eventLabel.setOrigin(.5);
      this.labelLayer?.add(eventLabel);
    }
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
    if (state.tutorial.current !== "complete") {
      const tutorialLabel = this.add.text(width * 0.54, height * 0.83, `УЧИТЬСЯ: ${state.tutorial.current.replace("_", " ").toUpperCase()}`, { fontFamily: "IBM Plex Mono", fontSize: "9px", color: "#A9CAC0", stroke: "#09121D", strokeThickness: 3 });
      tutorialLabel.setOrigin(.5);
      this.labelLayer?.add(tutorialLabel);
    }
    this.onState(state);
  }

  shutdown() { this.scale.off("resize", this.layout, this); }
}
