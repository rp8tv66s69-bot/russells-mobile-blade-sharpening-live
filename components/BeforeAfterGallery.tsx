"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { GalleryPhoto } from "@/lib/types";

export default function BeforeAfterGallery() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);

  useEffect(() => onSnapshot(
    query(collection(db, "gallery"), orderBy("createdAt", "desc")),
    (snapshot) => setPhotos(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as GalleryPhoto))),
    (error) => console.error("Gallery photos could not be loaded:", error)
  ), []);

  const visiblePhotos = photos.slice(0, 6);

  return (
    <section className="section page-width" id="gallery">
      <div className="section-heading gallery-heading">
        <div><p className="eyebrow">See the difference</p><h2>Before &amp; after sharpening</h2></div>
        <p className="section-lead">A clean, balanced edge helps your mower cut grass instead of tearing it. {photos.length ? "Here are real sharpening results from Russell's mobile service." : "Real customer transformations will be featured here."}</p>
      </div>

      <div className="gallery-results">
        {visiblePhotos.length ? visiblePhotos.map((photo) => (
          <article className="gallery-result" key={photo.id}>
            <div className="comparison-card">
              <figure className="comparison-photo"><div className="photo-label before-label">Before</div><img src={photo.beforeImage} alt={`Blade before sharpening${photo.caption ? `: ${photo.caption}` : ""}`} className="gallery-image" /></figure>
              <div className="comparison-arrow" aria-hidden="true">→</div>
              <figure className="comparison-photo"><div className="photo-label after-label">After</div><img src={photo.afterImage} alt={`Blade after sharpening${photo.caption ? `: ${photo.caption}` : ""}`} className="gallery-image" /></figure>
            </div>
            {photo.caption && <p className="gallery-caption">{photo.caption}</p>}
          </article>
        )) : (
          <div className="comparison-card">
            <figure className="comparison-photo"><div className="photo-label before-label">Before</div><img src="/gallery-before-placeholder.svg" alt="Placeholder for a dull mower blade before sharpening" className="gallery-image" /><figcaption>Dull, rounded cutting edge</figcaption></figure>
            <div className="comparison-arrow" aria-hidden="true">→</div>
            <figure className="comparison-photo"><div className="photo-label after-label">After</div><img src="/gallery-after-placeholder.svg" alt="Placeholder for a mower blade after professional sharpening" className="gallery-image" /><figcaption>Sharp, clean and ready for a better cut</figcaption></figure>
          </div>
        )}
      </div>
      <div className="gallery-promise"><strong>Every service includes precision sharpening and balancing.</strong><span>Your blades are returned ready for a cleaner, healthier-looking lawn.</span></div>
    </section>
  );
}
