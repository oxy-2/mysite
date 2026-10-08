export const BASE_PATH = "/deltavr";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? `https://oxygenated.uk${BASE_PATH}`;

export const GITHUB_OWNER = "oxy-2";
export const GITHUB_REPO = "deltavr";

export const TEAM = [
  { handle: "oxy", label: "oxy", role: "me", url: "https://lapse.hackclub.com/user/@oxy" },
  {
    handle: "merekelene",
    label: "grand",
    role: "grand",
    url: "https://lapse.hackclub.com/user/@merekelene",
  },
  {
    handle: "monizjoao982",
    label: "joao",
    role: "joao",
    url: "https://lapse.hackclub.com/user/@monizjoao982",
  },
] as const;

export const BOARDS = [
  {
    id: "hmd",
    label: "hmd board",
    modelUrl: `${BASE_PATH}/models/hmd.glb`,
    schematicUrl: `${BASE_PATH}/schematics/hmd/deltavr hmd.svg`,
    desc: "headset main board. nrf52840 + lsm6dsv imu, debug header that exposes every pin.",
  },
  {
    id: "controller",
    label: "controller board",
    modelUrl: `${BASE_PATH}/models/controller.glb`,
    schematicUrl: `${BASE_PATH}/schematics/controller/deltavr_controller.svg`,
    desc: "left/right controller board. tmr stick thru ads1115 adc, hall triggers, radio module for off-board install, plus art on the silk cuz why not.",
  },
] as const;

export type BoardId = (typeof BOARDS)[number]["id"];
