import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { CompareSlider } from "@/components/app/CompareSlider";
import { getPublicComparison } from "@/lib/shares";
import logo from "@/assets/tooth-boutique-logo.png";

export const Route = createFileRoute("/ver/$shareId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Antes / Después — The Tooth Boutique" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SharedComparisonPage,
});

function SharedComparisonPage() {
  const { shareId } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["comparison-share", shareId],
    queryFn: () => getPublicComparison(shareId),
    retry: false,
  });

  return (
    <main className="flex min-h-screen flex-col items-center surface-gradient px-4 py-10">
      <img src={logo} alt="The Tooth Boutique" className="h-14 w-auto" />

      <div className="mt-8 w-full max-w-2xl">
        {isLoading ? (
          <Skeleton className="h-96 w-full rounded-2xl" />
        ) : error || !data ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
            <p className="font-medium">Este enlace ya no está disponible</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Puede haber expirado o haber sido revocado. Pide un nuevo enlace a tu clínica.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-center text-lg font-semibold tracking-tight">{data.patientName}</h1>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              Desliza para comparar el antes y el después.
            </p>
            <div className="mt-6">
              <CompareSlider
                beforeUrl={data.beforeUrl}
                afterUrl={data.afterUrl}
                beforeLabel={data.beforeLabel}
                afterLabel={data.afterLabel}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
