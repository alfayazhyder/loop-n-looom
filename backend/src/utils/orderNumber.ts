import { randomInt } from "node:crypto";

function getUaeYear(
  date: Date,
): string {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "Asia/Dubai",
      year: "numeric",
    },
  ).format(date);
}

export function createOrderNumberCandidate(
  date = new Date(),
): string {
  const year =
    getUaeYear(date);

  const sequence =
    randomInt(
      0,
      1_000_000,
    )
      .toString()
      .padStart(6, "0");

  return `LNL-${year}-${sequence}`;
}