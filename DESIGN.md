# Commerce System Design

เอกสารนี้อธิบายภาพรวมระบบ ecommerce ที่ควรมีทั้งหมดสำหรับโปรเจกต์นี้ รวมถึง module, database, API, service function, admin function และ flow สำคัญที่ควรพัฒนาให้ครบ

## 1. System Overview

ระบบเป็น ecommerce แบบ modular monolith ใช้ Next.js เป็น frontend และ backend API ในโปรเจกต์เดียวกัน โดยแบ่ง logic ออกเป็น module ตาม domain เช่น users, catalog, inventory, cart, checkout, orders, payments, shipping และ promotions

เป้าหมายของระบบ:

- ลูกค้าดูสินค้า ค้นหา กรองสินค้า และดูรายละเอียดสินค้าได้
- ลูกค้าสมัครสมาชิก เข้าสู่ระบบ และจัดการข้อมูลส่วนตัว/ที่อยู่ได้
- ลูกค้าเพิ่มสินค้าใส่ตะกร้า ใช้คูปอง และ checkout ได้
- ระบบตรวจสต็อก คำนวณยอดเงิน สร้าง order และ reserve stock ได้ถูกต้อง
- ระบบรองรับ payment provider, payment webhook และ refund
- ระบบรองรับ shipment, tracking และ fulfillment status
- แอดมินจัดการสินค้า สต็อก คำสั่งซื้อ ลูกค้า promotion และรายงานได้
- ระบบรองรับ background jobs สำหรับงานที่ไม่ควรทำใน request ตรง ๆ

## 2. Architecture

### 2.1 Frontend

- Storefront: หน้าร้านสำหรับลูกค้า
- Customer account: หน้าบัญชีลูกค้า
- Admin dashboard: หน้าหลังบ้านสำหรับแอดมิน

### 2.2 Backend

- Next.js Route Handlers สำหรับ API
- Service layer สำหรับ business logic
- Repository layer สำหรับ query database
- PostgreSQL เป็น primary database
- Redis/BullMQ สำหรับ background jobs
- JWT สำหรับ authentication

### 2.3 Module Pattern

แต่ละ module ควรมีไฟล์หลัก:

- `types.ts`: type/interface ของ domain
- `repository.ts`: database query
- `service.ts`: business logic
- `admin.ts`: admin-specific use cases ถ้ามี
- route handler ใน `src/app/api/...`

## 3. Core Modules

## 4. Users And Auth

### Purpose

จัดการบัญชีผู้ใช้ ลูกค้า แอดมิน ที่อยู่ และ authentication

### Database

- `users`
- `addresses`

### Functions ที่ควรมี

#### User Service

- `createUser(input)`: สร้าง user ใหม่
- `getUserById(userId)`: ดึง user ตาม id
- `getUserByEmail(email)`: ดึง user ตาม email
- `updateUserProfile(userId, input)`: แก้ไขชื่อ เบอร์โทร หรือข้อมูล profile
- `disableUser(userId)`: ปิดใช้งาน user
- `enableUser(userId)`: เปิดใช้งาน user
- `changeUserRole(userId, role)`: เปลี่ยน role customer/admin
- `listUsers(filter)`: รายการ users สำหรับ admin

#### Auth Service

- `register(input)`: สมัครสมาชิก
- `login(email, password)`: login และออก JWT
- `logout(token/session)`: logout หรือ revoke session ถ้ามี session store
- `hashPassword(password)`: hash password
- `verifyPassword(password, passwordHash)`: ตรวจ password
- `signAuthToken(payload)`: สร้าง JWT
- `verifyAuthToken(token)`: ตรวจ JWT
- `requireAuth(request)`: อ่าน token จาก request และคืน current user
- `requireAdmin(request)`: ตรวจว่า user เป็น admin
- `refreshToken(token)`: ต่ออายุ token ถ้ารองรับ refresh flow
- `forgotPassword(email)`: เริ่ม flow reset password
- `resetPassword(token, newPassword)`: ตั้ง password ใหม่

#### Address Service

