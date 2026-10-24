import type {
  Response,
} from "express";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

import {
  closeCustomerSupportConversation,
  createCustomerSupportConversation,
  createCustomerSupportMessage,
  getCustomerSupportConversation,
  listCustomerSupportConversations,
  SupportChatError,
} from "../services/supportChat.service";

import {
  createCustomerSupportConversationSchema,
  createCustomerSupportMessageSchema,
  customerSupportListQuerySchema,
  supportConversationIdParamSchema,
  supportMessageListQuerySchema,
} from "../validators/customerSupport";

function getUserId(
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

export async function listCustomerSupport(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId =
    getUserId(
      req,
      res,
    );

  if (!userId) {
    return;
  }

  const parsed =
    customerSupportListQuerySchema.safeParse(
      req.query,
    );

  if (!parsed.success) {
    res.status(400).json({
      message:
        "Invalid support conversation query.",

      errors:
        parsed.error.flatten(),
    });

    return;
  }

  const result =
    await listCustomerSupportConversations(
      userId,
      parsed.data,
    );

  res.status(200).json(
    result,
  );
}

export async function createCustomerSupport(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId =
    getUserId(
      req,
      res,
    );

  if (!userId) {
    return;
  }

  const parsed =
    createCustomerSupportConversationSchema.safeParse(
      req.body,
    );

  if (!parsed.success) {
    res.status(400).json({
      message:
        "Invalid support conversation details.",

      errors:
        parsed.error.flatten(),
    });

    return;
  }

  try {
    const result =
      await createCustomerSupportConversation(
        userId,
        parsed.data,
      );

    res.status(201).json({
      message:
        "Support conversation created.",

      ...result,
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

export async function getCustomerSupport(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId =
    getUserId(
      req,
      res,
    );

  if (!userId) {
    return;
  }

  const params =
    supportConversationIdParamSchema.safeParse(
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
      await getCustomerSupportConversation(
        userId,
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

export async function sendCustomerSupportMessage(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId =
    getUserId(
      req,
      res,
    );

  if (!userId) {
    return;
  }

  const params =
    supportConversationIdParamSchema.safeParse(
      req.params,
    );

  const body =
    createCustomerSupportMessageSchema.safeParse(
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
      await createCustomerSupportMessage(
        userId,
        params.data
          .conversationId,
        body.data,
      );

    res.status(201).json({
      message:
        "Support message sent.",

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

export async function closeCustomerSupport(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId =
    getUserId(
      req,
      res,
    );

  if (!userId) {
    return;
  }

  const parsed =
    supportConversationIdParamSchema.safeParse(
      req.params,
    );

  if (!parsed.success) {
    res.status(400).json({
      message:
        "Invalid support conversation ID.",

      errors:
        parsed.error.flatten(),
    });

    return;
  }

  try {
    const conversation =
      await closeCustomerSupportConversation(
        userId,
        parsed.data
          .conversationId,
      );

    res.status(200).json({
      message:
        "Support conversation closed.",

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
