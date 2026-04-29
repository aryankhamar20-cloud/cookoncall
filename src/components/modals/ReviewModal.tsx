"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  chefName: string;
  onSubmitReview: (bookingId: string, rating: number, comment: string) => void;
  /** Bug 6 — pass an existing review to pre-fill the form (edit mode). */
  existingReview?: { rating: number; comment: string } | null;
}

const ratingLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent!"];

export default function ReviewModal({
  isOpen,
  onClose,
  bookingId,
  chefName,
  onSubmitReview,
  existingReview,
}: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isEditMode = !!existingReview && (existingReview.rating > 0 || existingReview.comment.length > 0);

  // Sync form with existingReview when modal opens.
  useEffect(() => {
    if (isOpen) {
      if (existingReview && (existingReview.rating > 0 || existingReview.comment.length > 0)) {
        setRating(existingReview.rating || 0);
        setComment(existingReview.comment || "");
      } else {
        setRating(0);
        setComment("");
      }
      setHoverRating(0);
    }
  }, [isOpen, existingReview]);

  const displayRating = hoverRating || rating;

  async function handleSubmit() {
    if (!rating) {
      toast.error("Please select a star rating.");
      return;
    }
    setSubmitting(true);
    try {
      onSubmitReview(bookingId, rating, comment);
      // Parent handles toast on success; we don't double-toast here.
      // Reset only in create mode — in edit mode the parent closes the modal anyway.
      if (!isEditMode) {
        setRating(0);
        setComment("");
      }
    } catch {
      toast.error("Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? "Edit Your Review" : "Rate Your Experience"}
      maxWidth="max-w-[420px]"
    >
      {/* Chef name */}
      <div className="text-center mb-5">
        <div className="text-[0.9rem] text-[var(--text-muted)] mb-2">
          {isEditMode ? "Update your review for" : "How was your experience with"}
        </div>
        <div className="font-bold text-[1.1rem]">{chefName}</div>
      </div>

      {/* Stars */}
      <div className="flex justify-center gap-2 mb-5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className={cn(
              "text-[2rem] bg-transparent border-none cursor-pointer transition-colors duration-150",
              star <= displayRating ? "text-[#F5A623]" : "text-[var(--cream-300)]"
            )}
          >
            ★
          </button>
        ))}
      </div>

      {/* Rating label */}
      <div className="text-center text-[0.85rem] text-[var(--text-muted)] mb-4">
        {displayRating ? ratingLabels[displayRating] : "Tap a star to rate"}
      </div>

      {/* Review text */}
      <div className="mb-5">
        <label className="block font-semibold text-[0.88rem] mb-2">
          Write a review (optional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Tell us about your experience..."
          className="w-full px-4 py-3 border-[1.5px] border-[var(--cream-300)] rounded-[12px] text-[0.95rem] bg-white outline-none focus:border-[var(--orange-500)] resize-y"
          style={{ fontFamily: "var(--font-body)" }}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || !rating}
        className="w-full py-4 border-none rounded-[12px] bg-[var(--orange-500)] text-white font-bold text-base cursor-pointer transition-all hover:bg-[var(--orange-400)] disabled:opacity-60"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {submitting
          ? (isEditMode ? "Updating..." : "Submitting...")
          : (isEditMode ? "Update Review" : "Submit Review")}
      </button>
    </Modal>
  );
}