- `createAddress(userId, input)`: เพิ่มที่อยู่
- `listAddresses(userId)`: รายการที่อยู่ของ user
- `getAddress(userId, addressId)`: ดึงที่อยู่รายตัว
- `updateAddress(userId, addressId, input)`: แก้ไขที่อยู่
- `deleteAddress(userId, addressId)`: ลบที่อยู่
- `setDefaultAddress(userId, addressId, type)`: ตั้ง default shipping/billing

### API ที่ควรมี

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`
- `PATCH /api/me`
- `GET /api/me/addresses`
- `POST /api/me/addresses`
- `PATCH /api/me/addresses/:addressId`
- `DELETE /api/me/addresses/:addressId`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:userId`

## 5. Catalog

### Purpose

จัดการสินค้า หมวดหมู่ variant SKU ราคา รูปภาพ และข้อมูลสำหรับหน้าร้าน

### Database

- `categories`
- `products`
- `product_variants`
- `product_images`

### Functions ที่ควรมี

#### Storefront Catalog Service

- `listStorefrontProducts(filter)`: รายการสินค้าหน้าร้าน
- `getStorefrontProductBySlug(slug)`: รายละเอียดสินค้าด้วย slug
- `getStorefrontProductById(productId)`: รายละเอียดสินค้าด้วย id
- `searchProducts(query, filter)`: ค้นหาสินค้า
- `listProductsByCategory(categorySlug, filter)`: สินค้าตามหมวดหมู่
- `listCategories()`: รายการ category
- `getCategoryBySlug(slug)`: รายละเอียด category
- `getActiveVariantBySku(sku)`: ดึง variant ที่ขายได้ด้วย SKU
- `getVariantById(variantId)`: ดึง variant ด้วย id

#### Admin Product Service

- `listAdminProducts(filter)`: รายการสินค้าหลังบ้าน
- `getAdminProduct(productId)`: รายละเอียดสินค้าหลังบ้าน
- `createAdminProduct(input)`: สร้างสินค้า
- `updateAdminProduct(input)`: แก้ไขสินค้า
- `archiveAdminProduct(productId)`: archive สินค้า
- `restoreAdminProduct(productId)`: เปิดกลับจาก archived
- `deleteAdminProduct(productId)`: ลบถาวร ถ้า policy อนุญาต
- `publishProduct(productId)`: เปลี่ยนเป็น active
- `unpublishProduct(productId)`: เปลี่ยนเป็น draft

#### Product Variant Service

- `createVariant(productId, input)`: เพิ่ม variant
- `updateVariant(productId, variantId, input)`: แก้ไข variant
- `archiveVariant(productId, variantId)`: archive variant
- `deleteVariant(productId, variantId)`: ลบ variant ถ้าไม่มี dependency
- `changeVariantPrice(variantId, priceAmount)`: เปลี่ยนราคา
- `changeVariantStatus(variantId, status)`: เปลี่ยนสถานะ variant

#### Product Image Service

- `attachProductImage(input)`: ผูกรูปสินค้า
- `listProductImages(productId)`: รายการรูปสินค้า
- `updateProductImage(imageId, input)`: แก้ alt/sort order
- `deleteProductImage(imageId)`: ลบรูป
- `reorderProductImages(productId, imageIds)`: เรียงรูปใหม่
- `setPrimaryProductImage(productId, imageId)`: ตั้งรูปหลัก

#### Category Service

- `createCategory(input)`: สร้างหมวดหมู่
- `updateCategory(categoryId, input)`: แก้ไขหมวดหมู่
- `deleteCategory(categoryId)`: ลบหมวดหมู่
- `archiveCategory(categoryId)`: ปิดใช้งานหมวดหมู่
- `reorderCategories(input)`: เรียงหมวดหมู่
- `moveCategory(categoryId, parentId)`: ย้ายหมวดหมู่

### API ที่ควรมี

