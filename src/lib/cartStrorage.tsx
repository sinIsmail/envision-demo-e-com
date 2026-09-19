export type LocalCartItem = {
  id: string;
  quantity: number;
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
        quantity: Math.max(1, Number(item?.quantity ?? 1)),
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

export function addToLocalCart(productId: string) {
  const cart = readLocalCart();

  const existing = cart.find(
    (item) => item.id === String(productId)
  );

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: String(productId),
      quantity: 1,
    });
  }

  writeLocalCart(cart);
}

export function removeFromLocalCart(productId: string) {
  const cart = readLocalCart().filter(
    (item) => item.id !== String(productId)
  );

  writeLocalCart(cart);
}

export function updateLocalCartQuantity(
  productId: string,
  quantity: number
) {
  if (quantity <= 0) {
    removeFromLocalCart(productId);
    return;
  }

  const cart = readLocalCart();

  const existing = cart.find(
    (item) => item.id === String(productId)
  );

  if (existing) {
    existing.quantity = quantity;
  }

  writeLocalCart(cart);
}

export function clearLocalCart() {
  localStorage.removeItem(GUEST_CART_KEY);
}