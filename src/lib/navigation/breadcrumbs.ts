type BreadcrumbItem = {
    label: string;
    href?: string;
  };
  
  const segmentLabels: Record<string, string> = {
    analytics: "Analytics",
  
    executive: "Executive",
  
    operaciones: "Operaciones",
    customers: "Customers",
    factories: "Factories",
    seasons: "Seasons",
    logistica: "Logistics",
  
    quality: "Quality",
    models: "Models",
  
    desarrollo: "Desarrollo",
    quotes: "Quotes",
  
    clientes: "Clientes",
  
    import: "Import",
    alertas: "Alertas",
  };
  
  function formatSegment(segment: string): string {
    if (segmentLabels[segment]) {
      return segmentLabels[segment];
    }
  
    return segment
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
  
  export function buildBreadcrumbs(pathname: string): BreadcrumbItem[] {
    const segments = pathname
      .split("/")
      .filter(Boolean);
  
    const breadcrumbs: BreadcrumbItem[] = [
      {
        label: "Inicio",
        href: "/",
      },
    ];
  
    let currentPath = "";
  
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
  
      const isLast = index === segments.length - 1;
  
      breadcrumbs.push({
        label: formatSegment(segment),
        href: isLast ? undefined : currentPath,
      });
    });
  
    return breadcrumbs;
  }