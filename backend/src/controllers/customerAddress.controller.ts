import type { Response } from "express";

import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import {
  createCustomerAddress,
  CustomerAddressError,
  deleteCustomerAddress,
  getCustomerAddresses,
  setDefaultCustomerAddress,
  updateCustomerAddress,
} from "../services/customerAddress.service";
import {
  createAddressSchema,
  updateAddressSchema,
} from "../validators/auth";

function requireUserId(
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

function requireAddressId(
  req: AuthenticatedRequest,
  res: Response,
): string | null {
  const addressId = req.params.addressId;

  if (
    typeof addressId !== "string" ||
    addressId.trim().length === 0
  ) {
    res.status(400).json({
      message: "A valid address ID is required.",
    });

    return null;
  }

  return addressId;
}

export async function listAddresses(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req, res);

  if (!userId) {
    return;
  }

  const addresses = await getCustomerAddresses(userId);

  res.status(200).json({
    addresses,
  });
}

export async function createAddress(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req, res);

  if (!userId) {
    return;
  }

  const parsed = createAddressSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid address details.",
      errors: parsed.error.flatten(),
    });

    return;
  }

  const address = await createCustomerAddress(
    userId,
    parsed.data,
  );

  res.status(201).json({
    address,
    message: "Address created successfully.",
  });
}

export async function updateAddress(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req, res);

  if (!userId) {
    return;
  }

  const addressId = requireAddressId(req, res);

  if (!addressId) {
    return;
  }

  const parsed = updateAddressSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid address details.",
      errors: parsed.error.flatten(),
    });

    return;
  }

  try {
    const address = await updateCustomerAddress(
      userId,
      addressId,
      parsed.data,
    );

    res.status(200).json({
      address,
      message: "Address updated successfully.",
    });
  } catch (error) {
    if (error instanceof CustomerAddressError) {
      res.status(error.statusCode).json({
        message: error.message,
      });

      return;
    }

    throw error;
  }
}

export async function deleteAddress(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req, res);

  if (!userId) {
    return;
  }

  const addressId = requireAddressId(req, res);

  if (!addressId) {
    return;
  }

  try {
    const result = await deleteCustomerAddress(
      userId,
      addressId,
    );

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof CustomerAddressError) {
      res.status(error.statusCode).json({
        message: error.message,
      });

      return;
    }

    throw error;
  }
}

export async function setDefaultAddress(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req, res);

  if (!userId) {
    return;
  }

  const addressId = requireAddressId(req, res);

  if (!addressId) {
    return;
  }

  try {
    const address = await setDefaultCustomerAddress(
      userId,
      addressId,
    );

    res.status(200).json({
      address,
      message: "Default address updated successfully.",
    });
  } catch (error) {
    if (error instanceof CustomerAddressError) {
      res.status(error.statusCode).json({
        message: error.message,
      });

      return;
    }

    throw error;
  }
}