- `GET /api/catalog`
- `GET /api/catalog/products/:slug`
- `GET /api/catalog/categories`
- `GET /api/catalog/categories/:slug`
- `GET /api/search`
- `GET /api/admin/products`
- `POST /api/admin/products`
- `GET /api/admin/products/:productId`
- `PATCH /api/admin/products/:productId`
- `DELETE /api/admin/products/:productId`
- `POST /api/admin/products/:productId/variants`
- `PATCH /api/admin/products/:productId/variants/:variantId`
- `DELETE /api/admin/products/:productId/variants/:variantId`
- `POST /api/admin/products/:productId/images`
- `PATCH /api/admin/products/:productId/images/:imageId`
- `DELETE /api/admin/products/:productId/images/:imageId`
- `GET /api/admin/categories`
- `POST /api/admin/categories`
- `PATCH /api/admin/categories/:categoryId`
- `DELETE /api/admin/categories/:categoryId`

## 6. Inventory

### Purpose

จัดการคลังสินค้า สต็อกจริง สต็อกที่ถูกจอง safety stock และ stock movement

### Database

- `warehouses`
- `inventory_items`

ควรเพิ่มในอนาคต:

- `inventory_movements`
- `stock_reservations`

### Functions ที่ควรมี

#### Warehouse Service

- `createWarehouse(input)`: สร้างคลัง
- `listWarehouses()`: รายการคลัง
- `getWarehouse(warehouseId)`: รายละเอียดคลัง
- `updateWarehouse(warehouseId, input)`: แก้ไขคลัง
- `disableWarehouse(warehouseId)`: ปิดใช้งานคลัง
- `enableWarehouse(warehouseId)`: เปิดใช้งานคลัง

#### Inventory Service

- `getInventoryByVariant(variantId)`: ดูสต็อกของ variant ทุกคลัง
- `getInventoryItem(variantId, warehouseId)`: ดูสต็อกเฉพาะคลัง
- `setStock(variantId, warehouseId, quantity)`: ตั้ง stock ใหม่
- `increaseStock(variantId, warehouseId, quantity, reason)`: เพิ่ม stock
- `decreaseStock(variantId, warehouseId, quantity, reason)`: ลด stock
- `adjustStock(variantId, warehouseId, delta, reason)`: ปรับ stock แบบ delta
- `setSafetyStock(variantId, warehouseId, quantity)`: ตั้ง safety stock
- `getAvailableStock(variantId)`: คำนวณ available stock
- `reserveStock(items)`: จอง stock ตอน checkout
- `releaseReservedStock(items)`: คืน reserved stock เมื่อ cancel/หมดเวลา
- `commitReservedStock(items)`: ตัด stock จริงหลัง paid/fulfilled ตาม policy
- `transferStock(fromWarehouseId, toWarehouseId, variantId, quantity)`: ย้ายคลัง
- `listLowStockItems(threshold)`: รายการของใกล้หมด
- `listInventoryMovements(filter)`: ประวัติการเคลื่อนไหว stock

### API ที่ควรมี

- `GET /api/admin/warehouses`
- `POST /api/admin/warehouses`
- `PATCH /api/admin/warehouses/:warehouseId`
- `GET /api/admin/inventory`
- `GET /api/admin/inventory/:variantId`
- `PATCH /api/admin/inventory/:variantId`
- `POST /api/admin/inventory/adjust`
- `POST /api/admin/inventory/transfer`
- `GET /api/admin/inventory/movements`
- `GET /api/admin/inventory/low-stock`

## 7. Cart

### Purpose

จัดการตะกร้าสินค้าของ guest และ logged-in customer

### Database

- `carts`
- `cart_items`

### Functions ที่ควรมี

- `startGuestCart(sessionId)`: สร้าง guest cart
- `startUserCart(userId)`: สร้าง cart สำหรับ user
- `getCartDetails(cartId)`: รายละเอียด cart พร้อมสินค้าและยอดรวม
- `getActiveCartBySession(sessionId)`: cart active ของ guest
- `getActiveCartByUser(userId)`: cart active ของ user
- `addCartItem(input)`: เพิ่มสินค้าใน cart
- `updateCartItemQuantity(cartId, variantId, quantity)`: แก้จำนวน
- `removeCartItem(cartId, variantId)`: ลบสินค้าออกจาก cart
- `clearCart(cartId)`: ล้าง cart
- `mergeGuestCartToUserCart(sessionId, userId)`: รวม cart หลัง login
- `markCartConverted(cartId)`: เปลี่ยน cart เป็น converted
- `markCartAbandoned(cartId)`: เปลี่ยน cart เป็น abandoned
- `expireOldCarts()`: ปิด cart หมดอายุ
- `validateCart(cartId)`: ตรวจว่าสินค้ายัง active ราคา/stock ยังถูกต้อง
- `repriceCart(cartId)`: คำนวณราคาใหม่จากราคาปัจจุบัน

