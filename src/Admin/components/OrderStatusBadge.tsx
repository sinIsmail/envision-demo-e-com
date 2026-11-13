import { Badge } from "@/components/ui/badge";
import { type OrderStatus, STATUS_LABELS, STATUS_ICONS } from "@/types/order";

interface Props {
  status: OrderStatus;
  className?: string;
}

const STATUS_VARIANT: Record<
  OrderStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  placed: "outline",
  being_packed: "secondary",
  ready_for_shipment: "secondary",
  out_for_delivery: "default",
  shipped: "default",
  cancelled: "destructive",
};

const STATUS_STYLE: Record<OrderStatus, string> = {
  placed: "border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400",
  being_packed:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  ready_for_shipment:
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
  out_for_delivery:
    "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400",
  shipped:
    "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  cancelled:
    "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400",
};

export function OrderStatusBadge({ status, className = "" }: Props) {
  return (
    <Badge
      variant={STATUS_VARIANT[status]}
      className={`font-medium whitespace-nowrap ${STATUS_STYLE[status]} ${className}`}
    >
      {STATUS_ICONS[status]}&nbsp;{STATUS_LABELS[status]}
    </Badge>
  );
}
