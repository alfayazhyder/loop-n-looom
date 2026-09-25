import type { Response } from "express";

import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import {
  AdminCustomRequestError,
  assignAdminCustomRequest,
  createAdminCustomQuote,
  createAdminCustomRequestMessage,
  getAdminCustomRequestById,
  getAdminCustomRequests,
  sendAdminCustomQuote,
  updateAdminCustomRequestStatus,
} from "../services/adminCustomRequest.service";
import {
  adminCustomQuoteParamsSchema,
  adminCustomRequestIdParamSchema,
  adminCustomRequestListQuerySchema,
  assignAdminCustomRequestSchema,
  createAdminCustomQuoteSchema,
  createAdminCustomRequestMessageSchema,
  updateAdminCustomRequestStatusSchema,
} from "../validators/adminCustomRequest";

function handleAdminCustomRequestError(
  error: unknown,
  res: Response,
): boolean {
  if (error instanceof AdminCustomRequestError) {
    res.status(error.statusCode).json({
      message: error.message,
    });

    return true;
  }

  return false;
}

function requireAdminUserId(
  req: AuthenticatedRequest,
  res: Response,
): string | null {
  if (!req.user) {
    res.status(401).json({
      message: "Authentication required.",
    });

    return null;
  }

  return req.user.id;
}

export async function listAdminCustomRequests(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const parsedQuery =
    adminCustomRequestListQuerySchema.safeParse(
      req.query,
    );

  if (!parsedQuery.success) {
    res.status(400).json({
      message:
        "Invalid custom request filters.",
      errors: parsedQuery.error.flatten(),
    });

    return;
  }

  const result = await getAdminCustomRequests(
    parsedQuery.data,
  );

  res.status(200).json(result);
}

export async function getAdminCustomRequest(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const parsedParams =
    adminCustomRequestIdParamSchema.safeParse(
      req.params,
    );

  if (!parsedParams.success) {
    res.status(400).json({
      message:
        "Invalid custom request ID.",
      errors: parsedParams.error.flatten(),
    });

    return;
  }

  try {
    const request =
      await getAdminCustomRequestById(
        parsedParams.data.requestId,
      );

    res.status(200).json({
      request,
    });
  } catch (error) {
    if (
      handleAdminCustomRequestError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function assignCustomRequestAdmin(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const parsedParams =
    adminCustomRequestIdParamSchema.safeParse(
      req.params,
    );

  if (!parsedParams.success) {
    res.status(400).json({
      message:
        "Invalid custom request ID.",
      errors: parsedParams.error.flatten(),
    });

    return;
  }

  const parsedBody =
    assignAdminCustomRequestSchema.safeParse(
      req.body,
    );

  if (!parsedBody.success) {
    res.status(400).json({
      message:
        "Invalid admin assignment.",
      errors: parsedBody.error.flatten(),
    });

    return;
  }

  try {
    const request =
      await assignAdminCustomRequest(
        parsedParams.data.requestId,
        parsedBody.data,
      );

    res.status(200).json({
      request,
      message:
        parsedBody.data.assignedAdminId ===
        null
          ? "Custom request unassigned successfully."
          : "Custom request assigned successfully.",
    });
  } catch (error) {
    if (
      handleAdminCustomRequestError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function updateCustomRequestStatus(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const parsedParams =
    adminCustomRequestIdParamSchema.safeParse(
      req.params,
    );

  if (!parsedParams.success) {
    res.status(400).json({
      message:
        "Invalid custom request ID.",
      errors: parsedParams.error.flatten(),
    });

    return;
  }

  const parsedBody =
    updateAdminCustomRequestStatusSchema.safeParse(
      req.body,
    );

  if (!parsedBody.success) {
    res.status(400).json({
      message:
        "Invalid custom request status.",
      errors: parsedBody.error.flatten(),
    });

    return;
  }

  try {
    const request =
      await updateAdminCustomRequestStatus(
        parsedParams.data.requestId,
        parsedBody.data,
      );

    res.status(200).json({
      request,
      message:
        "Custom request status updated successfully.",
    });
  } catch (error) {
    if (
      handleAdminCustomRequestError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function createCustomRequestAdminMessage(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const adminUserId = requireAdminUserId(
    req,
    res,
  );

  if (!adminUserId) {
    return;
  }

  const parsedParams =
    adminCustomRequestIdParamSchema.safeParse(
      req.params,
    );

  if (!parsedParams.success) {
    res.status(400).json({
      message:
        "Invalid custom request ID.",
      errors: parsedParams.error.flatten(),
    });

    return;
  }

  const parsedBody =
    createAdminCustomRequestMessageSchema.safeParse(
      req.body,
    );

  if (!parsedBody.success) {
    res.status(400).json({
      message:
        "Invalid custom request message.",
      errors: parsedBody.error.flatten(),
    });

    return;
  }

  try {
    const message =
      await createAdminCustomRequestMessage(
        parsedParams.data.requestId,
        adminUserId,
        parsedBody.data,
      );

    res.status(201).json({
      message,
      statusMessage:
        "Message sent successfully.",
    });
  } catch (error) {
    if (
      handleAdminCustomRequestError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function createCustomRequestQuote(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const adminUserId = requireAdminUserId(
    req,
    res,
  );

  if (!adminUserId) {
    return;
  }

  const parsedParams =
    adminCustomRequestIdParamSchema.safeParse(
      req.params,
    );

  if (!parsedParams.success) {
    res.status(400).json({
      message:
        "Invalid custom request ID.",
      errors: parsedParams.error.flatten(),
    });

    return;
  }

  const parsedBody =
    createAdminCustomQuoteSchema.safeParse(
      req.body,
    );

  if (!parsedBody.success) {
    res.status(400).json({
      message:
        "Invalid quotation details.",
      errors: parsedBody.error.flatten(),
    });

    return;
  }

  try {
    const quote =
      await createAdminCustomQuote(
        parsedParams.data.requestId,
        adminUserId,
        parsedBody.data,
      );

    res.status(201).json({
      quote,
      message:
        "Quotation draft created successfully.",
    });
  } catch (error) {
    if (
      handleAdminCustomRequestError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function sendCustomRequestQuote(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const parsedParams =
    adminCustomQuoteParamsSchema.safeParse(
      req.params,
    );

  if (!parsedParams.success) {
    res.status(400).json({
      message:
        "Invalid custom request or quote ID.",
      errors: parsedParams.error.flatten(),
    });

    return;
  }

  try {
    const quote =
      await sendAdminCustomQuote(
        parsedParams.data.requestId,
        parsedParams.data.quoteId,
      );

    res.status(200).json({
      quote,
      message:
        "Quotation sent successfully.",
    });
  } catch (error) {
    if (
      handleAdminCustomRequestError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}