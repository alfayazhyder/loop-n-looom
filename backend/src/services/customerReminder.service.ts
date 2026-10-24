import type {
  Prisma,
} from "../generated/prisma/client";

import { prisma } from "../lib/prisma";

import type {
  CreateReminderInput,
  ReminderListQuery,
  UpcomingReminderQuery,
  UpdateReminderInput,
} from "../validators/customerReminder";

export class CustomerReminderError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);

    this.name =
      "CustomerReminderError";
  }
}

const reminderInclude = {
  occasion: {
    select: {
      id: true,
      nameEn: true,
      nameAr: true,
      slug: true,
      imageUrl: true,
      isActive: true,
    },
  },
} satisfies Prisma.OccasionReminderInclude;

function parseDateOnly(
  value: string,
) {
  const [
    year,
    month,
    day,
  ] =
    value
      .split("-")
      .map(Number);

  return new Date(
    Date.UTC(
      year,
      month - 1,
      day,
    ),
  );
}

function getUaeToday() {
  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Dubai",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      },
    );

  const parts =
    formatter.formatToParts(
      new Date(),
    );

  const values =
    Object.fromEntries(
      parts.map(
        (part) => [
          part.type,
          part.value,
        ],
      ),
    );

  return new Date(
    Date.UTC(
      Number(
        values.year,
      ),
      Number(
        values.month,
      ) - 1,
      Number(
        values.day,
      ),
    ),
  );
}

function createOccurrence(
  year: number,
  sourceDate: Date,
) {
  const month =
    sourceDate.getUTCMonth();

  const requestedDay =
    sourceDate.getUTCDate();

  const daysInMonth =
    new Date(
      Date.UTC(
        year,
        month + 1,
        0,
      ),
    ).getUTCDate();

  const safeDay =
    Math.min(
      requestedDay,
      daysInMonth,
    );

  return new Date(
    Date.UTC(
      year,
      month,
      safeDay,
    ),
  );
}

function calculateNextOccurrence(
  eventDate: Date,
  recursYearly: boolean,
  today: Date,
) {
  if (!recursYearly) {
    if (
      eventDate.getTime() <
      today.getTime()
    ) {
      return null;
    }

    return eventDate;
  }

  let occurrence =
    createOccurrence(
      today.getUTCFullYear(),
      eventDate,
    );

  if (
    occurrence.getTime() <
    today.getTime()
  ) {
    occurrence =
      createOccurrence(
        today.getUTCFullYear() +
          1,
        eventDate,
      );
  }

  return occurrence;
}

function daysBetween(
  from: Date,
  to: Date,
) {
  return Math.round(
    (
      to.getTime() -
      from.getTime()
    ) /
      (
        24 *
        60 *
        60 *
        1000
      ),
  );
}

async function verifyOccasion(
  occasionId:
    | string
    | null
    | undefined,
) {
  if (!occasionId) {
    return;
  }

  const occasion =
    await prisma.occasion.findFirst(
      {
        where: {
          id:
            occasionId,

          isActive:
            true,
        },

        select: {
          id:
            true,
        },
      },
    );

  if (!occasion) {
    throw new CustomerReminderError(
      "Occasion not found or unavailable.",
      404,
    );
  }
}

export async function listCustomerReminders(
  userId: string,
  query: ReminderListQuery,
) {
  const where:
    Prisma.OccasionReminderWhereInput =
    {
      userId,

      ...(query.active !==
      undefined
        ? {
            isActive:
              query.active,
          }
        : {}),
    };

  const skip =
    (query.page - 1) *
    query.limit;

  const [
    reminders,
    total,
  ] =
    await prisma.$transaction([
      prisma.occasionReminder.findMany(
        {
          where,

          skip,

          take:
            query.limit,

          orderBy: [
            {
              eventDate:
                "asc",
            },
            {
              createdAt:
                "desc",
            },
          ],

          include:
            reminderInclude,
        },
      ),

      prisma.occasionReminder.count(
        {
          where,
        },
      ),
    ]);

  return {
    reminders,

    pagination: {
      page:
        query.page,

      limit:
        query.limit,

      total,

      totalPages:
        total === 0
          ? 0
          : Math.ceil(
              total /
                query.limit,
            ),
    },
  };
}

export async function getCustomerReminder(
  userId: string,
  reminderId: string,
) {
  const reminder =
    await prisma.occasionReminder.findFirst(
      {
        where: {
          id:
            reminderId,

          userId,
        },

        include:
          reminderInclude,
      },
    );

  if (!reminder) {
    throw new CustomerReminderError(
      "Reminder not found.",
      404,
    );
  }

  return reminder;
}

