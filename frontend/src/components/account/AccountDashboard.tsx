"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Heart,
  MapPin,
  ShoppingBag,
  UserRound,
} from "lucide-react";

import {
  authenticatedRequest,
  getCurrentCustomer,
  isAuthenticationError,
  signOut,
  type CustomerProfile,
} from "@/lib/session";

export default function AccountDashboard() {
  const router = useRouter();

  const [user, setUser] =
    useState<CustomerProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await getCurrentCustomer();

        if (!active) return;

        setUser(response.user);
        setFirstName(response.user.firstName ?? "");
        setLastName(response.user.lastName ?? "");
        setPhone(response.user.phone ?? "");
      } catch (caught) {
        if (
          active &&
          !isAuthenticationError(caught)
        ) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load your account.",
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

  async function saveProfile(event: FormEvent) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await authenticatedRequest<{
        user: CustomerProfile;
      }>(
        "/api/customer/me",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            ...(phone.trim()
              ? { phone: phone.trim() }
              : {}),
          }),
        },
      );

      setUser(response.user);
      setMessage("Your profile has been updated.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to update profile.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      await signOut();

      router.replace("/login");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to sign out.",
      );

      setBusy(false);
    }
  }

  if (loading) {
    return (
      <section className="bg-brand-cream py-20">
        <div className="page-container">
          <p role="status">
            Loading your account...
          </p>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="min-h-[65vh] bg-brand-cream py-20">
        <div className="page-container">
          <div className="mx-auto max-w-xl rounded-3xl border border-[#EADFD8] bg-white p-10 text-center">
            <UserRound
              size={34}
              className="mx-auto text-brand-cocoa"
            />

            <h1 className="mt-6 font-serif text-3xl">
              Welcome to your account
            </h1>

            <p className="mt-4 text-sm leading-7 text-[#6B5A50]">
              Sign in to manage your details,
              addresses and handmade favourites.
            </p>

            {error && (
              <p role="alert" className="mt-4 text-sm text-[#A95757]">
                {error}
              </p>
            )}

            <Link
              href="/login"
              className="mt-8 inline-flex min-h-12 items-center rounded-full bg-brand-cocoa px-8 text-sm font-medium text-white"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-[70vh] bg-brand-cream py-12 sm:py-16">
      <div className="page-container">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#8A7B72]">
          Your personal space
        </p>

        <h1 className="font-serif text-4xl sm:text-5xl">
          Hello, {user.firstName || "there"}.
        </h1>

        <p className="mt-4 text-sm text-[#6B5A50]">
          Manage your account and gifting details.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <Link
            href="/account/addresses"
            className="rounded-3xl border border-[#EADFD8] bg-white p-7 transition-transform hover:-translate-y-1"
          >
            <MapPin size={27} strokeWidth={1.5} />

            <h2 className="mt-6 font-serif text-xl">
              Delivery Addresses
            </h2>

            <p className="mt-3 text-sm text-[#6B5A50]">
              Save your UAE delivery locations.
            </p>
          </Link>

          <Link
            href="/cart"
            className="rounded-3xl border border-[#EADFD8] bg-white p-7 transition-transform hover:-translate-y-1"
          >
            <ShoppingBag size={27} strokeWidth={1.5} />

            <h2 className="mt-6 font-serif text-xl">
              Shopping Bag
            </h2>

            <p className="mt-3 text-sm text-[#6B5A50]">
              Continue shopping for thoughtful gifts.
            </p>
          </Link>

          <Link
            href="/shop"
            className="rounded-3xl border border-[#EADFD8] bg-white p-7 transition-transform hover:-translate-y-1"
          >
            <Heart size={27} strokeWidth={1.5} />

            <h2 className="mt-6 font-serif text-xl">
              Discover Creations
            </h2>

            <p className="mt-3 text-sm text-[#6B5A50]">
              Explore our latest handmade gifts.
            </p>
          </Link>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
          <form
            onSubmit={saveProfile}
            className="rounded-3xl border border-[#EADFD8] bg-white p-7 sm:p-10"
          >
            <h2 className="font-serif text-2xl">
              Personal Information
            </h2>

            <p className="mt-3 text-sm text-[#6B5A50]">
              Keep your details up to date.
            </p>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <label className="text-sm">
                First name
                <input
                  value={firstName}
                  onChange={(event) =>
                    setFirstName(event.target.value)
                  }
                  required
                  className="mt-2 min-h-12 w-full rounded-2xl border border-[#EADFD8] px-4"
                />
              </label>

              <label className="text-sm">
                Last name
                <input
                  value={lastName}
                  onChange={(event) =>
                    setLastName(event.target.value)
                  }
                  required
                  className="mt-2 min-h-12 w-full rounded-2xl border border-[#EADFD8] px-4"
                />
              </label>
            </div>

            <label className="mt-5 block text-sm">
              Email address
              <input
                value={user.email}
                readOnly
                className="mt-2 min-h-12 w-full rounded-2xl border border-[#EADFD8] bg-brand-cream px-4 text-[#6B5A50]"
              />
            </label>

            <label className="mt-5 block text-sm">
              Phone number
              <input
                value={phone}
                onChange={(event) =>
                  setPhone(event.target.value)
                }
                type="tel"
                className="mt-2 min-h-12 w-full rounded-2xl border border-[#EADFD8] px-4"
              />
            </label>

            {error && (
              <p
                role="alert"
                className="mt-5 text-sm text-[#A95757]"
              >
                {error}
              </p>
            )}

            {message && (
              <p
                role="status"
                className="mt-5 text-sm text-[#557A61]"
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-8 min-h-12 rounded-full bg-brand-cocoa px-8 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? "Saving..." : "Save Changes"}
            </button>
          </form>

          <aside className="h-fit rounded-3xl border border-[#EADFD8] bg-white p-7">
            <h2 className="font-serif text-2xl">
              Account Security
            </h2>

            <p className="mt-5 text-sm leading-7 text-[#6B5A50]">
              Your account uses secure
              cookie-based authentication.
            </p>

            <div className="mt-5 rounded-2xl bg-brand-blush p-4 text-sm">
              Email:{" "}
              {user.emailVerified
                ? "Verified"
                : "Not verified"}
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => void logout()}
              className="mt-8 min-h-12 w-full rounded-full border border-brand-cocoa px-6 text-sm font-medium disabled:opacity-50"
            >
              Sign Out
            </button>
          </aside>
        </div>
      </div>
    </section>
  );
}