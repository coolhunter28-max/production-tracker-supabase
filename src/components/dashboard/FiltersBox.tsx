

type Filters = {
  customer: string;
  supplier: string;
  factory: string;
  season: string;
  style: string;
  estado: string;
  search: string;
};

type Props = {
  customers: string[];
  suppliers: string[];
  factories: string[];
  seasons: string[];
  styles: string[];
  estados: string[];
  filters: Filters;
  onChange: (next: Filters | ((prev: Filters) => Filters)) => void;
  onClear: () => void;
};

export default function FiltersBox({
  customers,
  suppliers,
  factories,
  seasons,
  styles,
  estados,
  filters,
  onChange,
  onClear,
}: Props) {
  const setField = (key: keyof Filters, value: string) => {
    onChange((prev) => ({
      ...prev,
      [key]: String(value ?? ""),
    }));
  };

  const safe = (value: unknown) => String(value ?? "");

  return (
    <div className="space-y-4 rounded-lg bg-white p-4 shadow">
      <h2 className="text-lg font-semibold">Filtros</h2>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-7">
        <div>
          <label className="text-sm font-medium">Customer</label>
          <select
            className="w-full rounded border px-3 py-2"
            value={safe(filters.customer) || "todos"}
            onChange={(e) => setField("customer", e.target.value)}
          >
            <option value="todos">Todos</option>
            {customers.map((customer) => (
              <option key={customer} value={customer}>
                {customer}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Supplier</label>
          <select
            className="w-full rounded border px-3 py-2"
            value={safe(filters.supplier) || "todos"}
            onChange={(e) => setField("supplier", e.target.value)}
          >
            <option value="todos">Todos</option>
            {suppliers.map((supplier) => (
              <option key={supplier} value={supplier}>
                {supplier}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Factory</label>
          <select
            className="w-full rounded border px-3 py-2"
            value={safe(filters.factory) || "todos"}
            onChange={(e) => setField("factory", e.target.value)}
          >
            <option value="todos">Todos</option>
            {factories.map((factory) => (
              <option key={factory} value={factory}>
                {factory}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Season</label>
          <select
            className="w-full rounded border px-3 py-2"
            value={safe(filters.season) || "todos"}
            onChange={(e) => setField("season", e.target.value)}
          >
            <option value="todos">Todas</option>
            {seasons.map((season) => (
              <option key={season} value={season}>
                {season}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Style</label>
          <select
            className="w-full rounded border px-3 py-2"
            value={safe(filters.style)}
            onChange={(e) => setField("style", e.target.value)}
          >
            <option value="">Todos</option>
            {styles.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Estado</label>
          <select
            className="w-full rounded border px-3 py-2"
            value={safe(filters.estado) || "todos"}
            onChange={(e) => setField("estado", e.target.value)}
          >
            <option value="todos">Todos</option>
            {estados.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Buscar</label>
          <input
            className="w-full rounded border px-3 py-2"
            value={safe(filters.search)}
            onChange={(e) => setField("search", e.target.value)}
            placeholder="PO / customer / supplier..."
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onClear}
        className="rounded bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200"
      >
        Limpiar filtros
      </button>
    </div>
  );
}