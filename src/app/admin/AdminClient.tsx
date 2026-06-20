"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ProductStatus = "draft" | "active" | "archived";

type Product = {
  id: string;
  variantId: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  status: ProductStatus;
  sku: string;
  variantName: string | null;
  priceAmount: number;
  currency: string;
  available: number;
};

type Order = {
  id: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  status:
    | "pending_payment"
    | "paid"
    | "preparing"
    | "shipped"
    | "completed"
    | "cancelled"
    | "refunded";
  paymentStatus: string;
  fulfillmentStatus: string;
  grandTotalAmount: number;
  createdAt: string;
  items: Array<{
    productName: string;
    sku: string;
    quantity: number;
    lineTotalAmount: number;
  }>;
};

type AdminUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: "customer" | "admin";
  status: "active" | "disabled";
};

type DashboardData = {
  summary: {
    range: "7d" | "30d" | "90d";
    sales: {
      orderCount: number;
      grossAmount: number;
      averageOrderAmount: number;
    };
    customers: {
      totalCustomers: number;
      newCustomers: number;
    };
    payments: {
      paidAmount: number;
      unpaidOrders: number;
    };
    fulfillment: {
      unfulfilledOrders: number;
      shippedOrders: number;
    };
    inventory: {
      lowStockCount: number;
    };
  };
  salesChart: Array<{
    date: string;
    orderCount: number;
    grossAmount: number;
  }>;
  topProducts: Array<{
    productName: string;
    sku: string;
    quantitySold: number;
    grossAmount: number;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerEmail: string;
    customerName: string;
    status: Order["status"];
    grandTotalAmount: number;
    createdAt: string;
  }>;
  lowStock: Array<{
    variantId: string;
    sku: string;
    productName: string;
    variantName: string | null;
    available: number;
    safetyStock: number;
  }>;
};

type ProductForm = {
  productId: string;
  variantId: string;
  name: string;
  slug: string;
  description: string;
  sku: string;
  variantName: string;
  price: string;
  onHand: string;
  status: ProductStatus;
  imageFile: File | null;
};

type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: "customer" | "admin";
  status: "active" | "disabled";
};

const blankProductForm: ProductForm = {
  productId: "",
  variantId: "",
  name: "",
  slug: "",
  description: "",
  sku: "",
  variantName: "",
  price: "",
  onHand: "10",
  status: "active",
  imageFile: null
};

const orderStatuses: Order["status"][] = [
  "pending_payment",
  "paid",
  "preparing",
  "shipped",
  "completed",
  "cancelled",
  "refunded"
];

function formatMoney(amount: number, currency = "THB") {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency
  }).format(amount / 100);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function productToForm(product: Product): ProductForm {
  return {
    productId: product.id,
    variantId: product.variantId,
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    sku: product.sku,
    variantName: product.variantName ?? "",
    price: String(product.priceAmount / 100),
    onHand: String(Math.max(product.available, 0)),
    status: product.status,
    imageFile: null
  };
}

