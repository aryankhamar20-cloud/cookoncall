"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus, Pencil, Trash2, Loader2, Save, X, ChevronDown, ChevronUp,
  Leaf, Utensils, Package, Tag, Users, IndianRupee, Info, Check,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { mealPackagesApi } from "@/lib/api";
import type { MealPackage, PackageCategory, PackageAddon, PackageCategoryDish } from "@/types";

// ─── STYLE CONSTANTS ─────────────────────────────────────────────────────────
const inputClass =
  "w-full px-3.5 py-2.5 rounded-[10px] border border-[var(--cream-300)] bg-white text-[0.88rem] text-[var(--text-primary)] focus:outline-none focus:border-[var(--orange-500)] focus:ring-1 focus:ring-[rgba(212,114,26,0.15)] transition-all placeholder:text-[var(--text-muted)]";
const labelClass = "block text-[0.78rem] font-semibold text-[var(--text-muted)] mb-1 uppercase tracking-wide";
const btnPrimary =
  "flex items-center gap-2 px-4 py-2 bg-[var(--orange-500)] text-white rounded-[10px] text-[0.85rem] font-semibold hover:bg-[var(--orange-600)] transition-all disabled:opacity-50 disabled:cursor-not-allowed";
const btnSecondary =
  "flex items-center gap-2 px-4 py-2 bg-white border border-[var(--cream-300)] text-[var(--text-primary)] rounded-[10px] text-[0.85rem] font-semibold hover:border-[var(--orange-500)] transition-all";
const btnDanger =
  "flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-[8px] text-[0.8rem] font-medium hover:bg-red-100 transition-all";
const cardClass =
  "bg-white rounded-[16px] border border-[rgba(212,114,26,0.08)] shadow-sm";

// ─── TYPES ───────────────────────────────────────────────────────────────────
const GUEST_TIERS = [
  { key: "price_2" as const, label: "2 guests" },
  { key: "price_3" as const, label: "3 guests" },
  { key: "price_4" as const, label: "4 guests" },
  { key: "price_5" as const, label: "5 guests" },
];

type PriceKey = "price_2" | "price_3" | "price_4" | "price_5";

type PackageForm = {
  name: string;
  description: string;
  price_2: string;
  price_3: string;
  price_4: string;
  price_5: string;
  extra_person_charge: string;
  is_veg: boolean;
  cuisine: string;
  ingredient_note: string;
};

const emptyPackageForm = (): PackageForm => ({
  name: "",
  description: "",
  price_2: "",
  price_3: "",
  price_4: "",
  price_5: "",
  extra_person_charge: "59",
  is_veg: true,
  cuisine: "",
  ingredient_note: "",
});

