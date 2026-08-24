export const BASE_PATH = "/deltavr";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? `https://oxygenated.uk${BASE_PATH}`;

export const GITHUB_OWNER = "oxy-2";
export const GITHUB_REPO = "deltavr";

export const BOARDS = [
  {
    id: "hmd",
    label: "hmd board",
    modelUrl: `${BASE_PATH}/models/hmd.glb`,
    schematicUrl: `${BASE_PATH}/schematics/hmd/deltavr hmd.svg`,
    desc: "headset main board — nrf52840 + lsm6dsv imu, debug header exposing every pin.",
  },
  {
    id: "controller",
    label: "controller board",
    modelUrl: `${BASE_PATH}/models/controller.glb`,
    schematicUrl: `${BASE_PATH}/schematics/controller/deltavr_controller.svg`,
    desc: "left/right controller board — tmr stick via ads1115 adc, hall triggers, radio module for off-board install, art on the silk.",
  },
] as const;

export type BoardId = (typeof BOARDS)[number]["id"];
