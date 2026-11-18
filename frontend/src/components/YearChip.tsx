/** A timeline in short form: just the years, in order. Read-only. */
export function YearChips({ years }: { years: number[] }) {
  return (
    <div className="app-year-chips">
      {years.map((year) => (
        <span key={year} className="jm-year-chip">
          {year}
        </span>
      ))}
    </div>
  )
}
