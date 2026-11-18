/** A timeline in short form: just the years, in order. Read-only. */
export function YearChips({ years }: { years: number[] }) {
  return (
    <div className="app-year-chips">
      {years.map((year, index) => (
        <span key={index} className="jm-year-chip">
          {year}
        </span>
      ))}
    </div>
  )
}