### API ที่ควรมี

- `POST /api/cart`
- `GET /api/cart`
- `PUT /api/cart`
- `PATCH /api/cart/items/:variantId`
- `DELETE /api/cart/items/:variantId`
- `DELETE /api/cart`
- `POST /api/cart/merge`
- `POST /api/cart/validate`

## 8. Checkout

### Purpose

เปลี่ยน cart เป็น order โดยตรวจ stock, promotion, shipping, tax และ customer information

### Functions ที่ควรมี

- `checkoutCart(input)`: checkout cart เป็น order
- `validateCheckoutInput(input)`: ตรวจข้อมูล checkout
- `validateCartForCheckout(cartId)`: ตรวจ cart ก่อน checkout
- `calculateCheckoutTotals(input)`: คำนวณ subtotal, discount, shipping, tax, grand total
- `calculateTax(cart, address)`: คำนวณภาษี
- `calculateShippingFee(cart, address, shippingMethod)`: คำนวณค่าขนส่ง
- `applyCouponToCheckout(cart, couponCode)`: ใช้ coupon
- `selectFulfillmentWarehouse(items)`: เลือก warehouse สำหรับ fulfill
- `reserveCheckoutStock(cart)`: reserve stock
- `createOrderFromCart(cart, totals, customerInfo)`: สร้าง order
- `convertCartToOrder(cartId, orderId)`: ผูก cart กับ order และ mark converted
- `startPaymentForOrder(orderId, provider)`: สร้าง payment session/transaction

### API ที่ควรมี

- `POST /api/checkout`
- `POST /api/checkout/preview`
- `POST /api/checkout/apply-coupon`
- `POST /api/checkout/shipping-options`

## 9. Orders

### Purpose

จัดการคำสั่งซื้อ รายการสินค้า สถานะ order และ order history

### Database

- `orders`
- `order_items`
- `order_status_events`
- `order_discounts`

### Functions ที่ควรมี

#### Order Service

- `createOrder(input)`: สร้าง order
- `getOrder(orderId)`: รายละเอียด order
- `getOrderByNumber(orderNumber)`: ดึง order ด้วยเลข order
- `listUserOrders(userId, filter)`: order history ของ customer
- `listAdminOrders(filter)`: รายการ order สำหรับ admin
- `insertOrder(input)`: repository function สำหรับ insert order
- `insertOrderItems(orderId, items)`: insert order items
- `logOrderStatus(orderId, status, note, metadata)`: บันทึก event
- `updateOrderStatus(orderId, status, note)`: เปลี่ยน status
- `cancelOrder(orderId, reason)`: ยกเลิก order
- `markOrderPaid(orderId, paymentId)`: เปลี่ยนเป็น paid
- `markOrderPaymentFailed(orderId, paymentId)`: payment fail
- `markOrderPreparing(orderId)`: กำลังเตรียมสินค้า
- `markOrderShipped(orderId, shipmentId)`: ส่งแล้ว
- `markOrderDelivered(orderId)`: delivered
- `markOrderCompleted(orderId)`: completed
- `markOrderRefunded(orderId)`: refunded
- `syncOrderStatuses(orderId)`: sync status จาก payment/shipping
- `calculateOrderTotals(items, discounts, shipping, tax)`: คำนวณยอด order
- `createOrderDiscount(orderId, discount)`: บันทึก discount

#### Admin Order Service