// ─── MAIN PANEL ──────────────────────────────────────────────────────────────
export default function MealPackagesPanel() {
  const [packages, setPackages] = useState<MealPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Create / Edit package form state
  const [showForm, setShowForm] = useState(false);
  const [editingPkg, setEditingPkg] = useState<MealPackage | null>(null);
  const [form, setForm] = useState<PackageForm>(emptyPackageForm());
  const [saving, setSaving] = useState(false);

  // ─── FETCH ─────────────────────────────────────────────────────────────
  const fetchPackages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await mealPackagesApi.getMy();
      const data = res.data?.data ?? res.data ?? [];
      setPackages(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Could not load packages.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPackages(); }, [fetchPackages]);

  // ─── OPEN EDIT ─────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingPkg(null);
    setForm(emptyPackageForm());
    setShowForm(true);
  };

  const openEdit = (pkg: MealPackage) => {
    setEditingPkg(pkg);
    setForm({
      name: pkg.name,
      description: pkg.description ?? "",
      price_2: String(pkg.price_2),
      price_3: String(pkg.price_3),
      price_4: String(pkg.price_4),
      price_5: String(pkg.price_5),
      extra_person_charge: String(pkg.extra_person_charge),
      is_veg: pkg.is_veg,
      cuisine: pkg.cuisine ?? "",
      ingredient_note: pkg.ingredient_note ?? "",
    });
    setShowForm(true);
  };

  // ─── SAVE PACKAGE ──────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Package name is required."); return; }
    for (const t of GUEST_TIERS) {
      if (!form[t.key] || Number(form[t.key]) < 1) {
        toast.error(`Price for ${t.label} is required.`);
        return;
      }
    }
    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price_2: Number(form.price_2),
        price_3: Number(form.price_3),
        price_4: Number(form.price_4),
        price_5: Number(form.price_5),
        extra_person_charge: Number(form.extra_person_charge) || 59,
        is_veg: form.is_veg,
        cuisine: form.cuisine.trim() || undefined,
        ingredient_note: form.ingredient_note.trim() || undefined,
      };
      if (editingPkg) {
        await mealPackagesApi.update(editingPkg.id, payload);
        toast.success("Package updated!");
      } else {
        await mealPackagesApi.create(payload);
        toast.success("Package created!");
      }
      setShowForm(false);
      fetchPackages();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not save package.");
    } finally {
      setSaving(false);
    }
  };

  // ─── DELETE PACKAGE ────────────────────────────────────────────────────
  const handleDeletePackage = async (pkg: MealPackage) => {
    if (!confirm(`Delete "${pkg.name}"? This will remove all its categories, dishes, and add-ons.`)) return;
    try {
      await mealPackagesApi.remove(pkg.id);
      toast.success("Package deleted.");
      fetchPackages();
    } catch {
      toast.error("Could not delete package.");
    }
  };

  // ─── TOGGLE ACTIVE ─────────────────────────────────────────────────────
  const handleToggleActive = async (pkg: MealPackage) => {
    try {
      await mealPackagesApi.update(pkg.id, { is_active: !pkg.is_active });
      toast.success(pkg.is_active ? "Package hidden from customers." : "Package is now visible.");
      fetchPackages();
    } catch {
      toast.error("Could not update package.");
    }
  };

  // ─── RENDER ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-7 h-7 animate-spin text-[var(--orange-500)]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[1.1rem] font-bold text-[var(--text-primary)]">Meal Packages</h2>
          <p className="text-[0.82rem] text-[var(--text-muted)] mt-0.5">
            Create pre-priced combos. Customers pick dishes from each category you define.
          </p>
        </div>
        <button onClick={openCreate} className={btnPrimary}>
          <Plus className="w-4 h-4" /> New Package
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-3.5 rounded-[12px] bg-amber-50 border border-amber-200 text-[0.82rem] text-amber-800">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          <strong>Hybrid model:</strong> You provide labor + travel. Customer sources ingredients.
          Ingredient list is sent via WhatsApp + email 2 hours before the session.
        </span>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className={cn(cardClass, "p-5 border-[var(--orange-300)]")}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[0.95rem] font-bold text-[var(--text-primary)]">
              {editingPkg ? "Edit Package" : "Create Package"}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div className="sm:col-span-2">
              <label className={labelClass}>Package Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Gujarati Family Thali"
                className={inputClass}
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className={labelClass}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="A short description of what's included..."
                rows={2}
                className={cn(inputClass, "resize-none")}
              />
            </div>

            {/* Veg / Non-Veg toggle */}
            <div className="sm:col-span-2">
              <label className={labelClass}>Type</label>
              <div className="flex gap-3">
                {[{ v: true, l: "🟢 Pure Veg" }, { v: false, l: "🍗 Non-Veg" }].map((t) => (
                  <button
                    key={String(t.v)}
                    onClick={() => setForm((f) => ({ ...f, is_veg: t.v }))}
                    className={cn(
                      "flex-1 py-2.5 rounded-[10px] border-[1.5px] text-[0.85rem] font-semibold transition-all",
                      form.is_veg === t.v
                        ? "border-[var(--orange-500)] bg-[rgba(212,114,26,0.04)] text-[var(--orange-500)]"
                        : "border-[var(--cream-300)] bg-white text-[var(--text-muted)] hover:border-[var(--orange-500)]"
                    )}
                  >
                    {t.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Cuisine */}
            <div>
              <label className={labelClass}>Cuisine</label>
              <input
                type="text"
                value={form.cuisine}
                onChange={(e) => setForm((f) => ({ ...f, cuisine: e.target.value }))}
                placeholder="e.g. Gujarati, Punjabi"
                className={inputClass}
              />
            </div>

            {/* Extra person charge */}
            <div>
              <label className={labelClass}>Extra Person Charge (beyond 5)</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
                <input
                  type="number"
                  min="0"
                  value={form.extra_person_charge}
                  onChange={(e) => setForm((f) => ({ ...f, extra_person_charge: e.target.value }))}
                  className={cn(inputClass, "pl-8")}
                />
              </div>
            </div>

            {/* Guest-tier prices */}
            <div className="sm:col-span-2">
              <label className={labelClass}>Prices by Guest Count *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {GUEST_TIERS.map((t) => (
                  <div key={t.key}>
                    <p className="text-[0.75rem] text-[var(--text-muted)] mb-1 font-medium">{t.label}</p>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <input
                        type="number"
                        min="1"
                        value={form[t.key]}
                        onChange={(e) => setForm((f) => ({ ...f, [t.key]: e.target.value }))}
                        placeholder="0"
                        className={cn(inputClass, "pl-8")}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ingredient note */}
            <div className="sm:col-span-2">
              <label className={labelClass}>Ingredient Note (sent 2h before session)</label>
              <textarea
                value={form.ingredient_note}
                onChange={(e) => setForm((f) => ({ ...f, ingredient_note: e.target.value }))}
                placeholder="e.g. 500g paneer, 1kg basmati rice, 200ml cream..."
                rows={3}
                className={cn(inputClass, "resize-none")}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button onClick={handleSave} disabled={saving} className={btnPrimary}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving..." : editingPkg ? "Update Package" : "Create Package"}
            </button>
            <button onClick={() => setShowForm(false)} className={btnSecondary}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Package list */}
      {packages.length === 0 && !showForm ? (
        <div className={cn(cardClass, "p-12 text-center")}>
          <Package className="w-10 h-10 mx-auto mb-3 opacity-30 text-[var(--orange-500)]" />
          <p className="text-[0.9rem] text-[var(--text-muted)]">No packages yet.</p>
          <p className="text-[0.8rem] text-[var(--text-muted)] mt-1">
            Create your first pre-priced meal combo.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              expanded={expandedId === pkg.id}
              onToggleExpand={() => setExpandedId((id) => (id === pkg.id ? null : pkg.id))}
              onEdit={() => openEdit(pkg)}
              onDelete={() => handleDeletePackage(pkg)}
              onToggleActive={() => handleToggleActive(pkg)}
              onRefresh={fetchPackages}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PACKAGE CARD ─────────────────────────────────────────────────────────────
function PackageCard({
  pkg,
  expanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onToggleActive,
  onRefresh,
}: {
  pkg: MealPackage;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className={cn(cardClass, !pkg.is_active && "opacity-60")}>
      {/* Card header */}
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[0.95rem] font-bold text-[var(--text-primary)] truncate">{pkg.name}</h3>
            {pkg.is_veg ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[0.7rem] font-semibold border border-green-200 shrink-0">
                <Leaf className="w-3 h-3" /> Veg
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[0.7rem] font-semibold border border-red-200 shrink-0">
                <Utensils className="w-3 h-3" /> Non-Veg
              </span>
            )}
            {!pkg.is_active && (
              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[0.7rem] font-semibold border border-gray-200 shrink-0">
                Hidden
              </span>
            )}
          </div>
          {pkg.cuisine && (
            <p className="text-[0.78rem] text-[var(--text-muted)] mt-0.5">{pkg.cuisine}</p>
          )}
          {/* Price tiers summary */}
          <div className="flex flex-wrap gap-2 mt-2">
            {GUEST_TIERS.map((t) => (
              <span
                key={t.key}
                className="text-[0.75rem] text-[var(--text-muted)] bg-[var(--cream-100)] px-2 py-0.5 rounded-full"
              >
                {t.label}: <span className="font-semibold text-[var(--text-primary)]">₹{pkg[t.key as PriceKey]}</span>
              </span>
            ))}
            <span className="text-[0.75rem] text-[var(--text-muted)] bg-[var(--cream-100)] px-2 py-0.5 rounded-full">
              +₹{pkg.extra_person_charge}/extra
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleActive}
            title={pkg.is_active ? "Hide from customers" : "Show to customers"}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center border transition-all text-[0.7rem]",
              pkg.is_active
                ? "bg-green-50 border-green-200 text-green-600 hover:bg-green-100"
                : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"
            )}
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={onEdit} className="w-8 h-8 rounded-full flex items-center justify-center border border-[var(--cream-300)] bg-white hover:border-[var(--orange-500)] transition-all">
            <Pencil className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </button>
          <button onClick={onDelete} className="w-8 h-8 rounded-full flex items-center justify-center border border-red-200 bg-red-50 hover:bg-red-100 transition-all">
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </button>
          <button
            onClick={onToggleExpand}
            className="w-8 h-8 rounded-full flex items-center justify-center border border-[var(--cream-300)] bg-white hover:border-[var(--orange-500)] transition-all"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded: categories + add-ons */}
      {expanded && (
        <div className="border-t border-[var(--cream-200)] p-4 space-y-5">
          <CategoriesSection pkg={pkg} onRefresh={onRefresh} />
          <AddonsSection pkg={pkg} onRefresh={onRefresh} />
          {pkg.ingredient_note && (
            <div className="p-3 rounded-[10px] bg-amber-50 border border-amber-200">
              <p className="text-[0.75rem] font-semibold text-amber-700 mb-1">Ingredient Note (sent 2h before)</p>
              <p className="text-[0.82rem] text-amber-800 whitespace-pre-wrap">{pkg.ingredient_note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CATEGORIES SECTION ───────────────────────────────────────────────────────
function CategoriesSection({ pkg, onRefresh }: { pkg: MealPackage; onRefresh: () => void }) {
  const [showCatForm, setShowCatForm] = useState(false);
  const [catName, setCatName] = useState("");
  const [catMin, setCatMin] = useState("1");
  const [catMax, setCatMax] = useState("1");
  const [catRequired, setCatRequired] = useState(true);
  const [savingCat, setSavingCat] = useState(false);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const handleAddCategory = async () => {
    if (!catName.trim()) { toast.error("Category name required."); return; }
    try {
      setSavingCat(true);
      await mealPackagesApi.addCategory(pkg.id, {
        name: catName.trim(),
        min_selections: Number(catMin),
        max_selections: Number(catMax),
        is_required: catRequired,
      });
      toast.success("Category added!");
      setCatName(""); setCatMin("1"); setCatMax("1"); setCatRequired(true);
      setShowCatForm(false);
      onRefresh();
    } catch {
      toast.error("Could not add category.");
    } finally {
      setSavingCat(false);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!confirm("Delete this category and all its dishes?")) return;
    try {
      await mealPackagesApi.deleteCategory(pkg.id, catId);
      toast.success("Category deleted.");
      onRefresh();
    } catch {
      toast.error("Could not delete category.");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[0.85rem] font-bold text-[var(--text-primary)] flex items-center gap-1.5">
          <Users className="w-4 h-4 text-[var(--orange-500)]" />
          Categories ({pkg.categories?.length ?? 0})
        </h4>
        <button onClick={() => setShowCatForm((v) => !v)} className={btnSecondary} style={{ padding: "4px 12px", fontSize: "0.78rem" }}>
          <Plus className="w-3.5 h-3.5" /> Add Category
        </button>
      </div>

      {showCatForm && (
        <div className="p-3.5 rounded-[12px] border border-[var(--cream-300)] bg-[var(--cream-50)] mb-3 space-y-3">
          <div>
            <label className={labelClass}>Category Name</label>
            <input type="text" value={catName} onChange={(e) => setCatName(e.target.value)}
              placeholder='e.g. "Pick 1 Dal"' className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Min Selections</label>
              <input type="number" min="0" value={catMin} onChange={(e) => setCatMin(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Max Selections</label>
              <input type="number" min="1" value={catMax} onChange={(e) => setCatMax(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id={`req-${pkg.id}`} checked={catRequired}
              onChange={(e) => setCatRequired(e.target.checked)}
              className="w-4 h-4 accent-[var(--orange-500)]" />
            <label htmlFor={`req-${pkg.id}`} className="text-[0.82rem] text-[var(--text-primary)]">
              Required (customer must select)
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddCategory} disabled={savingCat} className={btnPrimary}>
              {savingCat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {savingCat ? "Adding..." : "Add"}
            </button>
            <button onClick={() => setShowCatForm(false)} className={btnSecondary}>Cancel</button>
          </div>
        </div>
      )}

      {pkg.categories?.length === 0 && (
        <p className="text-[0.82rem] text-[var(--text-muted)] italic">
          No categories yet. Add one to let customers pick dishes.
        </p>
      )}

      <div className="space-y-2">
        {(pkg.categories ?? []).map((cat) => (
          <div key={cat.id} className="rounded-[12px] border border-[var(--cream-300)] overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-[var(--cream-50)]">
              <div>
                <span className="text-[0.85rem] font-semibold text-[var(--text-primary)]">{cat.name}</span>
                <span className="text-[0.75rem] text-[var(--text-muted)] ml-2">
                  Pick {cat.min_selections === cat.max_selections ? cat.min_selections : `${cat.min_selections}–${cat.max_selections}`}
                  {cat.is_required ? " · required" : " · optional"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setExpandedCat((id) => (id === cat.id ? null : cat.id))} className="text-[0.75rem] text-[var(--orange-500)] font-medium hover:underline">
                  {expandedCat === cat.id ? "Hide dishes" : `${cat.dishes?.length ?? 0} dish${(cat.dishes?.length ?? 0) !== 1 ? "es" : ""}`}
                </button>
                <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-400 hover:text-red-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {expandedCat === cat.id && (
              <DishesSection pkg={pkg} cat={cat} onRefresh={onRefresh} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DISHES SECTION ───────────────────────────────────────────────────────────
function DishesSection({
  pkg,
  cat,
  onRefresh,
}: {
  pkg: MealPackage;
  cat: PackageCategory;
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [dishName, setDishName] = useState("");
  const [dishType, setDishType] = useState<"veg" | "non_veg">("veg");
  const [dishDesc, setDishDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!dishName.trim()) { toast.error("Dish name required."); return; }
    try {
      setSaving(true);
      await mealPackagesApi.addDish(pkg.id, cat.id, {
        name: dishName.trim(),
        type: dishType,
        description: dishDesc.trim() || undefined,
      });
      toast.success("Dish added!");
      setDishName(""); setDishType("veg"); setDishDesc(""); setShowForm(false);
      onRefresh();
    } catch {
      toast.error("Could not add dish.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dishId: string) => {
    try {
      await mealPackagesApi.deleteDish(pkg.id, cat.id, dishId);
      toast.success("Dish removed.");
      onRefresh();
    } catch {
      toast.error("Could not remove dish.");
    }
  };

  return (
    <div className="p-3 border-t border-[var(--cream-200)] bg-white space-y-2">
      {(cat.dishes ?? []).map((dish) => (
        <div key={dish.id} className="flex items-center justify-between text-[0.82rem]">
          <div className="flex items-center gap-2">
            {dish.type === "veg" ? (
              <span className="w-3 h-3 rounded-sm border border-green-500 flex items-center justify-center shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              </span>
            ) : (
              <span className="w-3 h-3 rounded-sm border border-red-500 flex items-center justify-center shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              </span>
            )}
            <span className="text-[var(--text-primary)] font-medium">{dish.name}</span>
            {dish.description && <span className="text-[var(--text-muted)] truncate max-w-[200px]">— {dish.description}</span>}
          </div>
          <button onClick={() => handleDelete(dish.id)} className="text-red-400 hover:text-red-600 ml-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      {showForm ? (
        <div className="pt-2 space-y-2 border-t border-[var(--cream-200)]">
          <input type="text" value={dishName} onChange={(e) => setDishName(e.target.value)}
            placeholder="Dish name" className={cn(inputClass, "text-[0.82rem] py-2")} />
          <input type="text" value={dishDesc} onChange={(e) => setDishDesc(e.target.value)}
            placeholder="Description (optional)" className={cn(inputClass, "text-[0.82rem] py-2")} />
          <div className="flex gap-2">
            {[{ v: "veg" as const, l: "🟢 Veg" }, { v: "non_veg" as const, l: "🔴 Non-Veg" }].map((t) => (
              <button key={t.v} onClick={() => setDishType(t.v)}
                className={cn(
                  "flex-1 py-1.5 rounded-[8px] border text-[0.78rem] font-medium transition-all",
                  dishType === t.v ? "border-[var(--orange-500)] text-[var(--orange-500)]" : "border-[var(--cream-300)] text-[var(--text-muted)]"
                )}>{t.l}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving} className={cn(btnPrimary, "text-[0.78rem] py-1.5")}>
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Add
            </button>
            <button onClick={() => setShowForm(false)} className={cn(btnSecondary, "text-[0.78rem] py-1.5")}>Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1 text-[0.78rem] text-[var(--orange-500)] font-medium hover:underline">
          <Plus className="w-3.5 h-3.5" /> Add dish
        </button>
      )}
    </div>
  );
}

// ─── ADD-ONS SECTION ──────────────────────────────────────────────────────────
function AddonsSection({ pkg, onRefresh }: { pkg: MealPackage; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [type, setType] = useState<"veg" | "non_veg">("veg");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) { toast.error("Add-on name required."); return; }
    if (!price || Number(price) < 1) { toast.error("Price must be at least ₹1."); return; }
    try {
      setSaving(true);
      await mealPackagesApi.addAddon(pkg.id, { name: name.trim(), price: Number(price), type });
      toast.success("Add-on added!");
      setName(""); setPrice(""); setType("veg"); setShowForm(false);
      onRefresh();
    } catch {
      toast.error("Could not add add-on.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (addonId: string) => {
    try {
      await mealPackagesApi.deleteAddon(pkg.id, addonId);
      toast.success("Add-on removed.");
      onRefresh();
    } catch {
      toast.error("Could not remove add-on.");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[0.85rem] font-bold text-[var(--text-primary)] flex items-center gap-1.5">
          <Tag className="w-4 h-4 text-[var(--orange-500)]" />
          Add-ons ({pkg.addons?.length ?? 0})
        </h4>
        <button onClick={() => setShowForm((v) => !v)} className={btnSecondary} style={{ padding: "4px 12px", fontSize: "0.78rem" }}>
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {(pkg.addons ?? []).length === 0 && (
        <p className="text-[0.82rem] text-[var(--text-muted)] italic">
          No add-ons yet. E.g., "Extra Roti ₹20", "Papad & Pickle ₹30".
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-2">
        {(pkg.addons ?? []).map((addon) => (
          <div key={addon.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--cream-100)] border border-[var(--cream-300)] text-[0.8rem]">
            {addon.type === "veg" ? (
              <span className="w-2.5 h-2.5 rounded-sm border border-green-500 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              </span>
            ) : (
              <span className="w-2.5 h-2.5 rounded-sm border border-red-500 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              </span>
            )}
            <span className="font-medium text-[var(--text-primary)]">{addon.name}</span>
            <span className="text-[var(--text-muted)]">₹{addon.price}</span>
            <button onClick={() => handleDelete(addon.id)} className="text-red-400 hover:text-red-600 ml-0.5">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="p-3.5 rounded-[12px] border border-[var(--cream-300)] bg-[var(--cream-50)] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Extra Roti" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Price (₹)</label>
              <input type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)}
                placeholder="20" className={inputClass} />
            </div>
          </div>
          <div className="flex gap-2">
            {[{ v: "veg" as const, l: "🟢 Veg" }, { v: "non_veg" as const, l: "🔴 Non-Veg" }].map((t) => (
              <button key={t.v} onClick={() => setType(t.v)}
                className={cn(
                  "flex-1 py-2 rounded-[8px] border text-[0.82rem] font-medium transition-all",
                  type === t.v ? "border-[var(--orange-500)] text-[var(--orange-500)]" : "border-[var(--cream-300)] text-[var(--text-muted)]"
                )}>{t.l}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving} className={btnPrimary}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? "Adding..." : "Add"}
            </button>
            <button onClick={() => setShowForm(false)} className={btnSecondary}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
