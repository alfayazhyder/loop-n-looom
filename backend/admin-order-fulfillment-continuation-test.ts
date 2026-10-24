import {
  spawn,
  type ChildProcess,
} from "node:child_process";

import { prisma } from "./src/lib/prisma";
import { hashPassword } from "./src/utils/password";

const BASE_URL =
  "http://127.0.0.1:5015";

const CUSTOMER_ID =
  "fe580001-1111-4111-8111-111111111111";

const ADMIN_ID =
  "fe580002-2222-4222-8222-222222222222";

const ORDER_ID =
  "fe580003-3333-4333-8333-333333333333";

const ORDER_ITEM_ID =
  "fe580004-4444-4444-8444-444444444444";

const CUSTOMER_EMAIL =
  "fulfillment.runtime.customer@example.com";

const ADMIN_EMAIL =
  "fulfillment.runtime.admin@example.com";

const PASSWORD =
  "Fulfillment123";

const ORDER_NUMBER =
  "LNL-2026-958001";

type CookieJar =
  Record<string, string>;

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(
      `ASSERTION FAILED: ${message}`,
    );
  }
}

function pass(
  message: string,
) {
  console.log(
    `PASS: ${message}`,
  );
}

function getSetCookies(
  headers: Headers,
): string[] {
  const enhanced =
    headers as Headers & {
      getSetCookie?: () => string[];
    };

  if (
    typeof enhanced.getSetCookie ===
    "function"
  ) {
    return enhanced.getSetCookie();
  }

  const raw =
    headers.get(
      "set-cookie",
    );

  if (!raw) {
    return [];
  }

  return raw.split(
    /,(?=\s*[^;,\s]+=)/,
  );
}

function applyCookies(
  jar: CookieJar,
  headers: Headers,
) {
  for (
    const cookie of
    getSetCookies(headers)
  ) {
    const first =
      cookie.split(";")[0];

    const separator =
      first.indexOf("=");

    if (
      separator < 0
    ) {
      continue;
    }

    const name =
      first
        .slice(
          0,
          separator,
        )
        .trim();

    const value =
      first
        .slice(
          separator + 1,
        )
        .trim();

    if (
      value === "" ||
      /Max-Age=0/i.test(
        cookie,
      )
    ) {
      delete jar[name];
    } else {
      jar[name] =
        value;
    }
  }
}

function cookieHeader(
  jar: CookieJar,
) {
  return Object.entries(
    jar,
  )
    .map(
      ([name, value]) =>
        `${name}=${value}`,
    )
    .join("; ");
}

async function api(
  path: string,
  options?: {
    method?: string;
    body?: unknown;
    jar?: CookieJar;
  },
) {
  const headers:
    Record<string, string> =
    {
      Accept:
        "application/json",
    };

  if (
    options?.body !==
    undefined
  ) {
    headers[
      "Content-Type"
    ] =
      "application/json";
  }

  if (
    options?.jar &&
    Object.keys(
      options.jar,
    ).length > 0
  ) {
    headers.Cookie =
      cookieHeader(
        options.jar,
      );
  }

  const response =
    await fetch(
      `${BASE_URL}${path}`,
      {
        method:
          options?.method ??
          "GET",

        headers,

        body:
          options?.body ===
          undefined
            ? undefined
            : JSON.stringify(
                options.body,
              ),
      },
    );

  if (options?.jar) {
    applyCookies(
      options.jar,
      response.headers,
    );
  }

  const text =
    await response.text();

  let body: any =
    null;

  if (text) {
    try {
      body =
        JSON.parse(text);
    } catch {
      body =
        text;
    }
  }

  return {
    status:
      response.status,

    body,
  };
}

