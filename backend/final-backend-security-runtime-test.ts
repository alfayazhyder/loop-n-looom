import {
  spawn,
  type ChildProcess,
} from "node:child_process";

import {
  createServer as createNetServer,
} from "node:net";

import { prisma } from "./src/lib/prisma";
import { hashPassword } from "./src/utils/password";
import { env } from "./src/config/env";

const ADMIN_ID =
  "fe700001-1111-4111-8111-111111111111";

const CUSTOMER_ID =
  "fe700002-2222-4222-8222-222222222222";

const ADMIN_EMAIL =
  "security970.admin@example.com";

const CUSTOMER_EMAIL =
  "security970.customer@example.com";

const PASSWORD =
  "SecurityRuntime970!";

const FRONTEND_ORIGIN =
  new URL(env.FRONTEND_URL).origin;

const BAD_ORIGIN =
  "https://malicious-security-test.example";

const PAYMENT_ID =
  "00000000-0000-4000-8000-000000000000";

type CookieJar = Record<string, string>;

let baseUrl = "";

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

function pass(message: string) {
  console.log(`PASS: ${message}`);
}

function cookiesFromHeaders(
  headers: Headers,
): string[] {
  const enhanced = headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (
    typeof enhanced.getSetCookie ===
    "function"
  ) {
    return enhanced.getSetCookie();
  }

  return (headers.get("set-cookie") ?? "")
    .split(/,(?=\s*[^;,\s]+=)/)
    .filter(Boolean);
}

function saveCookies(
  jar: CookieJar,
  headers: Headers,
) {
  for (
    const cookie of
    cookiesFromHeaders(headers)
  ) {
    const first = cookie.split(";")[0];
    const separator = first.indexOf("=");

    if (separator < 0) {
      continue;
    }

    const name =
      first.slice(0, separator).trim();

    const value =
      first.slice(separator + 1).trim();

    if (
      !value ||
      /Max-Age=0/i.test(cookie)
    ) {
      delete jar[name];
    } else {
      jar[name] = value;
    }
  }
}

async function api(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    jar?: CookieJar;
    origin?: string;
    rawCookie?: string;
  } = {},
) {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] =
      "application/json";
  }

  if (options.origin !== undefined) {
    headers.Origin = options.origin;
  }

  if (options.rawCookie !== undefined) {
    headers.Cookie = options.rawCookie;
  } else if (
    options.jar &&
    Object.keys(options.jar).length > 0
  ) {
    headers.Cookie =
      Object.entries(options.jar)
        .map(
          ([name, value]) =>
            `${name}=${value}`,
        )
        .join("; ");
  }

  const response = await fetch(
    `${baseUrl}${path}`,
    {
      method: options.method ?? "GET",
      headers,
      body:
        options.body === undefined
          ? undefined
          : JSON.stringify(options.body),
    },
  );

  if (options.jar) {
    saveCookies(
      options.jar,
      response.headers,
    );
  }

  const responseText =
    await response.text();

  let body: any = null;

  if (responseText) {
    try {
      body = JSON.parse(responseText);
    } catch {
      body = responseText;
    }
  }

  return {
    status: response.status,
    body,
    headers: response.headers,
    setCookies:
      cookiesFromHeaders(response.headers),
  };
}

function expectStatus(
  result: {
    status: number;
    body: unknown;
  },
  expected: number,
  description: string,
) {
  assert(
    result.status === expected,
    `${description}: expected HTTP ${expected}, received ${result.status}; body=${JSON.stringify(result.body)}`,
  );
}

async function allocatePort(): Promise<number> {
  return new Promise(
    (resolve, reject) => {
      const server =
        createNetServer();

      server.once(
        "error",
        reject,
      );

      server.listen(
        0,
        "127.0.0.1",
        () => {
          const address =
            server.address();

          if (
            !address ||
            typeof address === "string"
          ) {
            server.close();

            reject(
              new Error(
                "Could not allocate test port.",
              ),
            );

            return;
          }

          const port =
            address.port;

          server.close(
            () => resolve(port),
          );
        },
      );
    },
  );
}

