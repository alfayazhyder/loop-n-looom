"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";

import {
  authenticatedRequest,
  isAuthenticationError,
} from "@/lib/session";

type Emirate =
  | "ABU_DHABI"
  | "DUBAI"
  | "SHARJAH"
  | "AJMAN"
  | "UMM_AL_QUWAIN"
  | "RAS_AL_KHAIMAH"
  | "FUJAIRAH";

interface Address {
  id: string;
  recipientName: string;
  phone: string;
  emirate: Emirate;
  city: string;
  area: string;
  street: string | null;
  building: string | null;
  apartmentOrVilla: string | null;
  isDefault: boolean;
}

const emirates: {
  value: Emirate;
  label: string;
}[] = [
  { value: "ABU_DHABI", label: "Abu Dhabi" },
  { value: "DUBAI", label: "Dubai" },
  { value: "SHARJAH", label: "Sharjah" },
  { value: "AJMAN", label: "Ajman" },
  { value: "UMM_AL_QUWAIN", label: "Umm Al Quwain" },
  { value: "RAS_AL_KHAIMAH", label: "Ras Al Khaimah" },
  { value: "FUJAIRAH", label: "Fujairah" },
];

function emirateLabel(value: string) {
  return (
    emirates.find(
      (emirate) => emirate.value === value,
    )?.label ?? value
  );
}

