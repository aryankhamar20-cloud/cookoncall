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
            ? "border-orange-500 bg-orange-50 ring-2 ring-orange-200"
            : "border-gray-200 bg-white hover:border-gray-300"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              selected ? "border-orange-600 bg-orange-600" : "border-gray-300 bg-white"
            }`}
          >
            {selected && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-3.5 h-3.5 text-gray-600" />
              <span className="text-sm font-semibold text-gray-900">{labelText}</span>
              {address.is_default && (
                <span className="text-[10px] font-bold uppercase bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                  Default
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
              {formatAddressLine(address)}
            </p>
            {address.contact_phone && (
              <p className="text-xs text-gray-500 mt-1">📞 {address.contact_phone}</p>
            )}
          </div>
        </div>
      </button>
    );
  }

  // manage mode
  return (
    <div className="rounded-lg border-2 border-gray-200 bg-white p-4 hover:border-gray-300 transition">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-orange-600" />
          <span className="text-sm font-bold text-gray-900">{labelText}</span>
          {address.is_default && (
            <span className="text-[10px] font-bold uppercase bg-green-100 text-green-700 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5 fill-green-700" />
              Default
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-600"
              title="Edit"
              aria-label="Edit address"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 hover:bg-red-50 rounded text-red-600"
              title="Delete"
              aria-label="Delete address"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-700 leading-relaxed">
        {formatAddressLine(address)}
      </p>

      {address.contact_name && (
        <p className="text-xs text-gray-500 mt-2">
          Contact: <span className="font-medium">{address.contact_name}</span>
          {address.contact_phone && ` · ${address.contact_phone}`}
        </p>
      )}

      {!address.is_default && onSetDefault && (
        <button
          onClick={onSetDefault}
          className="mt-3 text-xs font-semibold text-orange-600 hover:text-orange-700"
        >
          Set as default
        </button>
      )}
    </div>
  );
}
