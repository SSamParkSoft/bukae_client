export function CinematicBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[-2] overflow-hidden" aria-hidden>
      <video
        className="h-full w-full object-cover opacity-30 brightness-[0.87]"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        disableRemotePlayback
      >
        <source src="/cinematic_background.webm" type="video/webm" />
        <source src="/cinematic_background.mp4" type="video/mp4; codecs=hvc1" />
      </video>
    </div>
  )
}
