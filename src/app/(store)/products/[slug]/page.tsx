import Link from "next/link";
import { notFound } from "next/navigation";
import { getStorefrontProductBySlug } from "@/modules/catalog/admin";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function formatMoney(amount: number, currency = "THB") {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency
  }).format(amount / 100);
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getStorefrontProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const primaryImage = product.images[0]?.publicUrl ?? product.imageUrl;
  const primaryVariant = product.variants[0];

  return (
    <main className="store-app">
      <header className="topbar">
        <div>
          <span className="eyebrow">Product</span>
          <h1>{product.name}</h1>
        </div>
        <div className="topbar-actions">
          <Link href="/">Storefront</Link>
          {product.category ? (
            <span>{product.category.name}</span>
          ) : null}
        </div>
      </header>

      <section className="product-detail">
        <div className="product-hero-image">
          {primaryImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={product.name} src={primaryImage} />
          ) : (
            <span>No image</span>
          )}
        </div>
        <div className="product-detail-copy">
          <div>
            <span className="eyebrow">{primaryVariant?.sku}</span>
            <h2>{formatMoney(product.priceAmount, product.currency)}</h2>
            <p>{product.description ?? "No description provided."}</p>
          </div>
          <div className="variant-list">
            {product.variants.map((variant) => (
              <div className="variant-row" key={variant.id}>
                <div>
                  <strong>{variant.name ?? product.name}</strong>
                  <span>{variant.sku}</span>
                </div>
                <div>
                  <strong>
                    {formatMoney(variant.priceAmount, variant.currency)}
                  </strong>
                  <span>Stock {variant.available}</span>
                </div>
              </div>
            ))}
          </div>
          <Link className="store-link" href="/">
            Back to cart
          </Link>
        </div>
      </section>
    </main>
  );
}