- `listAdminOrders(filter)`: รายการ order
- `getAdminOrder(orderId)`: รายละเอียด order สำหรับ admin
- `updateAdminOrderStatus(orderId, status, note)`: admin เปลี่ยน status
- `addAdminOrderNote(orderId, note)`: เพิ่ม note
- `cancelAdminOrder(orderId, reason)`: admin cancel order
- `exportOrders(filter)`: export order

### API ที่ควรมี

- `GET /api/orders`
- `GET /api/orders/:orderId`
- `POST /api/orders/:orderId/cancel`
- `GET /api/admin/orders`
- `GET /api/admin/orders/:orderId`
- `PATCH /api/admin/orders/:orderId/status`
- `POST /api/admin/orders/:orderId/notes`
- `POST /api/admin/orders/:orderId/cancel`
- `GET /api/admin/orders/export`

## 10. Payments

### Purpose

จัดการการจ่ายเงิน payment transaction, webhook, refund และ sync สถานะกับ order

### Database

- `payments`
- `payment_webhook_events`

### Functions ที่ควรมี

- `createPayment(input)`: สร้าง payment record
- `getPayment(paymentId)`: ดึง payment
- `getPaymentsByOrder(orderId)`: payment ทั้งหมดของ order
- `createPaymentIntent(orderId, provider)`: สร้าง payment intent/session กับ provider
- `confirmPayment(paymentId, payload)`: ยืนยัน payment
- `failPayment(paymentId, reason)`: mark failed
- `cancelPayment(paymentId, reason)`: cancel payment
- `refundPayment(paymentId, amount, reason)`: refund
- `recordPaymentWebhook(input)`: บันทึก webhook แบบ idempotent
- `processPaymentWebhook(provider, payload, signature)`: validate และ process webhook
- `markWebhookProcessed(provider, eventId)`: mark processed
- `syncPaymentToOrder(paymentId)`: update order payment_status/status
- `verifyPaymentSignature(provider, payload, signature)`: ตรวจ signature
- `mapProviderStatus(providerStatus)`: map status จาก provider เป็น internal status

### API ที่ควรมี

- `POST /api/payments`
- `GET /api/payments/:paymentId`
- `POST /api/payments/:paymentId/confirm`
- `POST /api/payments/:paymentId/cancel`
- `POST /api/payments/:paymentId/refund`
- `POST /api/payments/webhooks/:provider`
- `GET /api/admin/payments`
- `GET /api/admin/payments/:paymentId`

## 11. Shipping And Fulfillment

### Purpose

จัดการ shipment, tracking, carrier, fulfillment และสถานะจัดส่ง

### Database

- `shipments`

ควรเพิ่มในอนาคต:

- `shipping_methods`
- `shipment_events`

### Functions ที่ควรมี

- `createShipment(input)`: สร้าง shipment
- `getShipment(shipmentId)`: รายละเอียด shipment
- `getShipmentsByOrder(orderId)`: shipment ของ order
- `createShipmentForOrder(orderId, input)`: สร้าง shipment จาก order
- `updateTrackingNumber(shipmentId, trackingNumber)`: เพิ่ม/แก้ tracking
- `updateShipmentStatus(shipmentId, status, note)`: เปลี่ยน status
- `markShipmentReadyToShip(shipmentId)`: พร้อมส่ง
- `markShipmentShipped(shipmentId, trackingNumber)`: ส่งแล้ว
- `markShipmentDelivered(shipmentId)`: delivered
- `markShipmentReturned(shipmentId)`: returned
- `calculateShippingOptions(cart, address)`: option การจัดส่ง
- `calculateShippingFee(cart, address, method)`: ค่าขนส่ง
- `syncShipmentToOrder(shipmentId)`: update fulfillment_status ของ order
- `recordShipmentEvent(shipmentId, event)`: บันทึก event จาก carrier
- `processCarrierWebhook(provider, payload)`: webhook จากขนส่ง

### API ที่ควรมี

