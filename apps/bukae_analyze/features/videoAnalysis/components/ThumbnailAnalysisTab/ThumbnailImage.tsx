export function ThumbnailImage({ imageUrl }: { imageUrl: string }) {
  return (
    <div className="shrink-0 aspect-[9/16] rounded-xl overflow-hidden bg-black/5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="썸네일" className="w-full h-full object-cover" />
    </div>
  )
}
