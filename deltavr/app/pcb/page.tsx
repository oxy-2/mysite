import PCBPageClient from "./PCBPageClient";

export const metadata = {
  title: "[deltavr.] pcb",
};

export default function PCBPage() {
  return (
    <section className="section">
      <div className="container">
        <PCBPageClient />
      </div>
    </section>
  );
}
