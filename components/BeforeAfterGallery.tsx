"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { GalleryPhoto } from "@/lib/types";

export default function BeforeAfterGallery() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [galleryError, setGalleryError] = useState(false);
  const [expandedPhoto, setExpandedPhoto] = useState<{
    src: string;
    alt: string;
    label: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    async function loadPhotos(attempt = 0) {
      try {
        const snapshot = await getDocs(
          query(collection(db, "gallery"), orderBy("createdAt", "desc"), limit(6))
        );

        if (cancelled) return;

        setPhotos(snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        } as GalleryPhoto)));
        setGalleryError(false);
        setLoadingPhotos(false);
      } catch (error) {
        console.error("Gallery photos could not be loaded:", error);
        if (cancelled) return;

        if (attempt < 2) {
          retryTimer = setTimeout(() => loadPhotos(attempt + 1), 800 * (attempt + 1));
        } else {
          setGalleryError(true);
          setLoadingPhotos(false);
        }
      }
    }

    loadPhotos();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  useEffect(() => {
    if (!expandedPhoto) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpandedPhoto(null);
    };

    document.addEventListener("keydown", closeOnEscape);
    document.body.classList.add("gallery-lightbox-open");

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.classList.remove("gallery-lightbox-open");
    };
  }, [expandedPhoto]);

  const visiblePhotos = photos.slice(0, 6);

  return (
    <section className="section page-width" id="gallery">
      <div className="section-heading gallery-heading">
        <div><p className="eyebrow">See the difference</p><h2>Before &amp; after sharpening</h2></div>
        <p className="section-lead">A clean, balanced edge helps your mower cut grass instead of tearing it. {photos.length ? "Here are real sharpening results from Russell's mobile service." : "Real customer transformations will be featured here."}</p>
      </div>

      <div className="gallery-results">
        {loadingPhotos ? (
          <div className="gallery-loading" role="status">Loading before-and-after photos…</div>
        ) : visiblePhotos.length ? visiblePhotos.map((photo) => (
          <article className="gallery-result" key={photo.id}>
            <div className="comparison-card">
              <figure className="comparison-photo">
                <button
                  type="button"
                  className="gallery-zoom-button"
                  aria-label="Enlarge before photo"
                  onClick={() => setExpandedPhoto({
                    src: photo.beforeImage,
                    alt: `Blade before sharpening${photo.caption ? `: ${photo.caption}` : ""}`,
                    label: "Before",
                  })}
                >
                  <div className="photo-label before-label">Before</div>
                  <span className="gallery-zoom-hint" aria-hidden="true">Tap to enlarge</span>
                  <img
                    src={photo.beforeImage}
                    alt={`Blade before sharpening${photo.caption ? `: ${photo.caption}` : ""}`}
                    className="gallery-image"
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              </figure>
              <div className="comparison-arrow" aria-hidden="true">→</div>
              <figure className="comparison-photo">
                <button
                  type="button"
                  className="gallery-zoom-button"
                  aria-label="Enlarge after photo"
                  onClick={() => setExpandedPhoto({
                    src: photo.afterImage,
                    alt: `Blade after sharpening${photo.caption ? `: ${photo.caption}` : ""}`,
                    label: "After",
                  })}
                >
                  <div className="photo-label after-label">After</div>
                  <span className="gallery-zoom-hint" aria-hidden="true">Tap to enlarge</span>
                  <img
                    src={photo.afterImage}
                    alt={`Blade after sharpening${photo.caption ? `: ${photo.caption}` : ""}`}
                    className="gallery-image"
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              </figure>
            </div>
            {photo.caption && <p className="gallery-caption">{photo.caption}</p>}
          </article>
        )) : (
          <>
            {galleryError && <p className="gallery-load-error">Photos could not load. Please refresh the page to try again.</p>}
            <div className="comparison-card">
              <figure className="comparison-photo"><div className="photo-label before-label">Before</div><img src="/gallery-before-placeholder.svg" alt="Placeholder for a dull mower blade before sharpening" className="gallery-image" /><figcaption>Dull, rounded cutting edge</figcaption></figure>
              <div className="comparison-arrow" aria-hidden="true">→</div>
              <figure className="comparison-photo"><div className="photo-label after-label">After</div><img src="/gallery-after-placeholder.svg" alt="Placeholder for a mower blade after professional sharpening" className="gallery-image" /><figcaption>Sharp, clean and ready for a better cut</figcaption></figure>
            </div>
          </>
        )}
      </div>
      <div className="gallery-promise"><strong>Every service includes precision sharpening and balancing.</strong></div>

      {expandedPhoto && (
        <div
          className="gallery-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${expandedPhoto.label} photo enlarged`}
          onClick={() => setExpandedPhoto(null)}
        >
          <div className="gallery-lightbox-content" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="gallery-lightbox-close"
              aria-label="Close enlarged photo"
              onClick={() => setExpandedPhoto(null)}
            >
              ×
            </button>
            <span className={`photo-label ${expandedPhoto.label === "Before" ? "before-label" : "after-label"}`}>
              {expandedPhoto.label}
            </span>
            <img src={expandedPhoto.src} alt={expandedPhoto.alt} />
          </div>
        </div>
      )}
    </section>
  );
}
