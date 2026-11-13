export type LocalCartItem = {
  id: string;
  productId?: string;
  quantity: number;
  variantLabel?: string;
  price?: number;
};

export const GUEST_CART_KEY = "cart";

export function readLocalCart(): LocalCartItem[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => ({
        id: String(item?.id ?? ""),
        productId: String(item?.productId ?? item?.id ?? ""),
        quantity: Math.max(1, Number(item?.quantity ?? 1)),
        variantLabel: item?.variantLabel ? String(item.variantLabel) : undefined,
        price: item?.price !== undefined ? Number(item.price) : undefined,
      }))
      .filter((item) => item.id);
  } catch (error) {
    console.error("Could not read local cart:", error);
    return [];
  }
}

export function writeLocalCart(items: LocalCartItem[]) {
  if (items.length === 0) {
    localStorage.removeItem(GUEST_CART_KEY);
    return;
  }

  localStorage.setItem(
    GUEST_CART_KEY,
    JSON.stringify(items)
  );
}

export function addToLocalCart(productId: string, variantLabel?: string, price?: number, qty: number = 1) {
  const cart = readLocalCart();
  const id = variantLabel ? `${productId}_${variantLabel}` : String(productId);

  const existing = cart.find(
    (item) => item.id === id
  );

  const addCount = Math.max(1, qty);
  if (existing) {
    existing.quantity += addCount;
  } else {
    cart.push({
      id,
      productId: String(productId),
      quantity: addCount,
      variantLabel,
      price,
    });
  }

  writeLocalCart(cart);
}

export function removeFromLocalCart(itemId: string) {
  const cart = readLocalCart().filter(
    (item) => item.id !== String(itemId) && item.productId !== String(itemId)
  );

  writeLocalCart(cart);
}

export function updateLocalCartQuantity(
  itemId: string,
  quantity: number
) {
  if (quantity <= 0) {
    removeFromLocalCart(itemId);
    return;
  }

  const cart = readLocalCart();

  const existing = cart.find(
    (item) => item.id === String(itemId)
  );

  if (existing) {
    existing.quantity = quantity;
  }

  writeLocalCart(cart);
}

export function clearLocalCart() {
  localStorage.removeItem(GUEST_CART_KEY);
}