- `GET /api/orders/:orderId/shipments`
- `GET /api/admin/shipments`
- `POST /api/admin/orders/:orderId/shipments`
- `PATCH /api/admin/shipments/:shipmentId`
- `POST /api/admin/shipments/:shipmentId/ready`
- `POST /api/admin/shipments/:shipmentId/ship`
- `POST /api/admin/shipments/:shipmentId/deliver`
- `POST /api/shipping/webhooks/:provider`

## 12. Promotions And Coupons

### Purpose

จัดการ promotion, coupon, discount rules และ usage limits

### Database

- `promotions`
- `coupons`
- `order_discounts`

### Functions ที่ควรมี

- `createPromotion(input)`: สร้าง promotion
- `updatePromotion(promotionId, input)`: แก้ promotion
- `archivePromotion(promotionId)`: ปิด promotion
- `listPromotions(filter)`: รายการ promotion
- `getPromotion(promotionId)`: รายละเอียด promotion
- `createCoupon(promotionId, input)`: สร้าง coupon
- `updateCoupon(couponId, input)`: แก้ coupon
- `disableCoupon(couponId)`: ปิด coupon
- `getActiveCoupon(code)`: ดึง coupon ที่ใช้งานได้
- `validateCoupon(code, cart, userId)`: ตรวจว่าใช้ได้ไหม
- `calculateDiscount(coupon, cart)`: คำนวณ discount
- `applyCoupon(cartId, code)`: ใช้ coupon กับ cart/checkout
- `incrementPromotionUsage(promotionId)`: เพิ่ม used_count
- `incrementCouponUsage(couponId)`: เพิ่ม used_count
- `recordOrderDiscount(orderId, coupon, amount)`: บันทึกส่วนลดใน order
- `releaseCouponUsage(couponId)`: คืน usage กรณี cancel

### API ที่ควรมี

- `POST /api/coupons/validate`
- `POST /api/cart/apply-coupon`
- `GET /api/admin/promotions`
- `POST /api/admin/promotions`
- `GET /api/admin/promotions/:promotionId`
- `PATCH /api/admin/promotions/:promotionId`
- `DELETE /api/admin/promotions/:promotionId`
- `POST /api/admin/promotions/:promotionId/coupons`
- `PATCH /api/admin/coupons/:couponId`
- `DELETE /api/admin/coupons/:couponId`

## 13. Admin Dashboard

### Purpose

หน้ารวมสำหรับแอดมินเพื่อดูภาพรวมธุรกิจและจัดการข้อมูล

### Functions ที่ควรมี

- `getDashboardSummary(range)`: สรุปยอดขาย order customers
- `getSalesChart(range)`: ข้อมูลกราฟยอดขาย
- `getTopProducts(range)`: สินค้าขายดี
- `getRecentOrders(limit)`: order ล่าสุด
- `getLowStockSummary()`: สินค้าใกล้หมด
- `getPaymentSummary(range)`: สรุป payment
- `getFulfillmentSummary(range)`: สรุป shipping/fulfillment
- `getCustomerSummary(range)`: ลูกค้าใหม่ ลูกค้าซื้อซ้ำ

### API ที่ควรมี

- `GET /api/admin/dashboard`
- `GET /api/admin/dashboard/sales`
- `GET /api/admin/dashboard/top-products`
- `GET /api/admin/dashboard/low-stock`

## 14. Search And Filtering

### Purpose

ค้นหาและกรองสินค้าหน้าร้าน

### Functions ที่ควรมี

- `searchProducts(query, filters)`: full-text search
- `filterProducts(filters)`: กรอง category, price, availability
- `sortProducts(sortBy)`: sort ตาม newest, price, popularity
- `getSearchSuggestions(query)`: suggestion
- `recordSearchQuery(query, userId)`: เก็บ query เพื่อ analytics
- `getPopularSearches()`: query ยอดนิยม

### API ที่ควรมี

- `GET /api/search`
- `GET /api/search/suggestions`
- `GET /api/admin/search/analytics`

## 15. Reviews And Ratings

ยังไม่มีใน database ปัจจุบัน แต่ควรมีในระบบ ecommerce ที่ครบขึ้น

### Database ที่ควรเพิ่ม

- `product_reviews`
- `product_review_images`

### Functions ที่ควรมี

