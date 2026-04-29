"use client";

import { useState, useEffect } from "react";
import { X, MapPin, Loader2, CheckCircle2, Navigation } from "lucide-react";
import toast from "react-hot-toast";
import type { Address, AddressFormData, AddressLabel } from "@/types";
import { ADDRESS_LABELS } from "@/types";
import { addressesApi, lookupPincode, areasApi, type ServiceAreaDto } from "@/lib/api";

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** If provided, modal is in edit mode */
  existingAddress?: Address | null;
  /** Called on successful save with the saved address */
  onSaved: (address: Address) => void;
}

const EMPTY: AddressFormData = {
  label: "home",
  contact_name: "",
  contact_phone: "",
  house_no: "",
  street: "",
  landmark: "",
  area: "",
  city: "",
  state: "",
  pincode: "",
  is_default: false,
};

export default function AddressModal({
  isOpen,
  onClose,
  existingAddress,
  onSaved,
}: AddressModalProps) {
  const [form, setForm] = useState<AddressFormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeVerified, setPincodeVerified] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // P1.6 — Service areas
  const [areas, setAreas] = useState<ServiceAreaDto[]>([]);
  const [areasLoading, setAreasLoading] = useState(false);
  // When user picks 'Other', they can request admin to add their area
  const [requestMode, setRequestMode] = useState(false);
  const [requestName, setRequestName] = useState("");
  const [requestSubmitting, setRequestSubmitting] = useState(false);

  // Load active areas (cached at module-level via the simple closure below would be nicer,
  // but staying with per-mount fetch — small payload, ~2KB).
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setAreasLoading(true);
    areasApi.list("Ahmedabad")
      .then((res) => {
        if (cancelled) return;
        const list = (res.data as any)?.data ?? res.data ?? [];
        setAreas(Array.isArray(list) ? list : []);
      })
      .catch(() => { /* silent — fall back to free-text */ })
      .finally(() => { if (!cancelled) setAreasLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen]);

  // Load existing address on open / reset on close
  useEffect(() => {
    if (isOpen && existingAddress) {
      setForm({
        label: existingAddress.label,
        contact_name: existingAddress.contact_name || "",
        contact_phone: existingAddress.contact_phone || "",
        house_no: existingAddress.house_no,
        street: existingAddress.street,
        landmark: existingAddress.landmark || "",
        area: existingAddress.area,
        area_slug: existingAddress.area_slug || undefined,
        city: existingAddress.city,
        state: existingAddress.state,
        pincode: existingAddress.pincode,
        latitude: existingAddress.latitude || undefined,
        longitude: existingAddress.longitude || undefined,
        is_default: existingAddress.is_default,
      });
      setPincodeVerified(true);
    } else if (isOpen) {
      setForm(EMPTY);
      setPincodeVerified(false);
    }
    setErrors({});
  }, [isOpen, existingAddress]);

  // Auto-lookup pincode when 6 digits entered
  useEffect(() => {
    const pc = form.pincode?.trim() || "";
    if (pc.length !== 6 || !/^[1-9][0-9]{5}$/.test(pc)) {
      setPincodeVerified(false);
      return;
    }
    // Don't re-lookup if we're editing and pincode didn't change
    if (existingAddress && existingAddress.pincode === pc) {
      setPincodeVerified(true);
      return;
    }

    let cancelled = false;
    setPincodeLoading(true);
    lookupPincode(pc).then((res) => {
      if (cancelled) return;
      setPincodeLoading(false);
      if (res.valid) {
        setPincodeVerified(true);
        setForm((f) => ({ ...f, city: res.city, state: res.state }));
      } else {
        setPincodeVerified(false);
        toast.error("Invalid pincode. Please check and try again.");
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.pincode]);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported on this device.");
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setForm((f) => ({ ...f, latitude: lat, longitude: lng }));

        // Reverse geocode via Nominatim to pre-fill street/area
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          );
          const j = await res.json();
          const a = j?.address || {};
          setForm((f) => ({
            ...f,
            latitude: lat,
            longitude: lng,
            street: f.street || a.road || a.pedestrian || "",
            area: f.area || a.suburb || a.neighbourhood || a.village || "",
            city: f.city || a.city || a.town || a.county || "",
            state: f.state || a.state || "",
            pincode: f.pincode || a.postcode || "",
          }));
          toast.success("Location detected. Please verify and fill the rest.");
        } catch {
          toast.success("Location captured.");
        } finally {
          setDetectingLocation(false);
        }
      },
      (err) => {
        setDetectingLocation(false);
        if (err.code === 1) toast.error("Location permission denied.");
        else toast.error("Could not detect location.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.house_no.trim()) e.house_no = "Required";
    if (!form.street.trim()) e.street = "Required";
    if (!form.area.trim()) e.area = "Required";
    if (!form.city.trim()) e.city = "Required";
    if (!form.state.trim()) e.state = "Required";
    if (!/^[1-9][0-9]{5}$/.test(form.pincode.trim())) e.pincode = "Invalid pincode";
    if (form.contact_phone && !/^[0-9]{10}$/.test(form.contact_phone.trim())) {
      e.contact_phone = "Must be 10 digits";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) {
      toast.error("Please fix the errors in the form.");
      return;
    }
    if (!pincodeVerified) {
      toast.error("Please wait for pincode verification.");
      return;
    }

    setSaving(true);

    // ─── Silent geocoding fallback ──────────────────────────────
    // If customer typed address manually (no GPS button), try Nominatim
    // forward-geocode using "area, city, pincode" so we still capture
    // approximate lat/lng. Best-effort — failure is silent. This unlocks
    // distance display + future distance-based fees without forcing
    // every customer to grant geolocation permission.
    let resolvedLat = form.latitude;
    let resolvedLng = form.longitude;
    if (resolvedLat == null || resolvedLng == null) {
      try {
        const q = `${form.area}, ${form.city}, ${form.pincode}, India`.trim();
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&countrycodes=in`,
          { headers: { Accept: "application/json" } },
        );
        if (res.ok) {
          const arr = await res.json();
          if (Array.isArray(arr) && arr.length > 0 && arr[0].lat && arr[0].lon) {
            resolvedLat = Number(arr[0].lat);
            resolvedLng = Number(arr[0].lon);
          }
        }
      } catch {
        // silent — Nominatim down or rate-limited; address still saves without coords
      }
    }

    try {
      const payload = {
        label: form.label,
        contact_name: form.contact_name?.trim() || undefined,
        contact_phone: form.contact_phone?.trim() || undefined,
        house_no: form.house_no.trim(),
        street: form.street.trim(),
        landmark: form.landmark?.trim() || undefined,
        area: form.area.trim(),
        area_slug: form.area_slug || undefined,
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        latitude: resolvedLat,
        longitude: resolvedLng,
        is_default: form.is_default,
      };

      const { data } = existingAddress
        ? await addressesApi.update(existingAddress.id, payload)
        : await addressesApi.create(payload);

      const saved: Address = data?.data ?? data;
      toast.success(existingAddress ? "Address updated." : "Address saved.");
      onSaved(saved);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to save address";
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-bold text-gray-900">
              {existingAddress ? "Edit Address" : "Add New Address"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Label chips */}
          <div>
            <label className="text-sm font-semibold text-gray-800 mb-2 block">
              Save as
            </label>
            <div className="flex gap-2">
              {ADDRESS_LABELS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setForm({ ...form, label: l.value })}
                  className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium transition ${
                    form.label === l.value
                      ? "border-orange-500 bg-orange-50 text-orange-700"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <span className="mr-1">{l.emoji}</span>
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Use current location */}
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={detectingLocation}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-orange-300 bg-orange-50 text-orange-700 font-medium text-sm hover:bg-orange-100 transition disabled:opacity-60"
          >
            {detectingLocation ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            {detectingLocation ? "Detecting..." : "Use my current location"}
          </button>

          {/* House + Street */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field
              label="House / Flat No *"
              value={form.house_no}
              onChange={(v) => setForm({ ...form, house_no: v })}
              error={errors.house_no}
              placeholder="A-101"
            />
            <Field
              label="Street / Road *"
              value={form.street}
              onChange={(v) => setForm({ ...form, street: v })}
              error={errors.street}
              placeholder="MG Road"
            />
          </div>

          {/* Landmark */}
          <div>
            <Field
              label="Landmark (optional)"
              value={form.landmark || ""}
              onChange={(v) => setForm({ ...form, landmark: v })}
              placeholder="Near XYZ school"
            />
          </div>

          {/* Area / Locality — P1.6: dropdown + 'Other' request flow */}
          <div>
            <label className="text-sm font-semibold text-gray-800 mb-1 block">
              Area / Locality *
            </label>
            {!requestMode ? (
              <>
                <select
                  value={form.area_slug || (form.area && areas.find(a => a.name === form.area)?.slug) || ""}
                  onChange={(e) => {
                    const slug = e.target.value;
                    if (slug === "__OTHER__") {
                      setRequestMode(true);
                      setRequestName("");
                      setForm((f) => ({ ...f, area_slug: undefined, area: "" }));
                      return;
                    }
                    const picked = areas.find((a) => a.slug === slug);
                    setForm((f) => ({
                      ...f,
                      area_slug: picked?.slug,
                      area: picked?.name || "",
                    }));
                    setErrors((er) => ({ ...er, area: "" }));
                  }}
                  className={`w-full px-3 py-2.5 rounded-lg border-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 ${
                    errors.area ? "border-red-400" : "border-gray-200"
                  }`}
                  disabled={areasLoading}
                >
                  <option value="">
                    {areasLoading ? "Loading areas…" : "Select your area"}
                  </option>
                  {areas.map((a) => (
                    <option key={a.slug} value={a.slug}>
                      {a.name}
                    </option>
                  ))}
                  <option value="__OTHER__">Other (request to add)</option>
                </select>
                {errors.area && (
                  <p className="text-xs text-red-600 mt-1">{errors.area}</p>
                )}
                {form.area && !form.area_slug && (
                  <p className="text-xs text-amber-700 mt-1">
                    Saved area: <span className="font-semibold">{form.area}</span>
                    {" — "}awaiting admin approval. You can still book.
                  </p>
                )}
              </>
            ) : (
              <div className="space-y-2 p-3 bg-orange-50 border-2 border-orange-200 rounded-lg">
                <p className="text-xs text-gray-700">
                  Type your area name below. We'll review and add it within 24 hours.
                  You can still save this address and book chefs in the meantime.
                </p>
                <input
                  type="text"
                  value={requestName}
                  onChange={(e) => setRequestName(e.target.value)}
                  placeholder="e.g. Memnagar"
                  maxLength={100}
                  className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={async () => {
                      const name = requestName.trim();
                      if (!name) {
                        toast.error("Please type the area name.");
                        return;
                      }
                      setRequestSubmitting(true);
                      try {
                        const res = await areasApi.request({ name, city: "Ahmedabad" });
                        const body: any = res.data?.data ?? res.data;
                        if (body?.already_exists && body?.area) {
                          // Backend matched an existing area — auto-pick it.
                          setForm((f) => ({
                            ...f,
                            area_slug: body.area.slug,
                            area: body.area.name,
                          }));
                          setRequestMode(false);
                          toast.success(`'${body.area.name}' is already on our list — selected for you.`);
                          // Refresh areas list in case it was inactive
                          const fresh = await areasApi.list("Ahmedabad");
                          setAreas(((fresh.data as any)?.data ?? fresh.data ?? []) as ServiceAreaDto[]);
                        } else {
                          // New request created OR existing pending request
                          setForm((f) => ({ ...f, area_slug: undefined, area: name }));
                          setRequestMode(false);
                          toast.success(
                            body?.already_requested
                              ? "You already requested this area. It's pending admin review."
                              : "Request sent. Admin will review within 24 hours.",
                          );
                        }
                      } catch (err: any) {
                        toast.error(err?.response?.data?.message || "Could not submit request.");
                      } finally {
                        setRequestSubmitting(false);
                      }
                    }}
                    disabled={requestSubmitting}
                    className="px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 disabled:opacity-50"
                  >
                    {requestSubmitting ? "Submitting…" : "Request & save name"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRequestMode(false);
                      setRequestName("");
                    }}
                    disabled={requestSubmitting}
                    className="px-4 py-2 rounded-lg border-2 border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pincode with autofill */}
          <div>
            <label className="text-sm font-semibold text-gray-800 mb-1 block">
              Pincode *
            </label>
            <div className="relative">
              <input
                type="tel"
                inputMode="numeric"
                maxLength={6}
                value={form.pincode}
                onChange={(e) =>
                  setForm({ ...form, pincode: e.target.value.replace(/\D/g, "") })
                }
                placeholder="380015"
                className={`w-full px-3 py-2.5 pr-10 rounded-lg border-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 ${
                  errors.pincode ? "border-red-400" : "border-gray-200"
                }`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {pincodeLoading && (
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                )}
                {!pincodeLoading && pincodeVerified && form.pincode.length === 6 && (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                )}
              </div>
            </div>
            {errors.pincode && (
              <p className="text-xs text-red-600 mt-1">{errors.pincode}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              City and state will auto-fill from pincode.
            </p>
          </div>

          {/* City + State (auto-filled, still editable) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field
              label="City *"
              value={form.city}
              onChange={(v) => setForm({ ...form, city: v })}
              error={errors.city}
            />
            <Field
              label="State *"
              value={form.state}
              onChange={(v) => setForm({ ...form, state: v })}
              error={errors.state}
            />
          </div>

          {/* Contact (optional override) */}
          <div className="pt-2 border-t">
            <p className="text-xs font-semibold text-gray-600 mb-2">
              Contact at this address (optional — defaults to your account)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                label="Contact Name"
                value={form.contact_name || ""}
                onChange={(v) => setForm({ ...form, contact_name: v })}
                placeholder="Who should the chef ask for?"
              />
              <Field
                label="Contact Phone"
                type="tel"
                value={form.contact_phone || ""}
                onChange={(v) =>
                  setForm({ ...form, contact_phone: v.replace(/\D/g, "") })
                }
                error={errors.contact_phone}
                placeholder="10-digit number"
                maxLength={10}
              />
            </div>
          </div>

          {/* Default toggle */}
          <label className="flex items-center gap-2 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={form.is_default || false}
              onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
              className="w-4 h-4 accent-orange-600"
            />
            <span className="text-sm text-gray-700">
              Make this my default address
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t bg-gray-50 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-lg border-2 border-gray-200 bg-white text-gray-700 font-medium text-sm hover:bg-gray-100 transition disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || pincodeLoading}
            className="flex-1 px-4 py-2.5 rounded-lg bg-orange-600 text-white font-semibold text-sm hover:bg-orange-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {existingAddress ? "Update Address" : "Save Address"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Small text field helper ─────────────────────────────────────
function Field({
  label,
  value,
  onChange,
  error,
  placeholder,
  type = "text",
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  type?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-gray-800 mb-1 block">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`w-full px-3 py-2.5 rounded-lg border-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 ${
          error ? "border-red-400" : "border-gray-200"
        }`}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
