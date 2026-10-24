import type {
  Response,
} from "express";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

import {
  createCustomerReminder,
  CustomerReminderError,
  deleteCustomerReminder,
  getCustomerReminder,
  getUpcomingCustomerReminders,
  listCustomerReminders,
  updateCustomerReminder,
} from "../services/customerReminder.service";

import {
  createReminderSchema,
  reminderIdParamSchema,
  reminderListQuerySchema,
  upcomingReminderQuerySchema,
  updateReminderSchema,
} from "../validators/customerReminder";

function userIdOrUnauthorized(
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

function handleReminderError(
  error: unknown,
  res: Response,
) {
  if (
    error instanceof
    CustomerReminderError
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

export async function listReminders(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId =
    userIdOrUnauthorized(
      req,
      res,
    );

  if (!userId) {
    return;
  }

  const parsed =
    reminderListQuerySchema.safeParse(
      req.query,
    );

  if (!parsed.success) {
    res.status(400).json({
      message:
        "Invalid reminder query.",

      errors:
        parsed.error.flatten(),
    });

    return;
  }

  const result =
    await listCustomerReminders(
      userId,
      parsed.data,
    );

  res.status(200).json(
    result,
  );
}

export async function listUpcomingReminders(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId =
    userIdOrUnauthorized(
      req,
      res,
    );

  if (!userId) {
    return;
  }

  const parsed =
    upcomingReminderQuerySchema.safeParse(
      req.query,
    );

  if (!parsed.success) {
    res.status(400).json({
      message:
        "Invalid upcoming reminder query.",

      errors:
        parsed.error.flatten(),
    });

    return;
  }

  const result =
    await getUpcomingCustomerReminders(
      userId,
      parsed.data,
    );

  res.status(200).json(
    result,
  );
}

export async function getReminder(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId =
    userIdOrUnauthorized(
      req,
      res,
    );

  if (!userId) {
    return;
  }

  const parsed =
    reminderIdParamSchema.safeParse(
      req.params,
    );

  if (!parsed.success) {
    res.status(400).json({
      message:
        "Invalid reminder ID.",

      errors:
        parsed.error.flatten(),
    });

    return;
  }

  try {
    const reminder =
      await getCustomerReminder(
        userId,
        parsed.data.reminderId,
      );

    res.status(200).json({
      reminder,
    });
  } catch (error) {
    if (
      handleReminderError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function createReminder(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId =
    userIdOrUnauthorized(
      req,
      res,
    );

  if (!userId) {
    return;
  }

  const parsed =
    createReminderSchema.safeParse(
      req.body,
    );

  if (!parsed.success) {
    res.status(400).json({
      message:
        "Invalid reminder details.",

      errors:
        parsed.error.flatten(),
    });

    return;
  }

  try {
    const reminder =
      await createCustomerReminder(
        userId,
        parsed.data,
      );

    res.status(201).json({
      message:
        "Occasion reminder created.",

      reminder,
    });
  } catch (error) {
    if (
      handleReminderError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function updateReminder(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId =
    userIdOrUnauthorized(
      req,
      res,
    );

  if (!userId) {
    return;
  }

  const params =
    reminderIdParamSchema.safeParse(
      req.params,
    );

  const body =
    updateReminderSchema.safeParse(
      req.body,
    );

  if (
    !params.success ||
    !body.success
  ) {
    res.status(400).json({
      message:
        "Invalid reminder update.",

      ...(params.success
        ? {}
        : {
            parameterErrors:
              params.error.flatten(),
          }),

      ...(body.success
        ? {}
        : {
            bodyErrors:
              body.error.flatten(),
          }),
    });

    return;
  }

  try {
    const reminder =
      await updateCustomerReminder(
        userId,
        params.data.reminderId,
        body.data,
      );

    res.status(200).json({
      message:
        "Occasion reminder updated.",

      reminder,
    });
  } catch (error) {
    if (
      handleReminderError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function deleteReminder(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId =
    userIdOrUnauthorized(
      req,
      res,
    );

  if (!userId) {
    return;
  }

  const parsed =
    reminderIdParamSchema.safeParse(
      req.params,
    );

  if (!parsed.success) {
    res.status(400).json({
      message:
        "Invalid reminder ID.",

      errors:
        parsed.error.flatten(),
    });

    return;
  }

  try {
    await deleteCustomerReminder(
      userId,
      parsed.data.reminderId,
    );

    res.status(200).json({
      message:
        "Occasion reminder deleted.",
    });
  } catch (error) {
    if (
      handleReminderError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}
