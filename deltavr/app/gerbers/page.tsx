import { BASE_PATH } from "@/lib/site";

export const metadata = {
  title: "[deltavr.] gerbers",
};

const DOWNLOADS = [
  {
    name: "controller board gerbers (zip)",
    file: `${BASE_PATH}/downloads/Gerber_PCB.zip`,
    desc: "full gerber package for the controller pcb, ready to send straight to jlcpcb / pcbway / whoever.",
  },
  {
    name: "hmd board glb model",
    file: `${BASE_PATH}/models/hmd.glb`,
    desc: "binary gltf of the headset main board for cad / viewer use.",
  },
  {
    name: "controller board glb model",
    file: `${BASE_PATH}/models/controller.glb`,
    desc: "binary gltf of the controller board for cad / viewer use.",
  },
];

export default function GerbersPage() {
  return (
    <section className="section">
      <div className="container">
        <div className="section-label">
          <span className="red-dot" />
          <span>04 // fab files</span>
        </div>

        <div style={{ maxWidth: 640 }}>
          <h2 className="card-title" style={{ fontSize: 28, marginBottom: 12 }}>
            grab the boards.
          </h2>
          <p className="card-text" style={{ marginBottom: 28 }}>
            everything you need to get these printed. gerber zips go straight to
            your fab. source lives in the repo under{" "}
            <code>kicad/</code> and <code>kicad controllers/</code>.
          </p>

          {DOWNLOADS.map((d) => (
            <a
              key={d.file}
              href={d.file}
              download
              className="post-card"
              style={{ marginBottom: 12 }}
            >
              <div className="meta-row">
                <span className="badge">download</span>
                <span className="dim">↓</span>
              </div>
              <h3 className="post-title">{d.name}</h3>
              <p className="post-excerpt">{d.desc}</p>
            </a>
          ))}

          <div className="empty-note" style={{ marginTop: 24 }}>
            want to modify the design? full kicad projects + libraries are in
            the{" "}
            <a href="https://github.com/oxy-2/deltavr" target="_blank" rel="noopener">
              repo
            </a>
            . open in kicad 10 and go nuts.
          </div>
        </div>
      </div>
    </section>
  );
}