async function startServer(
  mode: "development" | "production",
): Promise<ChildProcess> {
  const port =
    await allocatePort();

  baseUrl =
    `http://127.0.0.1:${port}`;

  const child = spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      "src/server.ts",
    ],
    {
      cwd: process.cwd(),

      env: {
        ...process.env,
        NODE_ENV: mode,
        PORT: String(port),
      },

      stdio: [
        "ignore",
        "pipe",
        "pipe",
      ],
    },
  );

  let output = "";

  child.stdout?.on(
    "data",
    (chunk) => {
      output += String(chunk);
    },
  );

  child.stderr?.on(
    "data",
    (chunk) => {
      output += String(chunk);
    },
  );

  for (
    let attempt = 0;
    attempt < 100;
    attempt++
  ) {
    if (
      child.exitCode !== null
    ) {
      throw new Error(
        `${mode} server exited unexpectedly:\n${output}`,
      );
    }

    try {
      const response = await fetch(
        `${baseUrl}/`,
      );

      if (response.status === 200) {
        return child;
      }

    } catch {
      // Wait until the HTTP server is ready.
    }

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          200,
        ),
    );
  }

  child.kill();

  throw new Error(
    `${mode} server failed to start:\n${output}`,
  );
}

async function stopServer(
  child: ChildProcess,
) {
  if (
    child.exitCode === null &&
    !child.killed
  ) {
    child.kill();
  }

  await new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        500,
      ),
  );
}

async function login(
  email: string,
  origin?: string,
) {
  const jar: CookieJar = {};

  const result = await api(
    "/api/auth/login",
    {
      method: "POST",
      body: {
        email,
        password: PASSWORD,
      },
      jar,
      origin,
    },
  );

  expectStatus(
    result,
    200,
    `Login ${email}`,
  );

  assert(
    Object.keys(jar).length > 0,
    "Login must issue cookies.",
  );

  return {
    jar,
    setCookies: result.setCookies,
  };
}

