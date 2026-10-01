'use client';

export default function Error({ reset }) {
  return (
    <section>
      <h2 className="rh d">Something went wrong</h2>
      <p className="none">Give it a moment and try again.</p>
      <button className="btn g more" onClick={reset}>Try again</button>
    </section>
  );
}