export default function AdminClient() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [productForm, setProductForm] =
    useState<ProductForm>(blankProductForm);

  const isEditing = Boolean(editingId);

  async function loadCurrentUser() {
    const response = await fetch("/api/me", { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      setCurrentUser(null);
      return null;
    }

    setCurrentUser(data.user);
    return data.user as CurrentUser;
  }

  async function loadAdmin() {
    const [dashboardResponse, usersResponse, productsResponse, ordersResponse] =
      await Promise.all([
        fetch("/api/admin/dashboard", { cache: "no-store" }),
        fetch("/api/admin/users", { cache: "no-store" }),
      fetch("/api/admin/products", { cache: "no-store" }),
      fetch("/api/admin/orders", { cache: "no-store" })
      ]);

    const dashboardData = await dashboardResponse.json();
    const usersData = await usersResponse.json();
    const productsData = await productsResponse.json();
    const ordersData = await ordersResponse.json();

    if (!dashboardResponse.ok) {
      throw new Error(dashboardData.message ?? "Unable to load dashboard");
    }

    if (!usersResponse.ok) {
      throw new Error(usersData.message ?? "Unable to load users");
    }

    if (!productsResponse.ok) {
      throw new Error(productsData.message ?? "Unable to load products");
    }

    if (!ordersResponse.ok) {
      throw new Error(ordersData.message ?? "Unable to load orders");
    }

    setDashboard(dashboardData);
    setUsers(usersData.users);
    setProducts(productsData.products);
    setOrders(ordersData.orders);
  }

  useEffect(() => {
    loadCurrentUser()
      .then((user) => {
        setAuthChecked(true);

        if (user?.role === "admin") {
          return loadAdmin();
        }

        return undefined;
      })
      .catch((error: unknown) => {
        setAuthChecked(true);
        setMessage(error instanceof Error ? error.message : "Unable to load data");
      });
  }, []);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to login");
      }

      if (data.user.role !== "admin") {
        throw new Error("Admin access required");
      }

      setCurrentUser(data.user);
      setLoginForm({ email: "", password: "" });
      await loadAdmin();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to login");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setMessage("");

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setCurrentUser(null);
      setProducts([]);
      setOrders([]);
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(productId: string, file: File | null, altText: string) {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("altText", altText);

    const response = await fetch(`/api/admin/products/${productId}/image`, {
      method: "POST",
      body: formData
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message ?? "Unable to upload image");
    }
  }

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const payload = {
        productId: productForm.productId,
        variantId: productForm.variantId,
        name: productForm.name,
        slug: productForm.slug || slugify(productForm.name),
        description: productForm.description,
        sku: productForm.sku,
        variantName: productForm.variantName,
        priceAmount: Math.round(Number(productForm.price) * 100),
        onHand: Number(productForm.onHand),
        status: productForm.status
      };

      const response = await fetch("/api/admin/products", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to save product");
      }

      const productId = isEditing ? productForm.productId : data.product.productId;
      await uploadImage(productId, productForm.imageFile, productForm.name);

      setProductForm(blankProductForm);
      setEditingId(null);
      setMessage(isEditing ? "Product updated" : "Product created");
      await loadAdmin();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save product");
    } finally {
      setBusy(false);
    }
  }

  async function deleteProduct(product: Product) {
    const confirmed = window.confirm(
      `Archive ${product.name}? It will disappear from the storefront.`
    );

    if (!confirmed) return;

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/products?productId=${product.id}`, {
        method: "DELETE"
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to delete product");
      }

      if (editingId === product.id) {
        setProductForm(blankProductForm);
        setEditingId(null);
      }

      setMessage("Product archived");
      await loadAdmin();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete product");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setProductForm(productToForm(product));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setProductForm(blankProductForm);
    setEditingId(null);
  }

  async function updateOrderStatus(orderId: string, status: Order["status"]) {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to update order");
      }

      setMessage("Order status updated");
      await loadAdmin();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update order");
    } finally {
      setBusy(false);
    }
  }

  async function updateUser(
    userId: string,
    patch: Pick<Partial<AdminUser>, "role" | "status">
  ) {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...patch })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to update user");
      }

      setMessage("User updated");
      await loadAdmin();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update user");
    } finally {
      setBusy(false);
    }
  }

  if (!authChecked) {
    return (
      <main className="admin-app">
        <div className="notice">Checking admin session</div>
      </main>
    );
  }

  if (currentUser?.role !== "admin") {
    return (
      <main className="admin-app auth-screen">
        <form className="admin-form auth-form" onSubmit={login}>
          <div className="section-heading compact">
            <div>
              <span className="eyebrow">Admin</span>
              <h1>Sign in</h1>
            </div>
          </div>
          {message ? <div className="notice inline">{message}</div> : null}
          <label>
            Email
            <input
              required
              type="email"
              value={loginForm.email}
              onChange={(event) =>
                setLoginForm({ ...loginForm, email: event.target.value })
              }
            />
          </label>
          <label>
            Password
            <input
              required
              type="password"
              value={loginForm.password}
              onChange={(event) =>
                setLoginForm({ ...loginForm, password: event.target.value })
              }
            />
          </label>
          <button disabled={busy} type="submit">
            Sign in
          </button>
          <Link className="store-link" href="/">
            Storefront
          </Link>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-app">
      <header className="topbar">
        <div>
          <span className="eyebrow">Admin</span>
          <h1>Operations</h1>
        </div>
        <div className="topbar-actions">
          <span>{currentUser.email}</span>
          <Link href="/">Storefront</Link>
          <button disabled={busy} onClick={() => loadAdmin()} type="button">
            Refresh
          </button>
          <button className="secondary-button" disabled={busy} onClick={logout} type="button">
            Logout
          </button>
        </div>
      </header>

      {message ? <div className="notice">{message}</div> : null}

      {dashboard ? (
        <section className="dashboard-grid">
          <article className="metric-tile">
            <span>Sales</span>
            <strong>{formatMoney(dashboard.summary.sales.grossAmount)}</strong>
            <small>{dashboard.summary.sales.orderCount} orders</small>
          </article>
          <article className="metric-tile">
            <span>Customers</span>
            <strong>{dashboard.summary.customers.totalCustomers}</strong>
            <small>{dashboard.summary.customers.newCustomers} new</small>
          </article>
          <article className="metric-tile">
            <span>Payments</span>
            <strong>{formatMoney(dashboard.summary.payments.paidAmount)}</strong>
            <small>{dashboard.summary.payments.unpaidOrders} unpaid</small>
          </article>
          <article className="metric-tile">
            <span>Fulfillment</span>
            <strong>{dashboard.summary.fulfillment.unfulfilledOrders}</strong>
            <small>{dashboard.summary.fulfillment.shippedOrders} shipped</small>
          </article>
          <article className="metric-tile">
            <span>Low stock</span>
            <strong>{dashboard.summary.inventory.lowStockCount}</strong>
            <small>items need attention</small>
          </article>
        </section>
      ) : null}

      <section className="admin-layout">
        <form className="admin-form" onSubmit={saveProduct}>
          <div className="section-heading compact">
            <div>
              <h2>{isEditing ? "Edit product" : "New product"}</h2>
              <p>Manage product data, image, variant, price, and stock.</p>
            </div>
          </div>

          <label>
            Product image
            <input
              accept="image/jpeg,image/png,image/webp"
              type="file"
              onChange={(event) =>
                setProductForm({
                  ...productForm,
                  imageFile: event.target.files?.[0] ?? null
                })
              }
            />
          </label>

          <label>
            Product name
            <input
              required
              value={productForm.name}
              onChange={(event) =>
                setProductForm({
                  ...productForm,
                  name: event.target.value,
                  slug: isEditing
                    ? productForm.slug
                    : slugify(event.target.value)
                })
              }
            />
          </label>
          <label>
            Slug
            <input
              required
              value={productForm.slug}
              onChange={(event) =>
                setProductForm({ ...productForm, slug: event.target.value })
              }
            />
          </label>
          <label>
            Description
            <textarea
              value={productForm.description}
              onChange={(event) =>
                setProductForm({
                  ...productForm,
                  description: event.target.value
                })
              }
            />
          </label>
          <div className="form-grid">
            <label>
              SKU
              <input
                required
                value={productForm.sku}
                onChange={(event) =>
                  setProductForm({ ...productForm, sku: event.target.value })
                }
              />
            </label>
            <label>
              Variant
              <input
                value={productForm.variantName}
                onChange={(event) =>
                  setProductForm({
                    ...productForm,
                    variantName: event.target.value
                  })
                }
              />
            </label>
          </div>
          <div className="form-grid">
            <label>
              Price
              <input
                min="0"
                required
                step="0.01"
                type="number"
                value={productForm.price}
                onChange={(event) =>
                  setProductForm({ ...productForm, price: event.target.value })
                }
              />
            </label>
            <label>
              Stock
              <input
                min="0"
                required
                type="number"
                value={productForm.onHand}
                onChange={(event) =>
                  setProductForm({ ...productForm, onHand: event.target.value })
                }
              />
            </label>
          </div>
          <label>
            Status
            <select
              value={productForm.status}
              onChange={(event) =>
                setProductForm({
                  ...productForm,
                  status: event.target.value as ProductStatus
                })
              }
            >
              <option value="active">active</option>
              <option value="draft">draft</option>
              <option value="archived">archived</option>
            </select>
          </label>
          <div className="button-row">
            <button disabled={busy} type="submit">
              {isEditing ? "Save changes" : "Create product"}
            </button>
            {isEditing ? (
              <button className="secondary-button" onClick={resetForm} type="button">
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        <div className="admin-main">
          <section className="workspace">
            <div className="section-heading">
              <div>
                <h2>Dashboard</h2>
                <p>Sales, stock, and recent activity for the current range.</p>
              </div>
              <span>{dashboard?.summary.range ?? "7d"}</span>
            </div>
            <div className="dashboard-panels">
              <div className="mini-list">
                <strong>Top products</strong>
                {dashboard?.topProducts.length ? (
                  dashboard.topProducts.map((product) => (
                    <div className="mini-row" key={product.sku}>
                      <span>
                        {product.productName}
                        <small>{product.sku}</small>
                      </span>
                      <b>{product.quantitySold}</b>
                    </div>
                  ))
                ) : (
                  <div className="empty-state small">No sales yet</div>
                )}
              </div>
              <div className="mini-list">
                <strong>Low stock</strong>
                {dashboard?.lowStock.length ? (
                  dashboard.lowStock.map((item) => (
                    <div className="mini-row" key={item.variantId}>
                      <span>
                        {item.productName}
                        <small>{item.sku}</small>
                      </span>
                      <b>{item.available}</b>
                    </div>
                  ))
                ) : (
                  <div className="empty-state small">Stock looks healthy</div>
                )}
              </div>
            </div>
          </section>

          <section className="workspace">
            <div className="section-heading">
              <div>
                <h2>Users</h2>
                <p>Admin account access and customer account status.</p>
              </div>
              <span>{users.length} users</span>
            </div>
            <div className="user-list">
              {users.length === 0 ? (
                <div className="empty-state small">No users yet</div>
              ) : (
                users.map((user) => (
                  <article className="user-row" key={user.id}>
                    <div>
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>
                    <select
                      disabled={busy || user.id === currentUser.id}
                      value={user.role}
                      onChange={(event) =>
                        updateUser(user.id, {
                          role: event.target.value as AdminUser["role"]
                        })
                      }
                    >
                      <option value="customer">customer</option>
                      <option value="admin">admin</option>
                    </select>
                    <select
                      disabled={busy || user.id === currentUser.id}
                      value={user.status}
                      onChange={(event) =>
                        updateUser(user.id, {
                          status: event.target.value as AdminUser["status"]
                        })
                      }
                    >
                      <option value="active">active</option>
                      <option value="disabled">disabled</option>
                    </select>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="workspace">
            <div className="section-heading">
              <div>
                <h2>Products</h2>
                <p>CRUD list with images, stock, pricing, and visibility.</p>
              </div>
              <span>{products.length} SKU</span>
            </div>
            <div className="product-admin-list">
              {products.length === 0 ? (
                <div className="empty-state small">No products yet</div>
              ) : (
                products.map((product) => (
                  <article className="admin-product-row" key={product.variantId}>
                    <div className="product-thumb">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt={product.name} src={product.imageUrl} />
                      ) : (
                        <span>No image</span>
                      )}
                    </div>
                    <div>
                      <strong>{product.name}</strong>
                      <span>{product.sku}</span>
                      <small>
                        {product.status} · {formatMoney(product.priceAmount, product.currency)}
                      </small>
                    </div>
                    <div className="admin-row-actions">
                      <span>Stock {product.available}</span>
                      <button
                        className="secondary-button"
                        disabled={busy}
                        onClick={() => startEdit(product)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="danger-button"
                        disabled={busy}
                        onClick={() => deleteProduct(product)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="workspace">
            <div className="section-heading">
              <div>
                <h2>Orders</h2>
                <p>Recent checkout orders and fulfillment state.</p>
              </div>
              <span>{orders.length} orders</span>
            </div>
            <div className="order-list">
              {orders.length === 0 ? (
                <div className="empty-state small">No orders yet</div>
              ) : (
                orders.map((order) => (
                  <article className="order-row" key={order.id}>
                    <div>
                      <strong>{order.orderNumber}</strong>
                      <span>
                        {order.customerName} - {order.customerEmail}
                      </span>
                      <small>
                        {order.items
                          .map((item) => `${item.productName} x${item.quantity}`)
                          .join(", ")}
                      </small>
                    </div>
                    <div className="order-controls">
                      <strong>{formatMoney(order.grandTotalAmount)}</strong>
                      <select
                        disabled={busy}
                        value={order.status}
                        onChange={(event) =>
                          updateOrderStatus(
                            order.id,
                            event.target.value as Order["status"]
                          )
                        }
                      >
                        {orderStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
