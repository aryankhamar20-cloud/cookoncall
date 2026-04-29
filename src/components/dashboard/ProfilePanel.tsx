"use client";

import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/authStore";
import { usersApi, authApi, uploadsApi, addressesApi } from "@/lib/api";
import { getInitials } from "@/lib/utils";
import { Phone, AlertCircle, Edit3, Save, X, Mail, ShieldCheck, ShieldAlert, RefreshCw, Camera, Loader2, MapPin, Plus } from "lucide-react";
import { ProfileCardSkeleton } from "@/components/ui/Skeleton";
import AddressCard from "@/components/ui/AddressCard";
import AddressModal from "@/components/modals/AddressModal";
import type { Address } from "@/types";
import toast from "react-hot-toast";

// Image compression helper
async function compressImage(file: File, maxWidth = 400, quality = 0.75): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        if (blob) resolve(new File([blob], file.name, { type: "image/jpeg" }));
        else resolve(file);
      }, "image/jpeg", quality);
    };
    img.src = URL.createObjectURL(file);
  });
}

export default function ProfilePanel() {
  const { user, isLoading, setUser } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Addresses state ────────────────────────────────
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  // Round A Fix #4: On mount, re-fetch user data from backend to get latest email_verified status
  useEffect(() => {
    async function refreshUser() {
      try {
        const { data } = await authApi.getMe();
        const userData = data.data || data;
        if (userData && user) {
          setUser({ ...user, ...userData });
        }
      } catch {
        // Silent fail — user data already loaded from store
      }
    }
    if (user) {
      refreshUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch addresses on mount
  useEffect(() => {
    if (user) loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function loadAddresses() {
    try {
      setAddressesLoading(true);
      const { data } = await addressesApi.getAll();
      const list = data?.data ?? data ?? [];
      setAddresses(Array.isArray(list) ? list : []);
    } catch {
      // Silent fail — addresses might not exist yet
    } finally {
      setAddressesLoading(false);
    }
  }

  function openAddAddress() {
    if (addresses.length >= 5) {
      toast.error("You can save a maximum of 5 addresses. Please delete one first.");
      return;
    }
    setEditingAddress(null);
    setAddressModalOpen(true);
  }

  function openEditAddress(a: Address) {
    setEditingAddress(a);
    setAddressModalOpen(true);
  }

  function handleAddressSaved() {
    loadAddresses();
  }

  async function handleDeleteAddress(a: Address) {
    if (!confirm("Delete this address? This cannot be undone.")) return;
    try {
      await addressesApi.delete(a.id);
      toast.success("Address deleted.");
      loadAddresses();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete.");
    }
  }

  async function handleSetDefaultAddress(a: Address) {
    try {
      await addressesApi.setDefault(a.id);
      toast.success("Default address updated.");
      loadAddresses();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update.");
    }
  }

  if (isLoading) return <ProfileCardSkeleton />;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="w-10 h-10 text-[var(--orange-400)] mb-3" />
        <p className="text-[0.9rem] text-[var(--text-muted)]">
          Could not load your profile. Please try signing in again.
        </p>
      </div>
    );
  }

  const initials = getInitials(user.name, user.lastName);
  const fullName = `${user.name} ${user.lastName || ""}`.trim();

  const emailVerified = (user as any).email_verified === true || (user as any).emailVerified === true;
  const phoneVerified = user.isPhoneVerified === true || (user as any).phone_verified === true;

  function startEdit() {
    setEditName(user!.name || "");
    setEditPhone(user!.phone || "");
    setEditing(true);
  }

  async function handleSave() {
    if (!editName.trim()) { toast.error("Name cannot be empty."); return; }
    setSaving(true);
    try {
      const { data } = await usersApi.updateMe({ name: editName.trim(), phone: editPhone.trim() || undefined });
      const updated = data?.data || data;
      setUser({ ...user!, name: updated.name || editName, phone: updated.phone || editPhone });
      setEditing(false);
      toast.success("Profile updated!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setAvatarUploading(true);
      const compressed = await compressImage(file, 400, 0.8);
      const { data } = await uploadsApi.uploadAvatar(compressed);
      const url = data?.data?.url || data?.url;
      if (url) {
        await usersApi.updateMe({ avatar: url });
        setUser({ ...user!, avatar: url });
        toast.success("Profile photo updated!");
      }
    } catch {
      toast.error("Could not upload photo. Try again.");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleRefreshProfile() {
    setRefreshing(true);
    try {
      const { data } = await authApi.getMe();
      const userData = data.data || data;
      if (userData) {
        setUser({ ...user!, ...userData });
        toast.success("Profile refreshed!");
      }
    } catch {
      toast.error("Failed to refresh profile.");
    } finally {
      setRefreshing(false);
    }
  }

  const handleLogout = () => {
    useAuthStore.getState().logout();
    window.location.href = "/login";
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bg-white rounded-[16px] overflow-hidden border border-[rgba(212,114,26,0.06)]">
          <div className="h-[80px] bg-gradient-to-br from-[#FFE4B5] to-[#FFB347] relative">
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
              <div className="relative">
                {user.avatar ? (
                  <img src={user.avatar} alt={fullName}
                    className="w-16 h-16 rounded-full object-cover border-4 border-white" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--orange-500)] to-[var(--orange-400)] flex items-center justify-center font-display font-[800] text-xl text-white border-4 border-white">
                    {initials}
                  </div>
                )}
                <button onClick={() => fileInputRef.current?.click()} disabled={avatarUploading}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border border-[var(--cream-300)] flex items-center justify-center cursor-pointer hover:bg-[var(--cream-100)] disabled:opacity-50"
                  title="Change photo">
                  {avatarUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--orange-500)]" /> : <Camera className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
            </div>
          </div>

          {!editing ? (
            <div className="pt-12 pb-6 px-6 text-center">
              <div className="font-bold text-[1.1rem]">{fullName}</div>
              <div className="text-[0.85rem] text-[var(--text-muted)] mt-1 flex items-center gap-1.5 justify-center">
                <Mail className="w-3.5 h-3.5" /> {user.email || "—"}
                {emailVerified ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-500 ml-1" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-yellow-500 ml-1" />
                )}
              </div>
              {user.phone && (
                <div className="text-[0.82rem] text-[var(--text-muted)] mt-0.5 flex items-center gap-1.5 justify-center">
                  <Phone className="w-3.5 h-3.5" /> {user.phone}
                  {phoneVerified && <ShieldCheck className="w-4 h-4 text-emerald-500 ml-1" />}
                </div>
              )}

              <div className="flex gap-2 justify-center mt-4">
                {emailVerified ? (
                  <span className="px-3 py-1 rounded-full text-[0.72rem] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Email verified
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-[0.72rem] font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200">
                    Email not verified
                  </span>
                )}
              </div>

              <div className="flex gap-2 justify-center mt-5">
                <button onClick={startEdit}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[0.85rem] font-semibold text-[var(--orange-500)] bg-[rgba(212,114,26,0.06)] border border-[rgba(212,114,26,0.1)] cursor-pointer transition-all hover:bg-[rgba(212,114,26,0.12)]"
                  style={{ fontFamily: "var(--font-body)" }}>
                  <Edit3 className="w-4 h-4" /> Edit Profile
                </button>
                <button onClick={handleRefreshProfile} disabled={refreshing}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-full text-[0.85rem] font-semibold text-[var(--text-muted)] bg-[var(--cream-100)] border border-[var(--cream-300)] cursor-pointer transition-all hover:bg-[var(--cream-200)] disabled:opacity-60"
                  style={{ fontFamily: "var(--font-body)" }}
                  title="Refresh profile data">
                  <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-12 pb-6 px-6">
              <div className="mb-4">
                <label className="block font-semibold text-[0.85rem] mb-1.5 text-[var(--text-dark)]">Name</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 border-[1.5px] border-[var(--cream-300)] rounded-[12px] text-[0.95rem] bg-white outline-none focus:border-[var(--orange-500)]"
                  style={{ fontFamily: "var(--font-body)" }} />
              </div>
              <div className="mb-4">
                <label className="block font-semibold text-[0.85rem] mb-1.5 text-[var(--text-dark)]">Phone</label>
                <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="98XXXXXXXX"
                  className="w-full px-4 py-3 border-[1.5px] border-[var(--cream-300)] rounded-[12px] text-[0.95rem] bg-white outline-none focus:border-[var(--orange-500)]"
                  style={{ fontFamily: "var(--font-body)" }} />
              </div>
              <div className="mb-4">
                <label className="block font-semibold text-[0.85rem] mb-1.5 text-[var(--text-dark)]">Email</label>
                <input type="email" value={user.email} disabled
                  className="w-full px-4 py-3 border-[1.5px] border-[var(--cream-200)] rounded-[12px] text-[0.95rem] bg-[var(--cream-100)] text-[var(--text-muted)] outline-none cursor-not-allowed"
                  style={{ fontFamily: "var(--font-body)" }} />
                <p className="text-[0.75rem] text-[var(--text-muted)] mt-1">Email cannot be changed</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-[12px] bg-[var(--orange-500)] text-white font-semibold text-[0.88rem] border-none cursor-pointer transition-all hover:bg-[var(--orange-400)] disabled:opacity-60"
                  style={{ fontFamily: "var(--font-body)" }}>
                  <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
                </button>
                <button onClick={() => setEditing(false)}
                  className="px-5 py-3 rounded-[12px] bg-white border-[1.5px] border-[var(--cream-300)] text-[var(--text-muted)] font-semibold text-[0.88rem] cursor-pointer transition-all hover:border-[var(--text-muted)]"
                  style={{ fontFamily: "var(--font-body)" }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="bg-white rounded-[16px] border border-[rgba(212,114,26,0.06)] p-6">
          <h3 className="font-bold text-[0.95rem] mb-5">Settings</h3>

          {[
            { title: "Push Notifications", desc: "Booking updates", defaultChecked: true },
            { title: "WhatsApp Confirmations", desc: "Send booking details to WhatsApp", defaultChecked: true },
            { title: "Email Notifications", desc: "Receipts & confirmations", defaultChecked: true },
          ].map((setting) => (
            <div key={setting.title}
              className="flex items-center justify-between py-4 border-b border-[rgba(212,114,26,0.06)] last:border-none">
              <div>
                <div className="font-semibold text-[0.9rem]">{setting.title}</div>
                <div className="text-[0.78rem] text-[var(--text-muted)]">{setting.desc}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked={setting.defaultChecked} className="sr-only peer" />
                <div className="w-11 h-6 bg-[var(--cream-300)] peer-focus:ring-2 peer-focus:ring-[rgba(212,114,26,0.2)] rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-[var(--orange-500)] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
              </label>
            </div>
          ))}

          <button onClick={handleLogout}
            className="mt-6 w-full py-2.5 rounded-full border border-red-200 text-red-500 text-[0.85rem] font-semibold cursor-pointer hover:bg-red-50 transition-all bg-transparent">
            Sign Out
          </button>
        </div>

        {/* ─── My Addresses (full width across both columns) ─── */}
        <div className="md:col-span-2 bg-white rounded-[16px] border border-[rgba(212,114,26,0.06)] p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[var(--orange-500)]" />
              <h3 className="font-bold text-[0.95rem]">My Addresses</h3>
              <span className="text-[0.72rem] text-[var(--text-muted)]">
                {addresses.length}/5
              </span>
            </div>
            <button
              onClick={openAddAddress}
              disabled={addresses.length >= 5}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[0.82rem] font-semibold text-white bg-[var(--orange-500)] hover:bg-[var(--orange-400)] transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: "var(--font-body)" }}
            >
              <Plus className="w-3.5 h-3.5" /> Add New
            </button>
          </div>

          {addressesLoading ? (
            <div className="py-8 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--orange-500)]" />
            </div>
          ) : addresses.length === 0 ? (
            <div className="py-10 text-center border-2 border-dashed border-[var(--cream-300)] rounded-[12px]">
              <MapPin className="w-8 h-8 text-[var(--cream-300)] mx-auto mb-2" />
              <p className="text-[0.88rem] text-[var(--text-muted)] mb-1">
                No saved addresses yet.
              </p>
              <p className="text-[0.78rem] text-[var(--text-muted)]">
                Add your first address to book chefs faster.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {addresses.map((a) => (
                <AddressCard
                  key={a.id}
                  address={a}
                  mode="manage"
                  onEdit={() => openEditAddress(a)}
                  onDelete={() => handleDeleteAddress(a)}
                  onSetDefault={() => handleSetDefaultAddress(a)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Address modal */}
      <AddressModal
        isOpen={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        existingAddress={editingAddress}
        onSaved={handleAddressSaved}
      />
    </>
  );
}