export async function createCustomerReminder(
  userId: string,
  input: CreateReminderInput,
) {
  await verifyOccasion(
    input.occasionId,
  );

  return prisma.occasionReminder.create(
    {
      data: {
        userId,

        occasionId:
          input.occasionId ??
          null,

        title:
          input.title,

        recipientName:
          input.recipientName ??
          null,

        occasionLabel:
          input.occasionLabel ??
          null,

        eventDate:
          parseDateOnly(
            input.eventDate,
          ),

        reminderDaysBefore:
          input.reminderDaysBefore,

        recursYearly:
          input.recursYearly,

        isActive:
          input.isActive,
      },

      include:
        reminderInclude,
    },
  );
}

export async function updateCustomerReminder(
  userId: string,
  reminderId: string,
  input: UpdateReminderInput,
) {
  const existing =
    await prisma.occasionReminder.findFirst(
      {
        where: {
          id:
            reminderId,

          userId,
        },

        select: {
          id:
            true,
        },
      },
    );

  if (!existing) {
    throw new CustomerReminderError(
      "Reminder not found.",
      404,
    );
  }

  if (
    input.occasionId !==
    undefined
  ) {
    await verifyOccasion(
      input.occasionId,
    );
  }

  return prisma.occasionReminder.update(
    {
      where: {
        id:
          reminderId,
      },

      data: {
        ...(input.occasionId !==
        undefined
          ? {
              occasionId:
                input.occasionId,
            }
          : {}),

        ...(input.title !==
        undefined
          ? {
              title:
                input.title,
            }
          : {}),

        ...(input.recipientName !==
        undefined
          ? {
              recipientName:
                input.recipientName,
            }
          : {}),

        ...(input.occasionLabel !==
        undefined
          ? {
              occasionLabel:
                input.occasionLabel,
            }
          : {}),

        ...(input.eventDate !==
        undefined
          ? {
              eventDate:
                parseDateOnly(
                  input.eventDate,
                ),
            }
          : {}),

        ...(input.reminderDaysBefore !==
        undefined
          ? {
              reminderDaysBefore:
                input.reminderDaysBefore,
            }
          : {}),

        ...(input.recursYearly !==
        undefined
          ? {
              recursYearly:
                input.recursYearly,
            }
          : {}),

        ...(input.isActive !==
        undefined
          ? {
              isActive:
                input.isActive,
            }
          : {}),
      },

      include:
        reminderInclude,
    },
  );
}

export async function deleteCustomerReminder(
  userId: string,
  reminderId: string,
) {
  const result =
    await prisma.occasionReminder.deleteMany(
      {
        where: {
          id:
            reminderId,

          userId,
        },
      },
    );

  if (
    result.count ===
    0
  ) {
    throw new CustomerReminderError(
      "Reminder not found.",
      404,
    );
  }
}

export async function getUpcomingCustomerReminders(
  userId: string,
  query: UpcomingReminderQuery,
) {
  const reminders =
    await prisma.occasionReminder.findMany(
      {
        where: {
          userId,

          isActive:
            true,
        },

        include:
          reminderInclude,
      },
    );

  const today =
    getUaeToday();

  const result =
    reminders
      .map(
        (reminder) => {
          const nextEventDate =
            calculateNextOccurrence(
              reminder.eventDate,
              reminder.recursYearly,
              today,
            );

          if (!nextEventDate) {
            return null;
          }

          const daysUntilEvent =
            daysBetween(
              today,
              nextEventDate,
            );

          if (
            daysUntilEvent < 0 ||
            daysUntilEvent >
              query.days
          ) {
            return null;
          }

          const reminderDate =
            new Date(
              nextEventDate.getTime() -
                reminder.reminderDaysBefore *
                  24 *
                  60 *
                  60 *
                  1000,
            );

          return {
            ...reminder,

            nextEventDate,

            reminderDate,

            daysUntilEvent,

            reminderDue:
              today.getTime() >=
              reminderDate.getTime(),
          };
        },
      )
      .filter(
        (
          reminder,
        ): reminder is NonNullable<
          typeof reminder
        > =>
          reminder !==
          null,
      )
      .sort(
        (
          a,
          b,
        ) =>
          a.nextEventDate.getTime() -
          b.nextEventDate.getTime(),
      );

  return {
    reminders:
      result,

    windowDays:
      query.days,

    timezone:
      "Asia/Dubai",
  };
}
