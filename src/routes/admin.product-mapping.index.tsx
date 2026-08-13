import { createFileRoute, Link } from "@tanstack/react-router";
import { Ruler, ArrowRight, Truck } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";

export const Route = createFileRoute("/admin/product-mapping/")({
  component: ProductMappingDashboard,
});

type ModuleCard = {
  title: string;
  description: string;
  to: string;
  icon: typeof Ruler;
  enabled: boolean;
};

const MODULES: ModuleCard[] = [
  {
    title: "Sizing",
    description:
      "Create reusable garment size templates with custom measurements that can be attached to any product.",
    to: "/admin/product-mapping/sizing",
    icon: Ruler,
    enabled: true,
  },
  {
    title: "Delivery Charges",
    description:
      "Set the active delivery charge and customer-facing instruction shown on checkout.",
    to: "/admin/product-mapping/delivery-charges",
    icon: Truck,
    enabled: true,
  },
];

function ProductMappingDashboard() {
  return (
    <>
      <PageHeader
        title="Product Mapping"
        subtitle="Configure the reusable building blocks that power every product across the store."
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {MODULES.map((m) => {
          const Icon = m.icon;
          const Card = (
            <div
              className={[
                "group relative flex h-full flex-col rounded-2xl border border-[#E5E7EB] bg-white p-6 transition-all duration-[250ms]",
                m.enabled
                  ? "hover:border-[#CF0A0A]/30 hover:shadow-[0_12px_40px_-16px_rgba(207,10,10,0.25)] cursor-pointer"
                  : "opacity-60 cursor-not-allowed",
              ].join(" ")}
            >
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#CF0A0A]/8 text-[#CF0A0A] transition-colors group-hover:bg-[#CF0A0A] group-hover:text-white">
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <h3 className="text-[17px] font-semibold text-black">
                  {m.title}
                </h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-black/60">
                {m.description}
              </p>
              <div className="mt-6 flex items-center gap-1.5 text-sm font-medium text-[#CF0A0A]">
                {m.enabled ? "Open module" : "Coming soon"}
                {m.enabled && (
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                )}
              </div>
            </div>
          );
          return m.enabled ? (
            <Link key={m.title} to={m.to} className="block">
              {Card}
            </Link>
          ) : (
            <div key={m.title}>{Card}</div>
          );
        })}
      </div>
    </>
  );
}
