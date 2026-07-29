export function ScoreRing({ score }: { score: number }) {
  return <div className="score-ring" style={{ background: `conic-gradient(var(--primary) ${score * 3.6}deg, #e8edf3 0deg)` }} aria-label={`${score}% mock match score`}><div><strong>{score}%</strong><span>Match</span></div></div>;
}
