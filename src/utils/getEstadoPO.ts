// /src/utils/getEstadoPO.ts

export function getEstadoPO(po: any) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const shipping = po.shipping_date
    ? new Date(po.shipping_date + "T00:00:00")
    : null;

  const etd = po.etd_pi
    ? new Date(po.etd_pi + "T00:00:00")
    : null;

  // 1️⃣ Finalizado → Shipping date pasada
  if (shipping && shipping.getTime() < hoy.getTime()) {
    return { estado: "Finalizado", color: "green", icon: "🟢" };
  }

  // 2️⃣ En producción → Shipping futura o igual a hoy
  if (shipping && shipping.getTime() >= hoy.getTime()) {
    return { estado: "En producción", color: "blue", icon: "🔵" };
  }

  // 3️⃣ Delay → No shipping, y ETD ya quedó atrás
  if (etd && hoy.getTime() > etd.getTime()) {
    return { estado: "Delay", color: "red", icon: "🔥" };
  }

  // 4️⃣ Sin datos suficientes
  return { estado: "Sin datos", color: "gray", icon: "⚪" };
}
