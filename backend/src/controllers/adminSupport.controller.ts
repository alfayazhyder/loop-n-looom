import type {
  Response,
} from "express";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

import {
  assignAdminSupportConversation,
  createAdminSupportMessage,
  getAdminSupportConversation,
  listAdminSupportConversations,
  SupportChatError,
  updateAdminSupportConversationStatus,
} from "../services/supportChat.service";

import {
  adminSupportConversationIdParamSchema,
  adminSupportListQuerySchema,
  assignSupportConversationSchema,
  createAdminSupportMessageSchema,
  updateSupportConversationStatusSchema,
} from "../validators/adminSupport";

import {
  supportMessageListQuerySchema,
} from "../validators/customerSupport";

function handleSupportError(
  error: unknown,
  res: Response,
) {
  if (
    error instanceof
    SupportChatError
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

export async function listAdminSupport(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const parsed =
    adminSupportListQuerySchema.safeParse(
      req.query,
    );

  if (!parsed.success) {
    res.status(400).json({
      message:
        "Invalid support queue query.",

      errors:
        parsed.error.flatten(),
    });

    return;
  }

  const result =
    await listAdminSupportConversations(
      parsed.data,
    );

  res.status(200).json(
    result,
  );
}

export async function getAdminSupport(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const params =
    adminSupportConversationIdParamSchema.safeParse(
      req.params,
    );

  const query =
    supportMessageListQuerySchema.safeParse(
      req.query,
    );

  if (
    !params.success ||
    !query.success
  ) {
    res.status(400).json({
      message:
        "Invalid support conversation request.",
    });

    return;
  }

  try {
    const result =
      await getAdminSupportConversation(
        params.data
          .conversationId,
        query.data,
      );

    res.status(200).json(
      result,
    );
  } catch (error) {
    if (
      handleSupportError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function assignAdminSupport(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const params =
    adminSupportConversationIdParamSchema.safeParse(
      req.params,
    );

  const body =
    assignSupportConversationSchema.safeParse(
      req.body,
    );

  if (
    !params.success ||
    !body.success
  ) {
    res.status(400).json({
      message:
        "Invalid support assignment.",
    });

    return;
  }

  try {
    const conversation =
      await assignAdminSupportConversation(
        params.data
          .conversationId,
        body.data,
      );

    res.status(200).json({
      message:
        "Support conversation assignment updated.",

      conversation,
    });
  } catch (error) {
    if (
      handleSupportError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function updateAdminSupportStatus(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const params =
    adminSupportConversationIdParamSchema.safeParse(
      req.params,
    );

  const body =
    updateSupportConversationStatusSchema.safeParse(
      req.body,
    );

  if (
    !params.success ||
    !body.success
  ) {
    res.status(400).json({
      message:
        "Invalid support status update.",
    });

    return;
  }

  try {
    const conversation =
      await updateAdminSupportConversationStatus(
        params.data
          .conversationId,
        body.data,
      );

    res.status(200).json({
      message:
        "Support conversation status updated.",

      conversation,
    });
  } catch (error) {
    if (
      handleSupportError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function sendAdminSupportMessage(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      message:
        "Authentication required.",
    });

    return;
  }

  const params =
    adminSupportConversationIdParamSchema.safeParse(
      req.params,
    );

  const body =
    createAdminSupportMessageSchema.safeParse(
      req.body,
    );

  if (
    !params.success ||
    !body.success
  ) {
    res.status(400).json({
      message:
        "Invalid support message.",
    });

    return;
  }

  try {
    const message =
      await createAdminSupportMessage(
        req.user.id,
        params.data
          .conversationId,
        body.data,
      );

    res.status(201).json({
      message:
        "Support reply sent.",

      supportMessage:
        message,
    });
  } catch (error) {
    if (
      handleSupportError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}
