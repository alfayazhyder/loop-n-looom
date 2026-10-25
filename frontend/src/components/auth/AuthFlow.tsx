"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowRight,
  Heart,
  LockKeyhole,
  Mail,
} from "lucide-react";

import { apiJson } from "@/lib/api";

type AuthMode =
  | "login"
  | "register"
  | "verify"
  | "forgot"
  | "reset";

interface Props {
  mode: AuthMode;
}

const details: Record<
  AuthMode,
  {
    eyebrow: string;
    title: string;
    description: string;
    button: string;
  }
> = {
  login: {
    eyebrow: "Welcome back",
    title: "Sign in to your account",
    description:
      "Your handmade favourites, orders and thoughtful gifts are waiting.",
    button: "Sign In",
  },
  register: {
    eyebrow: "Join the LOOP_N_LOOOM family",
    title: "Create your account",
    description:
      "Save your favourite creations and enjoy a more personal gifting experience.",
    button: "Create Account",
  },
  verify: {
    eyebrow: "One more little step",
    title: "Verify your email",
    description:
      "Enter the six-digit verification code sent to your email.",
    button: "Verify Email",
  },
  forgot: {
    eyebrow: "Account recovery",
    title: "Forgot your password?",
    description:
      "We'll help you securely recover access to your account.",
    button: "Send Reset Code",
  },
  reset: {
    eyebrow: "A fresh beginning",
    title: "Reset your password",
    description:
      "Enter your recovery code and choose a new password.",
    button: "Reset Password",
  },
};

function InputField({
  label,
  value,
  onChange,
  type = "text",
  required = true,
  autoComplete,
  minLength,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
  maxLength?: number;
}) {
  return (
    <label className="block text-sm font-medium text-brand-cocoa">
      {label}

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        required={required}
        autoComplete={autoComplete}
        minLength={minLength}
        maxLength={maxLength}
        className="mt-2 min-h-12 w-full rounded-2xl border border-[#EADFD8] bg-brand-cream px-4 text-sm outline-none transition-colors focus:border-brand-cocoa"
      />
    </label>
  );
}