async function cleanup() {
  await prisma.notification.deleteMany(
    {
      where: {
        OR: [
          {
            orderId:
              ORDER_ID,
          },
          {
            userId: {
              in: [
                CUSTOMER_ID,
                ADMIN_ID,
              ],
            },
          },
        ],
      },
    },
  );

  await prisma.orderMedia.deleteMany(
    {
      where: {
        orderId:
          ORDER_ID,
      },
    },
  );

  await prisma.orderStatusHistory.deleteMany(
    {
      where: {
        orderId:
          ORDER_ID,
      },
    },
  );

  await prisma.shipment.deleteMany(
    {
      where: {
        orderId:
          ORDER_ID,
      },
    },
  );

  await prisma.orderItem.deleteMany(
    {
      where: {
        orderId:
          ORDER_ID,
      },
    },
  );

  await prisma.payment.deleteMany(
    {
      where: {
        orderId:
          ORDER_ID,
      },
    },
  );

  await prisma.order.deleteMany(
    {
      where: {
        OR: [
          {
            id:
              ORDER_ID,
          },
          {
            orderNumber:
              ORDER_NUMBER,
          },
        ],
      },
    },
  );

  await prisma.refreshSession.deleteMany(
    {
      where: {
        userId: {
          in: [
            CUSTOMER_ID,
            ADMIN_ID,
          ],
        },
      },
    },
  );

  await prisma.user.deleteMany(
    {
      where: {
        id: {
          in: [
            CUSTOMER_ID,
            ADMIN_ID,
          ],
        },
      },
    },
  );
}

async function setup() {
  const passwordHash =
    await hashPassword(
      PASSWORD,
    );

  await prisma.user.createMany(
    {
      data: [
        {
          id:
            CUSTOMER_ID,

          email:
            CUSTOMER_EMAIL,

          passwordHash,

          firstName:
            "Fulfillment",

          lastName:
            "Customer",

          role:
            "CUSTOMER",

          status:
            "ACTIVE",

          emailVerifiedAt:
            new Date(),
        },

        {
          id:
            ADMIN_ID,

          email:
            ADMIN_EMAIL,

          passwordHash,

          firstName:
            "Fulfillment",

          lastName:
            "Admin",

          role:
            "ADMIN",

          status:
            "ACTIVE",

          emailVerifiedAt:
            new Date(),
        },
      ],
    },
  );

  const now =
    Date.now();

  await prisma.order.create(
    {
      data: {
        id:
          ORDER_ID,

        orderNumber:
          ORDER_NUMBER,

        userId:
          CUSTOMER_ID,

        status:
          "QUALITY_CHECK",

        currency:
          "AED",

        customerName:
          "Fulfillment Customer",

        customerEmail:
          CUSTOMER_EMAIL,

        customerPhone:
          "+971501234567",

        shippingRecipientName:
          "Fulfillment Customer",

        shippingPhone:
          "+971501234567",

        shippingEmirate:
          "DUBAI",

        shippingCity:
          "Dubai",

        shippingArea:
          "Jumeirah",

        shippingStreet:
          "Runtime Street",

        shippingBuilding:
          "Runtime Building",

        subtotal:
          150,

        totalAmount:
          150,

        paidAt:
          new Date(
            now -
              4 * 60 * 60 * 1000,
          ),

        estimatedDeliveryAt:
          new Date(
            now +
              3 * 24 * 60 * 60 * 1000,
          ),
      },
    },
  );

  await prisma.orderItem.create(
    {
      data: {
        id:
          ORDER_ITEM_ID,

        orderId:
          ORDER_ID,

        itemType:
          "PRODUCT",

        productName:
          "Runtime Crochet Bouquet",

        variantName:
          "Runtime Variant",

        sku:
          "RT-FUL-958",

        unitPrice:
          150,

        quantity:
          1,

        subtotal:
          150,

        fulfillmentType:
          "MADE_TO_ORDER",

        productionMinDays:
          5,

        productionMaxDays:
          10,
      },
    },
  );

  await prisma.orderStatusHistory.createMany(
    {
      data: [
        {
          orderId:
            ORDER_ID,

          status:
            "PAID",

          note:
            "Runtime payment completed.",

          createdByUserId:
            ADMIN_ID,

          createdAt:
            new Date(
              now -
                4 * 60 * 60 * 1000,
            ),
        },

        {
          orderId:
            ORDER_ID,

          status:
            "CONFIRMED",

          note:
            "Runtime order confirmed.",

          createdByUserId:
            ADMIN_ID,

          createdAt:
            new Date(
              now -
                3 * 60 * 60 * 1000,
            ),
        },

        {
          orderId:
            ORDER_ID,

          status:
            "IN_PRODUCTION",

          note:
            "Runtime production started.",

          createdByUserId:
            ADMIN_ID,

          createdAt:
            new Date(
              now -
                2 * 60 * 60 * 1000,
            ),
        },

        {
          orderId:
            ORDER_ID,

          status:
            "QUALITY_CHECK",

          note:
            "Runtime quality check.",

          createdByUserId:
            ADMIN_ID,

          createdAt:
            new Date(
              now -
                60 * 60 * 1000,
            ),
        },
      ],
    },
  );

  await prisma.orderMedia.createMany(
    {
      data: [
        {
          orderId:
            ORDER_ID,

          type:
            "QUALITY_CHECK_PHOTO",

          url:
            "https://example.com/qc-runtime-1.jpg",

          caption:
            "Runtime QC photo one",
        },

        {
          orderId:
            ORDER_ID,

          type:
            "QUALITY_CHECK_PHOTO",

          url:
            "https://example.com/qc-runtime-2.jpg",

          caption:
            "Runtime QC photo two",
        },
      ],
    },
  );

  pass(
    "fresh QUALITY_CHECK fixture created with two QC photos",
  );
}

