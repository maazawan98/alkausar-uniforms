import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ShoppingBag,
  Users2,
  Sparkles,
  Building2,
  ArrowRight,
  School as SchoolIcon,
  ArrowLeft,
  CalendarDays,
} from "lucide-react";

import {
  getSchool,
  listCategories,
  listClasses,
  listCampuses,
} from "@/lib/school-uniform.functions";

export const Route = createFileRoute("/admin/school-uniform/$slug/")({
  loader: async ({ params }) => {
    const school = await getSchool({ data: { slug: params.slug } });
    return { school };
  },
  component: SchoolDetail,
});

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function SchoolDetail() {
  const { school } = Route.useLoaderData();
  const catsFn = useServerFn(listCategories);
  const classesFn = useServerFn(listClasses);
  const campusesFn = useServerFn(listCampuses);

  const boysQ = useQuery({
    queryKey: ["categories", school?.id, "boys"],
    queryFn: () => catsFn({ data: { schoolId: school!.id, collection: "boys" } }),
    enabled: !!school,
  });
  const girlsQ = useQuery({
    queryKey: ["categories", school?.id, "girls"],
    queryFn: () => catsFn({ data: { schoolId: school!.id, collection: "girls" } }),
    enabled: !!school,
  });
  const classesQ = useQuery({
    queryKey: ["classes", school?.id],
    queryFn: () => classesFn({ data: { schoolId: school!.id } }),
    enabled: !!school,
  });
  const campusesQ = useQuery({
    queryKey: ["campuses", school?.id],
    queryFn: () => campusesFn({ data: { schoolId: school!.id } }),
    enabled: !!school,
  });

  if (!school) return null;

  const boysCount = boysQ.data?.length ?? 0;
  const girlsCount = girlsQ.data?.length ?? 0;
  const classesCount = classesQ.data?.length ?? 0;
  const campusesCount = campusesQ.data?.length ?? 0;

  const stats = [
    { label: "Boys", value: boysCount, hint: "Categories", loading: boysQ.isLoading },
    { label: "Girls", value: girlsCount, hint: "Categories", loading: girlsQ.isLoading },
    {
      label: "Categories",
      value: boysCount + girlsCount,
      hint: "Total",
      loading: boysQ.isLoading || girlsQ.isLoading,
    },
    { label: "Classes", value: classesCount, hint: "Configured", loading: classesQ.isLoading },
    { label: "Campuses", value: campusesCount, hint: "Locations", loading: campusesQ.isLoading },
  ];

  const modules = [
    {
      to: "/admin/school-uniform/$slug/products",
      title: "View All Products",
      description: "Browse every product created for this school.",
      icon: ShoppingBag,
      stat: `${boysCount + girlsCount} categories`,
      tint: "bg-[#F3F4F6]",
      iconTint: "bg-white text-black",
    },
    {
      to: "/admin/school-uniform/$slug/boys",
      title: "Boys Collection",
      description: "Manage boys categories and products.",
      icon: Users2,
      stat: `${boysCount} categor${boysCount === 1 ? "y" : "ies"}`,
      tint: "bg-[#EEF4FB]",
      iconTint: "bg-white text-[#1E40AF]",
    },
    {
      to: "/admin/school-uniform/$slug/girls",
      title: "Girls Collection",
      description: "Manage girls categories and products.",
      icon: Sparkles,
      stat: `${girlsCount} categor${girlsCount === 1 ? "y" : "ies"}`,
      tint: "bg-[#FBEEF3]",
      iconTint: "bg-white text-[#BE185D]",
    },
    {
      to: "/admin/school-uniform/$slug/structure",
      title: "School Structure",
      description: "Manage classes and campuses.",
      icon: Building2,
      stat: `${classesCount} classes · ${campusesCount} campuses`,
      tint: "bg-[#FCF3EA]",
      iconTint: "bg-white text-[#DC5F00]",
    },
  ] as const;



  return (
    <div className="mx-auto max-w-[1600px] w-[calc(100%-48px)] my-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[13px] text-[#6B7280] mb-4">
        <Link
          to="/admin/school-uniform"
          className="inline-flex items-center gap-1.5 hover:text-black transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Schools
        </Link>
        <span className="text-[#E5E7EB]">/</span>
        <span className="text-black font-medium truncate">{school.name}</span>
      </nav>

      {/* Hero Header */}
      <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 md:p-7 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(16,24,40,0.08)] mb-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 md:gap-6">
          <div className="flex min-w-0 items-start gap-5">
            <div className="h-[120px] w-[120px] shrink-0 rounded-2xl bg-white border border-[#E5E7EB] grid place-items-center overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-6px_rgba(16,24,40,0.08)]">
              {school.logoUrl ? (
                <img
                  src={school.logoUrl}
                  alt={school.name}
                  className="max-w-full max-h-full object-contain p-2"
                />
              ) : (
                <SchoolIcon className="h-10 w-10 text-black/25" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-[28px] md:text-[34px] leading-tight font-bold text-black tracking-tight truncate">
                {school.name}
              </h1>
              <p className="mt-1 text-[13px] text-[#6B7280] font-mono">/{school.slug}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={[
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold",
                    school.is_active
                      ? "bg-[#22C55E]/10 text-[#15803D]"
                      : "bg-black/5 text-black/50",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "h-1.5 w-1.5 rounded-full",
                      school.is_active ? "bg-[#22C55E]" : "bg-black/30",
                    ].join(" ")}
                  />
                  {school.is_active ? "Active" : "Inactive"}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#F8F9FB] text-[#6B7280] border border-[#E5E7EB]">
                  <CalendarDays className="h-3 w-3" />
                  Created {formatDate(school.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {stats.map((s) => (
          <div
            key={s.label}
            className="group rounded-2xl border border-[#E5E7EB] bg-white p-4 hover:border-black/10 hover:shadow-[0_4px_16px_-8px_rgba(16,24,40,0.12)] transition-all"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
              {s.label}
            </p>
            <p className="mt-2 text-[26px] font-bold text-black leading-none tabular-nums">
              {s.loading ? (
                <span className="inline-block h-6 w-10 rounded bg-[#F3F4F6] animate-pulse" />
              ) : (
                s.value
              )}
            </p>
            <p className="mt-1.5 text-[11px] text-[#9CA3AF]">{s.hint}</p>
          </div>
        ))}
      </section>

      {/* Management Modules */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-[20px] font-semibold text-black tracking-tight">
              Management Modules
            </h2>
            <p className="text-[13px] text-[#6B7280] mt-0.5">
              Manage products, collections, and structure for this school.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.title}
                to={m.to as any}
                params={{ slug: school.slug } as any}
                className={[
                  "group relative rounded-2xl border border-[#E5E7EB] px-6 py-5 min-h-[168px]",
                  m.tint,
                  "hover:border-[#CF0A0A] hover:-translate-y-1 hover:shadow-[0_16px_40px_-16px_rgba(207,10,10,0.25)]",
                  "transition-all duration-[220ms] ease-out flex flex-col",
                ].join(" ")}
              >
                <div className="flex items-start justify-between">
                  <div
                    className={[
                      "h-12 w-12 rounded-xl grid place-items-center border border-[#E5E7EB] shadow-sm",
                      m.iconTint,
                      "group-hover:scale-105 transition-transform duration-[220ms]",
                    ].join(" ")}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <ArrowRight className="h-4 w-4 text-black/30 group-hover:text-[#CF0A0A] group-hover:translate-x-1 transition-all duration-[220ms]" />
                </div>
                <div className="mt-auto pt-4">
                  <h3 className="text-[18px] font-semibold text-black tracking-tight">
                    {m.title}
                  </h3>
                  <p className="mt-1 text-[13px] text-[#6B7280] leading-relaxed">
                    {m.description}
                  </p>
                  <p className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-black/70">
                    <span className="h-1 w-1 rounded-full bg-[#CF0A0A]" />
                    {m.stat}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