export default function AuthFlow({
  mode,
}: Props) {
  const router = useRouter();
  const content = details[mode];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(
        window.location.search,
      );

      const providedEmail = params.get("email");

      if (providedEmail) {
        setEmail(providedEmail);
      }

      if (params.has("verified")) {
        setMessage(
          "Your email is verified. You can now sign in.",
        );
      }

      if (params.has("reset")) {
        setMessage(
          "Your password was reset. Please sign in.",
        );
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const cleanEmail =
        email.trim().toLowerCase();

      switch (mode) {
        case "login": {
          await apiJson(
            "/api/auth/login",
            "POST",
            {
              email: cleanEmail,
              password,
            },
          );

          router.push("/account");
          router.refresh();
          break;
        }

        case "register": {
          if (password !== confirmPassword) {
            throw new Error(
              "Your passwords do not match.",
            );
          }

          await apiJson(
            "/api/auth/register",
            "POST",
            {
              email: cleanEmail,
              password,
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              ...(phone.trim()
                ? { phone: phone.trim() }
                : {}),
            },
          );

          router.push(
            `/verify-email?email=${encodeURIComponent(cleanEmail)}`,
          );

          break;
        }

        case "verify": {
          await apiJson(
            "/api/auth/verify-email",
            "POST",
            {
              email: cleanEmail,
              code: code.trim(),
            },
          );

          router.push(
            `/login?verified=1&email=${encodeURIComponent(cleanEmail)}`,
          );

          break;
        }

        case "forgot": {
          await apiJson(
            "/api/auth/forgot-password",
            "POST",
            {
              email: cleanEmail,
            },
          );

          setMessage(
            "If this email belongs to an eligible account, password-reset instructions will be sent.",
          );

          break;
        }

        case "reset": {
          if (password !== confirmPassword) {
            throw new Error(
              "Your passwords do not match.",
            );
          }

          await apiJson(
            "/api/auth/reset-password",
            "POST",
            {
              email: cleanEmail,
              code: code.trim(),
              newPassword: password,
            },
          );

          router.push(
            `/login?reset=1&email=${encodeURIComponent(cleanEmail)}`,
          );

          break;
        }
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to complete your request.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    if (!email.trim() || busy) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      await apiJson(
        "/api/auth/resend-verification",
        "POST",
        {
          email: email.trim().toLowerCase(),
        },
      );

      setMessage(
        "If your account needs verification, a new code has been sent.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not resend the code.",
      );
    } finally {
      setBusy(false);
    }
  }

  const showNames = mode === "register";
  const showPassword =
    mode === "login" ||
    mode === "register" ||
    mode === "reset";

  const showCode =
    mode === "verify" ||
    mode === "reset";

  return (
    <section className="min-h-[78vh] bg-brand-cream py-12 sm:py-20">
      <div className="page-container">
        <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2.5rem] border border-[#EADFD8] bg-white shadow-[0_15px_50px_rgba(74,59,50,0.06)] lg:grid-cols-2">
          <div className="hidden flex-col justify-between bg-brand-blush p-12 lg:flex">
            <div>
              <Heart
                size={36}
                strokeWidth={1.3}
                className="text-brand-cocoa"
              />

              <p className="mt-10 text-xs font-semibold uppercase tracking-[0.24em] text-[#8A7B72]">
                LOOP_N_LOOOM
              </p>

              <h2 className="mt-6 font-serif text-5xl leading-tight">
                Handmade with love.
                <span className="mt-3 block italic">
                  Remembered forever.
                </span>
              </h2>

              <p className="mt-8 max-w-sm text-sm leading-8 text-[#6B5A50]">
                Thoughtful crochet creations,
                customised gifts and heartfelt
                surprises made for beautiful moments.
              </p>
            </div>

            <p className="mt-12 text-xs text-[#8A7B72]">
              Premium handmade gifting across the UAE.
            </p>
          </div>

          <div className="px-6 py-10 sm:px-12 sm:py-14">
            <div className="mb-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blush">
                {mode === "login" ||
                mode === "register" ? (
                  <Heart size={22} />
                ) : mode === "verify" ||
                  mode === "forgot" ? (
                  <Mail size={22} />
                ) : (
                  <LockKeyhole size={22} />
                )}
              </div>

              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8A7B72]">
                {content.eyebrow}
              </p>

              <h1 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">
                {content.title}
              </h1>

              <p className="mt-4 text-sm leading-7 text-[#6B5A50]">
                {content.description}
              </p>
            </div>

            <form
              onSubmit={submit}
              className="space-y-5"
            >
              {showNames && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <InputField
                    label="First name"
                    value={firstName}
                    onChange={setFirstName}
                    autoComplete="given-name"
                    maxLength={80}
                  />

                  <InputField
                    label="Last name"
                    value={lastName}
                    onChange={setLastName}
                    autoComplete="family-name"
                    maxLength={80}
                  />
                </div>
              )}

              <InputField
                label="Email address"
                value={email}
                onChange={setEmail}
                type="email"
                autoComplete="email"
              />

              {showNames && (
                <InputField
                  label="Phone number (optional)"
                  value={phone}
                  onChange={setPhone}
                  type="tel"
                  required={false}
                  autoComplete="tel"
                />
              )}

              {showCode && (
                <InputField
                  label="Six-digit verification code"
                  value={code}
                  onChange={setCode}
                  type="text"
                  autoComplete="one-time-code"
                  minLength={6}
                  maxLength={6}
                />
              )}

              {showPassword && (
                <InputField
                  label={
                    mode === "reset"
                      ? "New password"
                      : "Password"
                  }
                  value={password}
                  onChange={setPassword}
                  type="password"
                  autoComplete={
                    mode === "login"
                      ? "current-password"
                      : "new-password"
                  }
                  minLength={mode === "login" ? undefined : 8}
                />
              )}

              {(mode === "register" ||
                mode === "reset") && (
                <InputField
                  label="Confirm password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                />
              )}

              {error && (
                <p
                  role="alert"
                  className="rounded-2xl border border-[#F1D8D8] bg-[#FFF5F5] p-4 text-sm text-[#A95757]"
                >
                  {error}
                </p>
              )}

              {message && (
                <p
                  role="status"
                  className="rounded-2xl border border-[#DDE9DF] bg-[#F0F7F1] p-4 text-sm text-[#557A61]"
                >
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-brand-cocoa px-6 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {busy
                  ? "Please wait..."
                  : content.button}

                {!busy && (
                  <ArrowRight size={19} />
                )}
              </button>
            </form>

            {mode === "login" && (
              <div className="mt-6 space-y-4 text-center text-sm">
                <Link
                  href="/forgot-password"
                  className="block underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </Link>

                <p className="text-[#6B5A50]">
                  New to LOOP_N_LOOOM?{" "}
                  <Link
                    href="/register"
                    className="font-semibold text-brand-cocoa underline"
                  >
                    Create an account
                  </Link>
                </p>

                <Link
                  href="/verify-email"
                  className="block text-xs underline-offset-4 hover:underline"
                >
                  Need to verify your email?
                </Link>
              </div>
            )}

            {mode === "register" && (
              <p className="mt-6 text-center text-sm text-[#6B5A50]">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-semibold underline"
                >
                  Sign in
                </Link>
              </p>
            )}

            {mode === "verify" && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => void resendCode()}
                  disabled={busy}
                  className="text-sm font-medium underline disabled:opacity-50"
                >
                  Resend verification code
                </button>
              </div>
            )}

            {mode === "forgot" && (
              <Link
                href="/reset-password"
                className="mt-6 block text-center text-sm font-medium underline"
              >
                Already have a reset code?
              </Link>
            )}

            {mode !== "register" &&
              mode !== "login" && (
                <Link
                  href="/login"
                  className="mt-6 block text-center text-sm text-[#6B5A50] underline-offset-4 hover:underline"
                >
                  Return to sign in
                </Link>
              )}
          </div>
        </div>
      </div>
    </section>
  );
}