async function startServer():
  Promise<ChildProcess> {
  const child =
    spawn(
      process.execPath,
      [
        "--import",
        "tsx",
        "src/server.ts",
      ],
      {
        cwd:
          process.cwd(),

        env: {
          ...process.env,

          PORT:
            "5015",

          EMAIL_MODE:
            "console",
        },

        stdio: [
          "ignore",
          "pipe",
          "pipe",
        ],
      },
    );

  await new Promise<void>(
    (
      resolve,
      reject,
    ) => {
      const timeout =
        setTimeout(
          () => {
            reject(
              new Error(
                "Temporary fulfillment server did not start.",
              ),
            );
          },
          15000,
        );

      child.stdout?.on(
        "data",
        (chunk) => {
          const output =
            chunk.toString();

          if (
            output.includes(
              "backend running",
            )
          ) {
            clearTimeout(
              timeout,
            );

            resolve();
          }
        },
      );

      child.stderr?.on(
        "data",
        (chunk) => {
          process.stderr.write(
            chunk,
          );
        },
      );

      child.once(
        "exit",
        (code) => {
          clearTimeout(
            timeout,
          );

          reject(
            new Error(
              `Temporary fulfillment server exited early with code ${code}.`,
            ),
          );
        },
      );
    },
  );

  return child;
}

async function login(
  email: string,
) {
  const jar:
    CookieJar = {};

  const result =
    await api(
      "/api/auth/login",
      {
        method:
          "POST",

        jar,

        body: {
          email,
          password:
            PASSWORD,
        },
      },
    );

  assert(
    result.status ===
      200,
    `Login failed for ${email}`,
  );

  return jar;
}

