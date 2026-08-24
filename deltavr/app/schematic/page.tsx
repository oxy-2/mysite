import SchematicPageClient from "./SchematicPageClient";

export const metadata = {
  title: "[deltavr.] — schematics",
};

export default function SchematicPage() {
  return (
    <section className="section">
      <div className="container">
        <SchematicPageClient />
      </div>
    </section>
  );
}
