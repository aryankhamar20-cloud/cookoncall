"use client";

import { MapPin, Home, Briefcase, Edit2, Trash2, Star } from "lucide-react";
import type { Address } from "@/types";
import { formatAddressLine } from "@/types";

interface AddressCardProps {
  address: Address;
  selected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSetDefault?: () => void;
  /** If true, render as a selectable radio row (booking flow). Otherwise render as a management card (profile). */
  mode?: "select" | "manage";
}

export default function AddressCard({
  address,
  selected = false,
  onSelect,
  onEdit,
  onDelete,
  onSetDefault,
  mode = "manage",
}: AddressCardProps) {
  const Icon =
    address.label === "home" ? Home : address.label === "work" ? Briefcase : MapPin;

  const labelText =
    address.label === "home" ? "Home" : address.label === "work" ? "Work" : "Other";

  if (mode === "select") {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={`w-full text-left rounded-lg border-2 p-3 transition ${
          selected
            ? "border-[var(--orange-500)] bg-[rgba(212,114,26,0.06)] ring-2 ring-[rgba(212,114,26,0.2)]"
            : "border-[var(--cream-300)] bg-white hover:border-[var(--text-muted)]"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              selected ? "border-[var(--orange-500)] bg-[var(--orange-500)]" : "border-[var(--cream-300)] bg-white"
            }`}
          >
            {selected && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="text-sm font-semibold text-[var(--text-dark)]">{labelText}</span>
              {address.is_default && (
                <span className="text-[10px] font-bold uppercase bg-[rgba(29,122,90,0.12)] text-[var(--green-ok)] px-1.5 py-0.5 rounded">
                  Default
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-2">
              {formatAddressLine(address)}
            </p>
            {address.contact_phone && (
              <p className="text-xs text-[var(--text-muted)] mt-1">📞 {address.contact_phone}</p>
            )}
          </div>
        </div>
      </button>
    );
  }

  // manage mode
  return (
    <div className="rounded-lg border-2 border-[var(--cream-300)] bg-white p-4 hover:border-[var(--text-muted)] transition">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-[var(--orange-500)]" />
          <span className="text-sm font-bold text-[var(--text-dark)]">{labelText}</span>
          {address.is_default && (
            <span className="text-[10px] font-bold uppercase bg-[rgba(29,122,90,0.12)] text-[var(--green-ok)] px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5 fill-[var(--green-ok)]" />
              Default
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1.5 hover:bg-[var(--cream-200)] rounded text-[var(--text-muted)]"
              title="Edit"
              aria-label="Edit address"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 hover:bg-[rgba(217,48,37,0.08)] rounded text-[var(--red-err)]"
              title="Delete"
              aria-label="Delete address"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-[var(--text-muted)] leading-relaxed">
        {formatAddressLine(address)}
      </p>

      {address.contact_name && (
        <p className="text-xs text-[var(--text-muted)] mt-2">
          Contact: <span className="font-medium">{address.contact_name}</span>
          {address.contact_phone && ` · ${address.contact_phone}`}
        </p>
      )}

      {!address.is_default && onSetDefault && (
        <button
          onClick={onSetDefault}
          className="mt-3 text-xs font-semibold text-[var(--orange-500)] hover:text-[var(--orange-400)]"
        >
          Set as default
        </button>
      )}
    </div>
  );
}