async function cleanup() {
  await prisma.auditLog.deleteMany({
    where: {
      actorUserId: {
        in: [
          ADMIN_ID,
          CUSTOMER_ID,
        ],
      },
    },
  });

  await prisma.refreshSession.deleteMany({
    where: {
      userId: {
        in: [
          ADMIN_ID,
          CUSTOMER_ID,
        ],
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      id: {
        in: [
          ADMIN_ID,
          CUSTOMER_ID,
        ],
      },
    },
  });
}

async function setup() {
  const passwordHash =
    await hashPassword(PASSWORD);

  await prisma.user.createMany({
    data: [
      {
        id: ADMIN_ID,
        email: ADMIN_EMAIL,
        passwordHash,
        role: "ADMIN",
        status: "ACTIVE",
        firstName: "Security",
        lastName: "Administrator",
        emailVerifiedAt: new Date(),
      },
      {
        id: CUSTOMER_ID,
        email: CUSTOMER_EMAIL,
        passwordHash,
        role: "CUSTOMER",
        status: "ACTIVE",
        firstName: "Security",
        lastName: "Customer",
        emailVerifiedAt: new Date(),
      },
    ],
  });

  pass(
    "isolated admin and customer fixtures created",
  );
}

async function testDevelopmentSecurity() {
  console.log(
    "\n=== DEVELOPMENT SERVER SECURITY ===",
  );

  const server =
    await startServer("development");

  try {
    const admin =
      await login(ADMIN_EMAIL);

    const customer =
      await login(CUSTOMER_EMAIL);

    console.log(
      "\n=== AUTHENTICATION AND RBAC ===",
    );

    const anonymous =
      await api("/api/admin/access-check");

    expectStatus(
      anonymous,
      401,
      "Anonymous admin access",
    );

    const customerDenied =
      await api(
        "/api/admin/access-check",
        {
          jar: customer.jar,
        },
      );

    expectStatus(
      customerDenied,
      403,
      "Customer admin access",
    );

    const adminAllowed =
      await api(
        "/api/admin/access-check",
        {
          jar: admin.jar,
        },
      );

    expectStatus(
      adminAllowed,
      200,
      "Admin access",
    );

    pass(
      "authentication and admin RBAC enforced",
    );

    console.log(
      "\n=== LIVE DATABASE ROLE CHECK ===",
    );

    await prisma.user.update({
      where: { id: ADMIN_ID },
      data: { role: "CUSTOMER" },
    });

    const demoted =
      await api(
        "/api/admin/access-check",
        {
          jar: admin.jar,
        },
      );

    expectStatus(
      demoted,
      403,
      "Demoted administrator",
    );

    await prisma.user.update({
      where: { id: ADMIN_ID },
      data: { role: "ADMIN" },
    });

    const restored =
      await api(
        "/api/admin/access-check",
        {
          jar: admin.jar,
        },
      );

    expectStatus(
      restored,
      200,
      "Restored administrator",
    );

    pass(
      "admin authorization follows current database role",
    );

    console.log(
      "\n=== ADMIN MODULE INTEGRATION ===",
    );

    const endpoints = [
      "/api/admin/customers",
      "/api/admin/reviews",
      "/api/admin/coupons",
      "/api/admin/newsletter-subscribers",
      "/api/admin/analytics/overview",
      "/api/admin/reports/orders",
      "/api/admin/reports/products",
      "/api/admin/reports/coupons",
      "/api/admin/orders",
    ];

    for (const endpoint of endpoints) {
      const result =
        await api(
          endpoint,
          {
            jar: admin.jar,
          },
        );

      expectStatus(
        result,
        200,
        `Integration: ${endpoint}`,
      );

      assert(
        result.headers.get(
          "cache-control",
        ) === "no-store",
        `Admin response must disable caching: ${endpoint}`,
      );

      console.log(
        `PASS: ${endpoint}`,
      );
    }

    pass(
      "customer, review, marketing, analytics, reporting and order modules integrated",
    );

    console.log(
      "\n=== CROSS-ORIGIN MUTATION PROTECTION ===",
    );

    const invalidMutation =
      "/api/admin/customers/not-a-uuid/status";

    const badOrigin =
      await api(
        invalidMutation,
        {
          method: "PATCH",
          jar: admin.jar,
          origin: BAD_ORIGIN,
          body: {
            status: "ACTIVE",
          },
        },
      );

    expectStatus(
      badOrigin,
      403,
      "Malicious request origin",
    );

    const allowedOrigin =
      await api(
        invalidMutation,
        {
          method: "PATCH",
          jar: admin.jar,
          origin: FRONTEND_ORIGIN,
          body: {
            status: "ACTIVE",
          },
        },
      );

    expectStatus(
      allowedOrigin,
      400,
      "Allowed frontend origin",
    );

    const missingOriginDevelopment =
      await api(
        invalidMutation,
        {
          method: "PATCH",
          jar: admin.jar,
          body: {
            status: "ACTIVE",
          },
        },
      );

    expectStatus(
      missingOriginDevelopment,
      400,
      "Development request without Origin",
    );

    pass(
      "malicious origins blocked and valid development requests preserved",
    );

    console.log(
      "\n=== PAYMENT SIMULATOR DEVELOPMENT ACCESS ===",
    );

    const developmentSimulator =
      await api(
        `/api/payments/${PAYMENT_ID}/simulate`,
        {
          method: "POST",
          body: {},
        },
      );

    assert(
      developmentSimulator.status !== 404,
      "Development payment simulator must remain registered.",
    );

    pass(
      "development payment simulator route remains available",
    );

    console.log(
      "\n=== ADMIN RATE LIMITING ===",
    );

    let rateLimited = false;

    for (
      let attempt = 1;
      attempt <= 270;
      attempt++
    ) {
      const result =
        await api(
          "/api/admin/access-check",
          {
            jar: admin.jar,
          },
        );

      if (result.status === 429) {
        rateLimited = true;

        assert(
          result.headers.has(
            "retry-after",
          ),
          "Rate-limited response must include Retry-After.",
        );

        break;
      }

      expectStatus(
        result,
        200,
        `Admin request ${attempt}`,
      );

      if (attempt % 60 === 0) {
        console.log(
          `Verified ${attempt} additional admin requests`,
        );
      }
    }

    assert(
      rateLimited,
      "Admin rate limiter must return HTTP 429.",
    );

    pass(
      "admin rate limiter enforces request limits",
    );

    console.log(
      "\nDEVELOPMENT SECURITY TESTS PASSED",
    );

  } finally {
    await stopServer(server);
  }
}

async function testProductionSecurity() {
  console.log(
    "\n=== PRODUCTION SERVER SECURITY ===",
  );

  const server =
    await startServer("production");

  try {
    console.log(
      "\n=== PRODUCTION PAYMENT SIMULATOR BLOCK ===",
    );

    const blockedSimulator =
      await api(
        `/api/payments/${PAYMENT_ID}/simulate`,
        {
          method: "POST",
          body: {},
        },
      );

    expectStatus(
      blockedSimulator,
      404,
      "Production payment simulation",
    );

    pass(
      "payment simulator unavailable in production",
    );

    console.log(
      "\n=== PRODUCTION SECURE COOKIE FLAGS ===",
    );

    const admin =
      await login(
        ADMIN_EMAIL,
        FRONTEND_ORIGIN,
      );

    const secureCookies =
      admin.setCookies.filter(
        (cookie) =>
          /HttpOnly/i.test(cookie) &&
          /Secure/i.test(cookie) &&
          /SameSite=None/i.test(cookie),
      );

    assert(
      secureCookies.length > 0,
      "Production authentication cookies require HttpOnly, Secure and SameSite=None.",
    );

    pass(
      "production authentication cookies have secure flags",
    );

    console.log(
      "\n=== PRODUCTION ORIGIN ENFORCEMENT ===",
    );

    const mutation =
      "/api/admin/customers/not-a-uuid/status";

    const missingOrigin =
      await api(
        mutation,
        {
          method: "PATCH",
          jar: admin.jar,
          body: {
            status: "ACTIVE",
          },
        },
      );

    expectStatus(
      missingOrigin,
      403,
      "Production mutation without Origin",
    );

    const maliciousOrigin =
      await api(
        mutation,
        {
          method: "PATCH",
          jar: admin.jar,
          origin: BAD_ORIGIN,
          body: {
            status: "ACTIVE",
          },
        },
      );

    expectStatus(
      maliciousOrigin,
      403,
      "Production mutation with malicious Origin",
    );

    const validOrigin =
      await api(
        mutation,
        {
          method: "PATCH",
          jar: admin.jar,
          origin: FRONTEND_ORIGIN,
          body: {
            status: "ACTIVE",
          },
        },
      );

    expectStatus(
      validOrigin,
      400,
      "Production mutation with allowed Origin",
    );

    pass(
      "production cookie-authenticated mutations require trusted Origin",
    );

    console.log(
      "\n=== PRODUCTION SIMULATOR BLOCK WITH AUTHENTICATION ===",
    );

    const authenticatedSimulation =
      await api(
        `/api/payments/${PAYMENT_ID}/simulate`,
        {
          method: "POST",
          jar: admin.jar,
          origin: FRONTEND_ORIGIN,
          body: {},
        },
      );

    expectStatus(
      authenticatedSimulation,
      404,
      "Authenticated production payment simulation",
    );

    pass(
      "production simulator cannot be accessed with admin authentication",
    );

    console.log(
      "\nPRODUCTION SECURITY TESTS PASSED",
    );

  } finally {
    await stopServer(server);
  }
}

async function main() {
  let successful = false;

  try {
    console.log(
      "\n=== PRE-TEST CLEANUP ===",
    );

    await cleanup();

    pass(
      "previous security test fixtures cleared",
    );

    console.log(
      "\n=== TEST FIXTURE SETUP ===",
    );

    await setup();

    await testDevelopmentSecurity();

    await testProductionSecurity();

    successful = true;

    console.log(
      "\nALL FINAL BACKEND SECURITY TESTS PASSED",
    );

  } catch (error) {
    console.error(
      "\nFINAL BACKEND SECURITY TEST FAILED",
    );

    console.error(error);

    process.exitCode = 1;

  } finally {
    console.log(
      "\n=== FINAL DATABASE CLEANUP ===",
    );

    try {
      await cleanup();

      const [
        users,
        sessions,
        audits,
      ] = await Promise.all([
        prisma.user.count({
          where: {
            id: {
              in: [
                ADMIN_ID,
                CUSTOMER_ID,
              ],
            },
          },
        }),

        prisma.refreshSession.count({
          where: {
            userId: {
              in: [
                ADMIN_ID,
                CUSTOMER_ID,
              ],
            },
          },
        }),

        prisma.auditLog.count({
          where: {
            actorUserId: {
              in: [
                ADMIN_ID,
                CUSTOMER_ID,
              ],
            },
          },
        }),
      ]);

      console.log(
        `leftovers users=${users} sessions=${sessions} audits=${audits}`,
      );

      assert(
        users === 0 &&
        sessions === 0 &&
        audits === 0,
        "All security test fixtures must be removed.",
      );

      pass(
        "all security fixtures removed",
      );

    } catch (error) {
      console.error(
        "SECURITY TEST CLEANUP FAILED",
      );

      console.error(error);

      process.exitCode = 1;
    }

    await prisma.$disconnect();
  }

  if (
    successful &&
    process.exitCode !== 1
  ) {
    console.log(
      "\nFINAL BACKEND SECURITY RUNTIME SUITE SUCCESS",
    );
  }
}

void main();