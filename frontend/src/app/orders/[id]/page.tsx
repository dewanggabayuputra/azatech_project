import { Suspense } from "react";
import { AdminShell } from "@/components/admin-shell";
import { OrderDetailView } from "./order-detail-view";

export default function OrderDetailPage({ params }: PageProps<"/orders/[id]">) {
  return (
    <AdminShell title="Detail transaksi">
      <Suspense
        fallback={
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            Memuat transaksi...
          </section>
        }
      >
        <OrderDetails params={params} />
      </Suspense>
    </AdminShell>
  );
}

async function OrderDetails({
  params,
}: Pick<PageProps<"/orders/[id]">, "params">) {
  const { id } = await params;

  return <OrderDetailView id={id} />;
}
