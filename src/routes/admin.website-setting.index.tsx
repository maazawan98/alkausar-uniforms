import { createFileRoute, Link } from "@tanstack/react-router";
import { Landmark, ArrowRight, Building2, Megaphone } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";

export const Route = createFileRoute("/admin/website-setting/")({
  component: WebsiteSettingDashboard,
});

type ModuleCard = {
  title: string;
  description: string;
  to: string;
  icon: typeof Landmark;
  enabled: boolean;
};

const MODULES: ModuleCard[] = [
  {
    title: "Business Information",
    description:
      "Manage business name, contact details, social links, working hours and notes shown across the website footer and contact page.",
    to: "/admin/website-setting/business-information",
    icon: Building2,
    enabled: true,
  },
  {
    title: "Bank Accounts",
    description:
      "Manage the bank accounts shown to customers on the checkout page when they choose online payment.",
    to: "/admin/website-setting/bank-accounts",
    icon: Landmark,
    enabled: true,
  },
  {
    title: "Homepage Advertisement",
    description:
      "Upload and manage promotional advertisements that appear as a popup on the home page. Only active ads are shown, sorted by display priority.",
    to: "/admin/website-setting/advertisements",
    icon: Megaphone,
    enabled: true,
  },
];

function WebsiteSettingDashboard() {
  return (
    <>
      <PageHeader
        title="Website Setting"
        subtitle="Configure customer-facing website details such as bank accounts, policies and more."
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
                <h3 className="text-[17px] font-semibold text-black">{m.title}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-black/60">{m.description}</p>
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
