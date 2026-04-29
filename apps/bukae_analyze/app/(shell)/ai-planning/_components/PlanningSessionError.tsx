export function PlanningSessionError({ message }: { message: string }) {
  return (
    <div className="mx-6 rounded-2xl border border-red-400/25 bg-red-500/10 px-6 py-5 text-red-100">
      <p className="font-fluid-20-md">질문을 불러오지 못했습니다</p>
      <p className="mt-2 font-fluid-16-rg text-red-100/80">{message}</p>
    </div>
  )
}