async function run() {
  const server =
    await startServer();

  try {
    const customer =
      await login(
        CUSTOMER_EMAIL,
      );

    const admin =
      await login(
        ADMIN_EMAIL,
      );


    console.log(
      "\n=== CUSTOMER SEES QC PHOTOS ===",
    );

    const customerQc =
      await api(
        `/api/customer/orders/${ORDER_ID}`,
        {
          jar:
            customer,
        },
      );

    assert(
      customerQc.status ===
        200,
      "Customer order detail should load",
    );

    /*
     * IMPORTANT:
     * Customer order detail is returned DIRECTLY.
     * There is no result.body.order wrapper.
     */
    assert(
      customerQc.body.status ===
        "QUALITY_CHECK",
      "Customer should see QUALITY_CHECK status",
    );

    assert(
      Array.isArray(
        customerQc.body.media,
      ),
      "Customer order media should be an array",
    );

    assert(
      customerQc.body.media
        .length === 2,
      "Customer should see both QC photos",
    );

    assert(
      customerQc.body.media.every(
        (media: any) =>
          media.type ===
          "QUALITY_CHECK_PHOTO",
      ),
      "Customer-visible order media should contain QC photos",
    );

    pass(
      "customer order detail exposes QC photos correctly",
    );


    console.log(
      "\n=== REMOVE ONE QC PHOTO ===",
    );

    const firstPhotoId =
      customerQc.body
        .media[0].id;

    const deletePhoto =
      await api(
        `/api/admin/orders/${ORDER_ID}/qc-photos/${firstPhotoId}`,
        {
          method:
            "DELETE",

          jar:
            admin,
        },
      );

    assert(
      deletePhoto.status ===
        200,
      "Admin should remove QC photo during QUALITY_CHECK",
    );

    const remainingQc =
      await prisma.orderMedia.findMany(
        {
          where: {
            orderId:
              ORDER_ID,

            type:
              "QUALITY_CHECK_PHOTO",
          },
        },
      );

    assert(
      remainingQc.length ===
        1,
      "Exactly one QC photo should remain",
    );

    pass(
      "QC photo removal works during QUALITY_CHECK",
    );


    console.log(
      "\n=== READY FOR PACKING ===",
    );

    const ready =
      await api(
        `/api/admin/orders/${ORDER_ID}/status`,
        {
          method:
            "PATCH",

          jar:
            admin,

          body: {
            status:
              "READY_FOR_PACKING",

            note:
              "Runtime QC approved.",
          },
        },
      );

    assert(
      ready.status ===
        200,
      "QUALITY_CHECK to READY_FOR_PACKING should succeed",
    );

    assert(
      ready.body.order
        .status ===
        "READY_FOR_PACKING",
      "Admin response should show READY_FOR_PACKING",
    );

    pass(
      "QC-approved order can move to READY_FOR_PACKING",
    );


    console.log(
      "\n=== QC PHOTO LOCK AFTER QC ===",
    );

    const lockedDelete =
      await api(
        `/api/admin/orders/${ORDER_ID}/qc-photos/${remainingQc[0].id}`,
        {
          method:
            "DELETE",

          jar:
            admin,
        },
      );

    assert(
      lockedDelete.status ===
        409,
      "QC photo deletion must be blocked after QUALITY_CHECK",
    );

    const lockedAdd =
      await api(
        `/api/admin/orders/${ORDER_ID}/qc-photos`,
        {
          method:
            "POST",

          jar:
            admin,

          body: {
            photos: [
              {
                url:
                  "https://example.com/late-qc-photo.jpg",
              },
            ],
          },
        },
      );

    assert(
      lockedAdd.status ===
        409,
      "Adding QC photos must be blocked after QUALITY_CHECK",
    );

    pass(
      "QC photos are protected after quality check",
    );


    console.log(
      "\n=== PACK ORDER ===",
    );

    const packed =
      await api(
        `/api/admin/orders/${ORDER_ID}/status`,
        {
          method:
            "PATCH",

          jar:
            admin,

          body: {
            status:
              "PACKED",

            note:
              "Runtime packing completed.",
          },
        },
      );

    assert(
      packed.status ===
        200,
      "READY_FOR_PACKING to PACKED should succeed",
    );

    assert(
      packed.body.order
        .status ===
        "PACKED",
      "Order should be PACKED",
    );

    assert(
      packed.body.order
        .shipment !==
        null,
      "Packing should create shipment",
    );

    assert(
      packed.body.order
        .shipment.status ===
        "READY_FOR_PICKUP",
      "Packed shipment should be READY_FOR_PICKUP",
    );

    pass(
      "packing creates shipment ready for pickup",
    );


    console.log(
      "\n=== ADD COURIER + TRACKING ===",
    );

    const deliveryEstimate =
      new Date(
        Date.now() +
          2 * 24 * 60 * 60 * 1000,
      );

    const tracking =
      await api(
        `/api/admin/orders/${ORDER_ID}/shipment`,
        {
          method:
            "PUT",

          jar:
            admin,

          body: {
            courier:
              "Runtime Courier",

            trackingNumber:
              "RT958001",

            trackingUrl:
              "https://example.com/track/RT958001",

            estimatedDeliveryAt:
              deliveryEstimate.toISOString(),
          },
        },
      );

    assert(
      tracking.status ===
        200,
      "Shipment tracking update should succeed",
    );

    assert(
      tracking.body.order
        .shipment.courier ===
        "Runtime Courier",
      "Courier should persist",
    );

    assert(
      tracking.body.order
        .shipment.trackingNumber ===
        "RT958001",
      "Tracking number should persist",
    );

    assert(
      tracking.body.order
        .shipment.trackingUrl ===
        "https://example.com/track/RT958001",
      "Tracking URL should persist",
    );

    assert(
      tracking.body.order
        .estimatedDeliveryAt !==
        null,
      "Order delivery estimate should synchronize",
    );

    pass(
      "courier, tracking and estimated delivery update work",
    );


    console.log(
      "\n=== OUT FOR DELIVERY VIA SHIPMENT ===",
    );

    const outForDelivery =
      await api(
        `/api/admin/orders/${ORDER_ID}/shipment`,
        {
          method:
            "PUT",

          jar:
            admin,

          body: {
            status:
              "OUT_FOR_DELIVERY",
          },
        },
      );

    assert(
      outForDelivery.status ===
        200,
      "Shipment should move OUT_FOR_DELIVERY",
    );

    assert(
      outForDelivery.body.order
        .status ===
        "OUT_FOR_DELIVERY",
      "Shipment change should synchronize order status",
    );

    assert(
      outForDelivery.body.order
        .shipment.status ===
        "OUT_FOR_DELIVERY",
      "Shipment status should be OUT_FOR_DELIVERY",
    );

    assert(
      outForDelivery.body.order
        .shipment.outForDeliveryAt !==
        null,
      "Shipment should record outForDeliveryAt",
    );

    pass(
      "shipment OUT_FOR_DELIVERY synchronizes order and timestamp",
    );


    console.log(
      "\n=== CUSTOMER SEES TRACKING ===",
    );

    const customerTracking =
      await api(
        `/api/customer/orders/${ORDER_ID}`,
        {
          jar:
            customer,
        },
      );

    assert(
      customerTracking.status ===
        200,
      "Customer order detail should load after shipping",
    );

    assert(
      customerTracking.body.status ===
        "OUT_FOR_DELIVERY",
      "Customer should see OUT_FOR_DELIVERY status",
    );

    assert(
      customerTracking.body.shipment !==
        null,
      "Customer should see shipment",
    );

    assert(
      customerTracking.body.shipment
        .status ===
        "OUT_FOR_DELIVERY",
      "Customer should see OUT_FOR_DELIVERY shipment",
    );

    assert(
      customerTracking.body.shipment
        .courier ===
        "Runtime Courier",
      "Customer should see courier",
    );

    assert(
      customerTracking.body.shipment
        .trackingNumber ===
        "RT958001",
      "Customer should see tracking number",
    );

    assert(
      customerTracking.body.media
        .length === 1,
      "Customer should retain final QC photo",
    );

    assert(
      customerTracking.body.tracking !==
        null &&
      typeof customerTracking.body
        .tracking ===
        "object" &&
      Array.isArray(
        customerTracking.body
          .tracking.events,
      ) &&
      customerTracking.body
        .tracking.events.some(
          (entry: any) =>
            entry.status ===
            "OUT_FOR_DELIVERY",
        ),
      "Customer order detail should expose tracking timeline",
    );

    pass(
      "customer receives synchronized shipment and tracking details",
    );


    console.log(
      "\n=== AUTHENTICATED PUBLIC TRACKING ===",
    );

    const publicTracking =
      await api(
        `/api/orders/track?orderNumber=${encodeURIComponent(ORDER_NUMBER)}`,
        {
          jar:
            customer,
        },
      );

    assert(
      publicTracking.status ===
        200,
      "Authenticated tracking endpoint should load",
    );

    assert(
      publicTracking.body.status ===
        "OUT_FOR_DELIVERY",
      "Tracking endpoint should show OUT_FOR_DELIVERY",
    );

    assert(
      publicTracking.body.shipment
        .trackingNumber ===
        "RT958001",
      "Tracking endpoint should expose tracking number",
    );

    pass(
      "existing customer tracking endpoint reflects fulfillment state",
    );


    console.log(
      "\n=== DELIVER ORDER VIA SHIPMENT ===",
    );

    const delivered =
      await api(
        `/api/admin/orders/${ORDER_ID}/shipment`,
        {
          method:
            "PUT",

          jar:
            admin,

          body: {
            status:
              "DELIVERED",
          },
        },
      );

    assert(
      delivered.status ===
        200,
      "Shipment should move to DELIVERED",
    );

    assert(
      delivered.body.order
        .status ===
        "DELIVERED",
      "Order should synchronize to DELIVERED",
    );

    assert(
      delivered.body.order
        .shipment.status ===
        "DELIVERED",
      "Shipment should be DELIVERED",
    );

    assert(
      delivered.body.order
        .deliveredAt !==
        null,
      "Order should record deliveredAt",
    );

    assert(
      delivered.body.order
        .shipment.deliveredAt !==
        null,
      "Shipment should record deliveredAt",
    );

    pass(
      "delivery synchronizes order, shipment and timestamps",
    );


    console.log(
      "\n=== CUSTOMER SEES FINAL DELIVERED STATE ===",
    );

    const finalCustomer =
      await api(
        `/api/customer/orders/${ORDER_ID}`,
        {
          jar:
            customer,
        },
      );

    assert(
      finalCustomer.status ===
        200,
      "Final customer detail should load",
    );

    assert(
      finalCustomer.body.status ===
        "DELIVERED",
      "Customer should see DELIVERED order",
    );

    assert(
      finalCustomer.body.shipment
        .status ===
        "DELIVERED",
      "Customer should see DELIVERED shipment",
    );

    assert(
      finalCustomer.body.deliveredAt !==
        null,
      "Customer should see delivery timestamp",
    );

    assert(
      finalCustomer.body.media
        .length === 1,
      "Customer should still see final QC photo",
    );

    pass(
      "customer sees final delivered fulfillment state",
    );


    console.log(
      "\n=== FINAL TRACKING HISTORY ===",
    );

    const histories =
      await prisma.orderStatusHistory.findMany(
        {
          where: {
            orderId:
              ORDER_ID,
          },

          orderBy: {
            createdAt:
              "asc",
          },
        },
      );

    const statuses =
      histories.map(
        (entry) =>
          entry.status,
      );

    for (
      const expected of
      [
        "PAID",
        "CONFIRMED",
        "IN_PRODUCTION",
        "QUALITY_CHECK",
        "READY_FOR_PACKING",
        "PACKED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
      ]
    ) {
      assert(
        statuses.includes(
          expected as any,
        ),
        `History should contain ${expected}`,
      );
    }

    assert(
      histories.length ===
        8,
      "Exactly eight runtime tracking history entries should exist",
    );

    pass(
      "complete fulfillment history is preserved",
    );


    console.log(
      "\n=== STATUS NOTIFICATIONS ===",
    );

    const notifications =
      await prisma.notification.findMany(
        {
          where: {
            orderId:
              ORDER_ID,
          },
        },
      );

    /*
     * Four successful runtime transitions:
     * READY_FOR_PACKING
     * PACKED
     * OUT_FOR_DELIVERY
     * DELIVERED
     *
     * Each queues EMAIL + WHATSAPP.
     */
    assert(
      notifications.length ===
        8,
      "Four fulfillment transitions should queue eight notifications",
    );

    assert(
      notifications.filter(
        (notification) =>
          notification.channel ===
          "EMAIL",
      ).length === 4,
      "Four email notifications should be queued",
    );

    assert(
      notifications.filter(
        (notification) =>
          notification.channel ===
          "WHATSAPP",
      ).length === 4,
      "Four WhatsApp notifications should be queued",
    );

    assert(
      notifications.every(
        (notification) =>
          notification.status ===
          "QUEUED",
      ),
      "Runtime fulfillment notifications should remain queued",
    );

    pass(
      "fulfillment status changes queue email and WhatsApp notifications",
    );


    console.log(
      "\n=== ADMIN QUEUE FINAL STATE ===",
    );

    const finalQueue =
      await api(
        `/api/admin/orders?status=DELIVERED&search=${encodeURIComponent(ORDER_NUMBER)}&page=1&limit=20`,
        {
          jar:
            admin,
        },
      );

    assert(
      finalQueue.status ===
        200,
      "Delivered admin queue should load",
    );

    assert(
      finalQueue.body.pagination
        .total === 1,
      "Delivered queue should find runtime order",
    );

    assert(
      finalQueue.body.orders
        .length === 1,
      "Delivered queue should contain one runtime order",
    );

    assert(
      finalQueue.body.orders[0]
        .status ===
        "DELIVERED",
      "Admin queue should show final delivered status",
    );

    pass(
      "admin queue reflects final delivered state",
    );


    console.log(
      "\nALL FULFILLMENT CONTINUATION TESTS PASSED",
    );
  } finally {
    server.kill();

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          500,
        ),
    );
  }
}

