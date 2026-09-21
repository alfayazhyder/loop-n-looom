"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  function closeMenu() {
    setIsOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center text-brand-cocoa lg:hidden"
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
      >
        <Menu size={22} strokeWidth={1.8} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={closeMenu}
            className="absolute inset-0 bg-black/20"
          />

          <div className="absolute left-0 top-0 flex h-full w-[85%] max-w-sm flex-col bg-brand-cream shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EADFD8] px-6 py-5">
              <p className="font-serif text-xl text-brand-cocoa">
                LOOP_N_LOOOM
              </p>

              <button
                type="button"
                onClick={closeMenu}
                className="inline-flex items-center justify-center text-brand-cocoa"
                aria-label="Close navigation menu"
              >
                <X size={22} strokeWidth={1.8} />
              </button>
            </div>

            <nav className="flex flex-col px-6 py-6 text-base text-brand-cocoa">
              <Link
                href="/shop"
                onClick={closeMenu}
                className="border-b border-[#EADFD8] py-4"
              >
                Shop
              </Link>

              <Link
                href="/occasions"
                onClick={closeMenu}
                className="border-b border-[#EADFD8] py-4"
              >
                Occasions
              </Link>

              <Link
                href="/build-a-bouquet"
                onClick={closeMenu}
                className="border-b border-[#EADFD8] py-4"
              >
                Build a Bouquet
              </Link>

              <Link
                href="/custom-crochet"
                onClick={closeMenu}
                className="border-b border-[#EADFD8] py-4"
              >
                Custom Orders
              </Link>

              <Link
                href="/about"
                onClick={closeMenu}
                className="border-b border-[#EADFD8] py-4"
              >
                About
              </Link>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}