export default function AddressBook() {
  const [addresses, setAddresses] = useState<
    Address[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [signedOut, setSignedOut] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [recipientName, setRecipientName] =
    useState("");
  const [phone, setPhone] = useState("");
  const [emirate, setEmirate] =
    useState<Emirate>("ABU_DHABI");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [street, setStreet] = useState("");
  const [building, setBuilding] = useState("");
  const [apartment, setApartment] = useState("");

  const loadAddresses = useCallback(async () => {
    const response = await authenticatedRequest<{
      addresses: Address[];
    }>("/api/customer/addresses");

    setAddresses(
      Array.isArray(response.addresses)
        ? response.addresses
        : [],
    );
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response =
          await authenticatedRequest<{
            addresses: Address[];
          }>("/api/customer/addresses");

        if (!active) return;

        setAddresses(
          Array.isArray(response.addresses)
            ? response.addresses
            : [],
        );
      } catch (caught) {
        if (!active) return;

        if (isAuthenticationError(caught)) {
          setSignedOut(true);
        } else {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load addresses.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  async function createAddress(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      await authenticatedRequest(
        "/api/customer/addresses",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipientName: recipientName.trim(),
            phone: phone.trim(),
            emirate,
            city: city.trim(),
            area: area.trim(),
            ...(street.trim()
              ? { street: street.trim() }
              : {}),
            ...(building.trim()
              ? { building: building.trim() }
              : {}),
            ...(apartment.trim()
              ? {
                  apartmentOrVilla:
                    apartment.trim(),
                }
              : {}),
            isDefault: addresses.length === 0,
          }),
        },
      );

      await loadAddresses();

      setRecipientName("");
      setPhone("");
      setCity("");
      setArea("");
      setStreet("");
      setBuilding("");
      setApartment("");

      setMessage("Delivery address saved.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to create address.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function perform(
    path: string,
    method: "PATCH" | "DELETE",
  ) {
    if (busy) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      await authenticatedRequest(path, {
        method,
      });

      await loadAddresses();

      setMessage("Delivery addresses updated.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to update address.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="page-container py-16">
        <p role="status">
          Loading delivery addresses...
        </p>
      </div>
    );
  }

  if (signedOut) {
    return (
      <div className="page-container py-16">
        <div className="rounded-3xl bg-white p-10 text-center">
          <h1 className="font-serif text-3xl">
            Please sign in
          </h1>

          <p className="mt-4 text-sm">
            Sign in to manage your saved addresses.
          </p>

          <Link
            href="/login"
            className="mt-6 inline-flex min-h-12 items-center rounded-full bg-brand-cocoa px-8 text-white"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="min-h-[70vh] bg-brand-cream py-12 sm:py-16">
      <div className="page-container">
        <Link
          href="/account"
          className="text-sm underline-offset-4 hover:underline"
        >
          ← Back to account
        </Link>

        <h1 className="mt-6 font-serif text-4xl">
          Delivery Addresses
        </h1>

        <p className="mt-4 text-sm text-[#6B5A50]">
          Manage your delivery locations across
          the seven UAE emirates.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-6 rounded-2xl bg-white p-4 text-sm text-[#A95757]"
          >
            {error}
          </p>
        )}

        {message && (
          <p
            role="status"
            className="mt-6 rounded-2xl bg-white p-4 text-sm text-[#557A61]"
          >
            {message}
          </p>
        )}

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="mb-5 font-serif text-2xl">
              Saved Addresses
            </h2>

            {addresses.length === 0 && (
              <p className="rounded-3xl border border-[#EADFD8] bg-white p-8 text-sm text-[#6B5A50]">
                You have not added a delivery
                address yet.
              </p>
            )}

            <div className="space-y-4">
              {addresses.map((address) => (
                <article
                  key={address.id}
                  className="rounded-3xl border border-[#EADFD8] bg-white p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-serif text-xl">
                      {address.recipientName}
                    </h3>

                    {address.isDefault && (
                      <span className="rounded-full bg-brand-blush px-3 py-1 text-xs">
                        Default
                      </span>
                    )}
                  </div>

                  <p className="mt-4 text-sm leading-7 text-[#6B5A50]">
                    {address.area}, {address.city}
                    <br />
                    {emirateLabel(address.emirate)}
                    <br />
                    {address.phone}
                  </p>

                  {address.street && (
                    <p className="mt-2 text-sm text-[#6B5A50]">
                      {address.street}
                    </p>
                  )}

                  <div className="mt-6 flex flex-wrap gap-4 text-sm">
                    {!address.isDefault && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void perform(
                            `/api/customer/addresses/${address.id}/default`,
                            "PATCH",
                          )
                        }
                        className="font-medium underline-offset-4 hover:underline disabled:opacity-50"
                      >
                        Make Default
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            "Remove this saved address?",
                          )
                        ) {
                          void perform(
                            `/api/customer/addresses/${address.id}`,
                            "DELETE",
                          );
                        }
                      }}
                      className="text-[#A95757] underline-offset-4 hover:underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <form
            onSubmit={createAddress}
            className="h-fit rounded-3xl border border-[#EADFD8] bg-white p-7 sm:p-9"
          >
            <h2 className="font-serif text-2xl">
              Add a New Address
            </h2>

            <div className="mt-7 grid gap-5">
              <label className="text-sm">
                Recipient name
                <input
                  value={recipientName}
                  onChange={(event) =>
                    setRecipientName(event.target.value)
                  }
                  required
                  className="mt-2 min-h-12 w-full rounded-2xl border border-[#EADFD8] px-4"
                />
              </label>

              <label className="text-sm">
                Phone number
                <input
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value)
                  }
                  type="tel"
                  required
                  className="mt-2 min-h-12 w-full rounded-2xl border border-[#EADFD8] px-4"
                />
              </label>

              <label className="text-sm">
                Emirate
                <select
                  value={emirate}
                  onChange={(event) =>
                    setEmirate(
                      event.target.value as Emirate,
                    )
                  }
                  className="mt-2 min-h-12 w-full rounded-2xl border border-[#EADFD8] bg-white px-4"
                >
                  {emirates.map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  City
                  <input
                    value={city}
                    onChange={(event) =>
                      setCity(event.target.value)
                    }
                    required
                    className="mt-2 min-h-12 w-full rounded-2xl border border-[#EADFD8] px-4"
                  />
                </label>

                <label className="text-sm">
                  Area
                  <input
                    value={area}
                    onChange={(event) =>
                      setArea(event.target.value)
                    }
                    required
                    className="mt-2 min-h-12 w-full rounded-2xl border border-[#EADFD8] px-4"
                  />
                </label>
              </div>

              <label className="text-sm">
                Street (optional)
                <input
                  value={street}
                  onChange={(event) =>
                    setStreet(event.target.value)
                  }
                  className="mt-2 min-h-12 w-full rounded-2xl border border-[#EADFD8] px-4"
                />
              </label>

              <label className="text-sm">
                Building (optional)
                <input
                  value={building}
                  onChange={(event) =>
                    setBuilding(event.target.value)
                  }
                  className="mt-2 min-h-12 w-full rounded-2xl border border-[#EADFD8] px-4"
                />
              </label>

              <label className="text-sm">
                Apartment / Villa (optional)
                <input
                  value={apartment}
                  onChange={(event) =>
                    setApartment(event.target.value)
                  }
                  className="mt-2 min-h-12 w-full rounded-2xl border border-[#EADFD8] px-4"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="mt-8 min-h-12 w-full rounded-full bg-brand-cocoa px-6 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy
                ? "Saving Address..."
                : "Save Address"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}