async function main() {
  let succeeded =
    false;

  try {
    console.log(
      "\n=== CONTINUATION PRE-CLEANUP ===",
    );

    await cleanup();

    pass(
      "old continuation fixtures removed",
    );

    await setup();

    const serverCheck =
      await prisma.order.findUnique(
        {
          where: {
            id:
              ORDER_ID,
          },

          select: {
            status: true,
          },
        },
      );

    assert(
      serverCheck?.status ===
        "QUALITY_CHECK",
      "Fresh fixture must start in QUALITY_CHECK",
    );

    await run();

    succeeded =
      true;
  } catch (error) {
    console.error(
      "\nFULFILLMENT CONTINUATION TEST FAILED",
    );

    console.error(
      error,
    );

    process.exitCode =
      1;
  } finally {
    console.log(
      "\n=== CONTINUATION FINAL CLEANUP ===",
    );

    try {
      await cleanup();

      const [
        users,
        orders,
        items,
        histories,
        media,
        shipments,
        notifications,
        sessions,
      ] =
        await Promise.all([
          prisma.user.count(
            {
              where: {
                id: {
                  in: [
                    CUSTOMER_ID,
                    ADMIN_ID,
                  ],
                },
              },
            },
          ),

          prisma.order.count(
            {
              where: {
                id:
                  ORDER_ID,
              },
            },
          ),

          prisma.orderItem.count(
            {
              where: {
                orderId:
                  ORDER_ID,
              },
            },
          ),

          prisma.orderStatusHistory.count(
            {
              where: {
                orderId:
                  ORDER_ID,
              },
            },
          ),

          prisma.orderMedia.count(
            {
              where: {
                orderId:
                  ORDER_ID,
              },
            },
          ),

          prisma.shipment.count(
            {
              where: {
                orderId:
                  ORDER_ID,
              },
            },
          ),

          prisma.notification.count(
            {
              where: {
                orderId:
                  ORDER_ID,
              },
            },
          ),

          prisma.refreshSession.count(
            {
              where: {
                userId: {
                  in: [
                    CUSTOMER_ID,
                    ADMIN_ID,
                  ],
                },
              },
            },
          ),
        ]);

      console.log(
        `leftovers users=${users} orders=${orders} items=${items} histories=${histories} media=${media} shipments=${shipments} notifications=${notifications} sessions=${sessions}`,
      );

      assert(
        users === 0 &&
        orders === 0 &&
        items === 0 &&
        histories === 0 &&
        media === 0 &&
        shipments === 0 &&
        notifications === 0 &&
        sessions === 0,
        "All continuation fixtures must be removed",
      );

      pass(
        "all continuation fixtures removed",
      );
    } catch (error) {
      console.error(
        "CONTINUATION CLEANUP FAILED",
      );

      console.error(
        error,
      );

      process.exitCode =
        1;
    }

    await prisma.$disconnect();
  }

  if (
    succeeded &&
    process.exitCode !==
      1
  ) {
    console.log(
      "\nFULFILLMENT CONTINUATION SUITE SUCCESS",
    );
  }
}

void main();
