export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="border-b border-[#E5E7EB] pb-5 sm:pb-6 mb-6 sm:mb-8">
      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-black tracking-tight break-words">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-2 text-[13px] sm:text-[15px] text-black/55 leading-relaxed max-w-2xl">
          {subtitle}
        </p>
      )}

    </header>
  );
}