- `createReview(userId, productId, input)`: เขียน review
- `updateReview(userId, reviewId, input)`: แก้ review
- `deleteReview(userId, reviewId)`: ลบ review
- `listProductReviews(productId, filter)`: review ของสินค้า
- `getProductRatingSummary(productId)`: คะแนนเฉลี่ย
- `moderateReview(reviewId, status)`: admin approve/reject
- `reportReview(reviewId, reason)`: report review

### API ที่ควรมี

- `GET /api/products/:productId/reviews`
- `POST /api/products/:productId/reviews`
- `PATCH /api/reviews/:reviewId`
- `DELETE /api/reviews/:reviewId`
- `GET /api/admin/reviews`
- `PATCH /api/admin/reviews/:reviewId/status`

## 16. Wishlist

ยังไม่มีใน database ปัจจุบัน แต่ควรมีสำหรับ customer experience

### Database ที่ควรเพิ่ม

- `wishlists`
- `wishlist_items`

### Functions ที่ควรมี

- `getWishlist(userId)`: ดู wishlist
- `addWishlistItem(userId, productId, variantId)`: เพิ่ม wishlist
- `removeWishlistItem(userId, itemId)`: ลบ wishlist item
- `moveWishlistItemToCart(userId, itemId, cartId)`: ย้ายไป cart
- `clearWishlist(userId)`: ล้าง wishlist

### API ที่ควรมี

- `GET /api/me/wishlist`
- `POST /api/me/wishlist`
- `DELETE /api/me/wishlist/:itemId`
- `POST /api/me/wishlist/:itemId/move-to-cart`

## 17. Notifications

### Purpose

ส่ง email หรือ notification ให้ลูกค้าและแอดมิน

### Functions ที่ควรมี

- `sendOrderConfirmation(orderId)`: ส่ง email ยืนยัน order
- `sendPaymentConfirmation(orderId)`: แจ้งจ่ายเงินสำเร็จ
- `sendPaymentFailed(orderId)`: แจ้งจ่ายเงินไม่สำเร็จ
- `sendShipmentTracking(orderId, shipmentId)`: ส่ง tracking
- `sendOrderCancelled(orderId)`: แจ้งยกเลิก order
- `sendRefundConfirmation(orderId)`: แจ้ง refund
- `sendLowStockAlert(variantId)`: แจ้ง stock ต่ำ
- `sendPasswordResetEmail(userId, token)`: reset password

### Jobs ที่ควรมี

- `order-confirmation-email`
- `payment-confirmation-email`
- `shipment-tracking-email`
- `low-stock-alert`
- `abandoned-cart-email`

## 18. Background Jobs

### Purpose

ใช้ BullMQ/Redis จัดการงาน async

### Functions ที่ควรมี

- `createQueue(name)`: สร้าง queue
- `addJob(queueName, payload, options)`: เพิ่ม job
- `processJob(queueName, handler)`: worker process
- `scheduleJob(queueName, payload, runAt)`: schedule job
- `retryFailedJob(jobId)`: retry
- `listFailedJobs(queueName)`: ดู failed jobs
- `cleanupOldJobs(queueName)`: ล้าง job เก่า

### Jobs ที่ควรมี

- ส่ง email
- sync payment status
- sync shipment status
- expire cart
- release expired stock reservation
- generate reports
- cleanup uploads ที่ไม่ถูกใช้งาน

## 19. File Uploads

### Purpose

รองรับรูปสินค้าและไฟล์อื่น ๆ

### Functions ที่ควรมี

- `uploadProductImage(productId, file)`: upload รูปสินค้า
- `validateImageFile(file)`: ตรวจชนิด/ขนาดไฟล์
- `resizeProductImage(file)`: resize/optimize
- `deleteUploadedFile(objectKey)`: ลบไฟล์
- `getPublicUrl(objectKey)`: สร้าง public URL
- `cleanupUnusedUploads()`: ลบไฟล์ที่ไม่ถูกผูกกับ record

### API ที่ควรมี

- `POST /api/admin/products/:productId/image`
- `DELETE /api/admin/uploads/:objectKey`

