import type { Response } from "express";
import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

import {
  AdminMarketingError,
  listCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  listSubscribers,
  unsubscribeSubscriber,
  marketingOverview,
  ordersReport,
  productsReport,
  couponsReport,
} from "../services/adminMarketing.service";

import {
  createCouponSchema,
  updateCouponSchema,
  couponIdSchema,
  subscriberIdSchema,
  couponQuerySchema,
  subscriberQuerySchema,
  reportQuerySchema,
  unsubscribeSchema,
} from "../validators/adminMarketing";

function bad(res: Response, errors: unknown) {
  res.status(400).json({
    message: "Invalid request details.",
    errors,
  });
}

async function respond(
  req: AuthenticatedRequest,
  res: Response,
  action: (adminId: string) => Promise<unknown>,
) {
  if (!req.user) {
    res.status(401).json({
      message: "Authentication required.",
    });
    return;
  }

  try {
    const result = await action(req.user.id);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof AdminMarketingError) {
      res.status(error.statusCode).json({
        message: error.message,
      });
      return;
    }

    throw error;
  }
}

export async function listCouponsAdmin(
  req: AuthenticatedRequest,
  res: Response,
) {
  const parsed = couponQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    bad(res, parsed.error.flatten());
    return;
  }

  await respond(req, res, () => listCoupons(parsed.data));
}

export async function getCouponAdmin(
  req: AuthenticatedRequest,
  res: Response,
) {
  const params = couponIdSchema.safeParse(req.params);

  if (!params.success) {
    bad(res, params.error.flatten());
    return;
  }

  await respond(req, res, () =>
    getCoupon(params.data.couponId),
  );
}

export async function createCouponAdmin(
  req: AuthenticatedRequest,
  res: Response,
) {
  const parsed = createCouponSchema.safeParse(req.body);

  if (!parsed.success) {
    bad(res, parsed.error.flatten());
    return;
  }

  await respond(req, res, (adminId) =>
    createCoupon(adminId, parsed.data),
  );
}

export async function updateCouponAdmin(
  req: AuthenticatedRequest,
  res: Response,
) {
  const params = couponIdSchema.safeParse(req.params);
  const body = updateCouponSchema.safeParse(req.body);

  if (!params.success || !body.success) {
    bad(res, {
      params: params.success ? null : params.error.flatten(),
      body: body.success ? null : body.error.flatten(),
    });
    return;
  }

  await respond(req, res, (adminId) =>
    updateCoupon(
      adminId,
      params.data.couponId,
      body.data,
    ),
  );
}

export async function listSubscribersAdmin(
  req: AuthenticatedRequest,
  res: Response,
) {
  const parsed = subscriberQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    bad(res, parsed.error.flatten());
    return;
  }

  await respond(req, res, () =>
    listSubscribers(parsed.data),
  );
}

export async function unsubscribeAdmin(
  req: AuthenticatedRequest,
  res: Response,
) {
  const params = subscriberIdSchema.safeParse(req.params);
  const body = unsubscribeSchema.safeParse(req.body);

  if (!params.success || !body.success) {
    bad(res, {
      params: params.success ? null : params.error.flatten(),
      body: body.success ? null : body.error.flatten(),
    });
    return;
  }

  await respond(req, res, (adminId) =>
    unsubscribeSubscriber(
      adminId,
      params.data.subscriberId,
    ),
  );
}

export async function analyticsOverviewAdmin(
  req: AuthenticatedRequest,
  res: Response,
) {
  const parsed = reportQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    bad(res, parsed.error.flatten());
    return;
  }

  await respond(req, res, () =>
    marketingOverview(parsed.data),
  );
}

export async function ordersReportAdmin(
  req: AuthenticatedRequest,
  res: Response,
) {
  const parsed = reportQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    bad(res, parsed.error.flatten());
    return;
  }

  await respond(req, res, () =>
    ordersReport(parsed.data),
  );
}

export async function productsReportAdmin(
  req: AuthenticatedRequest,
  res: Response,
) {
  const parsed = reportQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    bad(res, parsed.error.flatten());
    return;
  }

  await respond(req, res, () =>
    productsReport(parsed.data),
  );
}

export async function couponsReportAdmin(
  req: AuthenticatedRequest,
  res: Response,
) {
  const parsed = reportQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    bad(res, parsed.error.flatten());
    return;
  }

  await respond(req, res, () =>
    couponsReport(parsed.data),
  );
}