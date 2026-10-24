import type {
  Response,
} from "express";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

import {
  addAdminOrderQcPhotos,
  AdminOrderError,
  deleteAdminOrderQcPhoto,
  getAdminOrderDetail,
  listAdminOrders,
  updateAdminOrderShipment,
  updateAdminOrderStatus,
} from "../services/adminOrder.service";

import {
  addAdminOrderQcPhotosSchema,
  adminOrderIdParamSchema,
  adminOrderListQuerySchema,
  adminOrderMediaParamsSchema,
  updateAdminOrderStatusSchema,
  updateAdminShipmentSchema,
} from "../validators/adminOrder";

function handleAdminOrderError(
  error: unknown,
  res: Response,
) {
  if (
    error instanceof
    AdminOrderError
  ) {
    res
      .status(
        error.statusCode,
      )
      .json({
        message:
          error.message,
      });

    return true;
  }

  return false;
}

function requireAdminId(
  req: AuthenticatedRequest,
  res: Response,
) {
  if (!req.user) {
    res.status(401).json({
      message:
        "Authentication required.",
    });

    return null;
  }

  return req.user.id;
}

export async function listOrdersAdmin(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const parsed =
    adminOrderListQuerySchema.safeParse(
      req.query,
    );

  if (!parsed.success) {
    res.status(400).json({
      message:
        "Invalid order filters.",

      errors:
        parsed.error.flatten(),
    });

    return;
  }

  const result =
    await listAdminOrders(
      parsed.data,
    );

  res.status(200).json(
    result,
  );
}

export async function getOrderAdmin(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const parsed =
    adminOrderIdParamSchema.safeParse(
      req.params,
    );

  if (!parsed.success) {
    res.status(400).json({
      message:
        "Invalid order ID.",

      errors:
        parsed.error.flatten(),
    });

    return;
  }

  try {
    const order =
      await getAdminOrderDetail(
        parsed.data.orderId,
      );

    res.status(200).json({
      order,
    });
  } catch (error) {
    if (
      handleAdminOrderError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function updateOrderStatusAdmin(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const adminId =
    requireAdminId(
      req,
      res,
    );

  if (!adminId) {
    return;
  }

  const params =
    adminOrderIdParamSchema.safeParse(
      req.params,
    );

  const body =
    updateAdminOrderStatusSchema.safeParse(
      req.body,
    );

  if (
    !params.success ||
    !body.success
  ) {
    res.status(400).json({
      message:
        "Invalid order status update.",
    });

    return;
  }

  try {
    const order =
      await updateAdminOrderStatus(
        adminId,
        params.data.orderId,
        body.data,
      );

    res.status(200).json({
      message:
        "Order status updated.",

      order,
    });
  } catch (error) {
    if (
      handleAdminOrderError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function addOrderQcPhotosAdmin(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const params =
    adminOrderIdParamSchema.safeParse(
      req.params,
    );

  const body =
    addAdminOrderQcPhotosSchema.safeParse(
      req.body,
    );

  if (
    !params.success ||
    !body.success
  ) {
    res.status(400).json({
      message:
        "Invalid quality-check photo request.",
    });

    return;
  }

  try {
    const photos =
      await addAdminOrderQcPhotos(
        params.data.orderId,
        body.data,
      );

    res.status(201).json({
      message:
        "Quality-check photos added.",

      photos,
    });
  } catch (error) {
    if (
      handleAdminOrderError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function deleteOrderQcPhotoAdmin(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const parsed =
    adminOrderMediaParamsSchema.safeParse(
      req.params,
    );

  if (!parsed.success) {
    res.status(400).json({
      message:
        "Invalid quality-check photo request.",

      errors:
        parsed.error.flatten(),
    });

    return;
  }

  try {
    const photo =
      await deleteAdminOrderQcPhoto(
        parsed.data.orderId,
        parsed.data.mediaId,
      );

    res.status(200).json({
      message:
        "Quality-check photo removed.",

      photo,
    });
  } catch (error) {
    if (
      handleAdminOrderError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function updateOrderShipmentAdmin(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const adminId =
    requireAdminId(
      req,
      res,
    );

  if (!adminId) {
    return;
  }

  const params =
    adminOrderIdParamSchema.safeParse(
      req.params,
    );

  const body =
    updateAdminShipmentSchema.safeParse(
      req.body,
    );

  if (
    !params.success ||
    !body.success
  ) {
    res.status(400).json({
      message:
        "Invalid shipment update.",
    });

    return;
  }

  try {
    const order =
      await updateAdminOrderShipment(
        adminId,
        params.data.orderId,
        body.data,
      );

    res.status(200).json({
      message:
        "Shipment updated.",

      order,
    });
  } catch (error) {
    if (
      handleAdminOrderError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}