## 20. Reporting

### Functions ที่ควรมี

- `getSalesReport(range)`: รายงานยอดขาย
- `getProductSalesReport(range)`: รายงานยอดขายตามสินค้า
- `getInventoryReport()`: รายงาน stock
- `getCustomerReport(range)`: รายงานลูกค้า
- `getPromotionReport(range)`: รายงาน promotion
- `getPaymentReport(range)`: รายงาน payment
- `exportReport(type, filter)`: export CSV/XLSX

### API ที่ควรมี

- `GET /api/admin/reports/sales`
- `GET /api/admin/reports/products`
- `GET /api/admin/reports/inventory`
- `GET /api/admin/reports/customers`
- `GET /api/admin/reports/promotions`
- `GET /api/admin/reports/payments`
- `GET /api/admin/reports/export`

## 21. Audit And Security

### Database ที่ควรเพิ่ม

- `audit_logs`
- `admin_activity_logs`
- `api_tokens` ถ้าต้องมี external integration

### Functions ที่ควรมี

- `writeAuditLog(input)`: บันทึก audit
- `listAuditLogs(filter)`: ดู audit logs
- `logAdminActivity(adminId, action, metadata)`: บันทึกกิจกรรม admin
- `rateLimitRequest(key)`: rate limit
- `validateCsrfToken(token)`: CSRF protection ถ้าใช้ cookie auth
- `sanitizeInput(input)`: sanitize input
- `checkPermission(user, action, resource)`: permission check

## 22. Current Implementation Status

### มีแล้วในโปรเจกต์ปัจจุบัน

- Next.js App Router + TypeScript
- PostgreSQL connection และ raw SQL migration
- Health check API
- Catalog listing สำหรับหน้าร้าน
- Admin product create/update/archive
- Product image attach/upload flow
- Guest cart create/update/get
- Checkout เบื้องต้น
- Stock availability calculation
- Stock reservation ตอน checkout
- Order creation และ order items
- Order status log
- Admin order listing และ update status
- Payment table และ payment service เบื้องต้น
- Shipping table และ shipment service เบื้องต้น
- Promotion/coupon table และ get active coupon เบื้องต้น
- JWT helper
- BullMQ/Redis queue wiring

### ยังควรทำต่อ

- Auth API และ admin protection
- Customer account และ address management
- Product detail, category, search/filter/pagination
- Cart remove/update quantity/merge user cart
- Coupon apply ใน checkout
- Payment intent, webhook, refund และ order sync
- Shipment tracking, carrier webhook และ fulfillment sync
- Inventory movement/reservation history
- Admin dashboard/reporting
- Promotion/coupon management UI/API
- Warehouse management
- Notification/email jobs
- Audit logs และ permission system

## 23. Recommended Build Order

ลำดับที่ควรทำต่อเพื่อให้ระบบใช้งานจริงได้เร็ว:

1. Auth: register/login/current user/admin guard
2. Admin protection: ป้องกัน `/admin` และ `/api/admin/*`
3. Product detail + category + search/filter
4. Cart remove/update quantity และ validate cart
5. Coupon apply + checkout preview
6. Payment flow + webhook + mark order paid
7. Shipping flow + tracking + fulfillment status
8. Customer order history
9. Admin dashboard และ reports
10. Background jobs สำหรับ email และ cleanup

## 24. Important Business Rules

- Money ต้องเก็บเป็น integer minor unit เช่น satang สำหรับ THB
- Order item ต้อง snapshot ชื่อสินค้า SKU ราคา และ options เสมอ
- Checkout ต้องตรวจ stock ล่าสุดก่อนสร้าง order
- การ reserve stock ต้องทำใน transaction และ lock row เพื่อกัน oversell
- Payment webhook ต้อง idempotent ด้วย provider + event id
- Cancel/refund ต้องคืน stock หรือ release reservation ตามสถานะ order
- Coupon ต้องตรวจ active period, usage limit และ used count
- Admin action สำคัญควรมี audit log
- API ฝั่ง admin ต้องตรวจ JWT และ role admin ทุก endpoint